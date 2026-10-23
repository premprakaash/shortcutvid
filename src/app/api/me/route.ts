import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getAvailableCredits } from "@/lib/credits/ledger";
import { prisma } from "@/lib/db";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionTier: true,
      monthlyVideoCredits: true,
      creditsUsed: true,
    },
  });

  return NextResponse.json({
    user: dbUser,
    credits: {
      total: dbUser.monthlyVideoCredits,
      used: dbUser.creditsUsed,
      available: getAvailableCredits(dbUser),
    },
  });
}
