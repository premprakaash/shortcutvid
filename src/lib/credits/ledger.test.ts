import { describe, expect, it } from "vitest";
import { getAvailableCredits } from "@/lib/credits/ledger";

describe("getAvailableCredits", () => {
  it("returns non-negative balance", () => {
    expect(getAvailableCredits({ monthlyVideoCredits: 3, creditsUsed: 1 })).toBe(2);
    expect(getAvailableCredits({ monthlyVideoCredits: 3, creditsUsed: 10 })).toBe(0);
  });
});
