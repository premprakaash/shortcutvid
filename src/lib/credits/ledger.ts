import { CreditTransactionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient video credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export function getAvailableCredits(user: {
  monthlyVideoCredits: number;
  creditsUsed: number;
}): number {
  return Math.max(0, user.monthlyVideoCredits - user.creditsUsed);
}

export async function reserveCredits(
  userId: string,
  projectId: string,
  amount: number,
  idempotencyKey: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return;

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const available = getAvailableCredits(user);
    if (available < amount) {
      throw new InsufficientCreditsError();
    }

    await tx.user.update({
      where: { id: userId },
      data: { creditsUsed: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        projectId,
        amount: -amount,
        transactionType: CreditTransactionType.RESERVE,
        idempotencyKey,
        description: "Video generation reservation",
      },
    });
  });
}

export async function finalizeCreditCharge(
  userId: string,
  projectId: string,
  idempotencyKey: string,
): Promise<void> {
  const chargeKey = `${idempotencyKey}:charge`;
  await prisma.$transaction(async (tx) => {
    if (await tx.creditTransaction.findUnique({ where: { idempotencyKey: chargeKey } })) {
      return;
    }
    await tx.creditTransaction.create({
      data: {
        userId,
        projectId,
        amount: 0,
        transactionType: CreditTransactionType.CHARGE,
        idempotencyKey: chargeKey,
        description: "Finalize reserved credits",
      },
    });
  });
}

export async function refundCredits(
  userId: string,
  projectId: string,
  amount: number,
  idempotencyKey: string,
): Promise<void> {
  const refundKey = `${idempotencyKey}:refund`;
  await prisma.$transaction(async (tx) => {
    if (await tx.creditTransaction.findUnique({ where: { idempotencyKey: refundKey } })) {
      return;
    }
    await tx.user.update({
      where: { id: userId },
      data: { creditsUsed: { decrement: amount } },
    });
    await tx.creditTransaction.create({
      data: {
        userId,
        projectId,
        amount,
        transactionType: CreditTransactionType.REFUND,
        idempotencyKey: refundKey,
        description: "Refund failed generation",
      },
    });
  });
}

export async function getCreditHistory(userId: string, limit = 20) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export type CreditTxClient = Prisma.TransactionClient;
