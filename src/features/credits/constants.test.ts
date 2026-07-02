import { describe, expect, it } from "vitest";
import {
  estimatePointsUsed,
  minutesForPoints,
  POINTS_PAR_MINUTE,
} from "@/features/credits/constants";
import { formatDuration } from "@/lib/format";

describe("barème de points", () => {
  it("500 points = 25 minutes avec le barème par défaut", () => {
    expect(POINTS_PAR_MINUTE).toBe(20);
    expect(minutesForPoints(500)).toBe(25);
  });

  it("estime les points consommés par tranche de 10 s", () => {
    // 10 s → 20/6 ≈ 3.33 pts
    expect(estimatePointsUsed(10)).toBeCloseTo(3.333, 2);
    expect(estimatePointsUsed(60)).toBe(20);
    expect(estimatePointsUsed(0)).toBe(0);
  });

  it("arrondit les minutes restantes vers le bas", () => {
    expect(minutesForPoints(19)).toBe(0);
    expect(minutesForPoints(39)).toBe(1);
  });
});

describe("formatDuration", () => {
  it("formate en M:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(83)).toBe("1:23");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("ignore les valeurs négatives", () => {
    expect(formatDuration(-5)).toBe("0:00");
  });
});
