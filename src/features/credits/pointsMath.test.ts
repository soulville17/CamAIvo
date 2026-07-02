import { describe, expect, it } from "vitest";
import { computeTrancheCharge, MAX_TRANCHE_SECONDS } from "@/features/credits/pointsMath";

describe("computeTrancheCharge — miroir de consume_session_points", () => {
  it("facture 3,33 pts pour une tranche de 10 s à 20 pts/min", () => {
    const r = computeTrancheCharge(10, 500);
    expect(r.charge).toBe(3.33);
    expect(r.newBalance).toBe(496.67);
    expect(r.depleted).toBe(false);
  });

  it("borne la tranche à 30 s (heartbeats perdus → pas de sur-facturation)", () => {
    const r = computeTrancheCharge(300, 500);
    expect(r.billedSeconds).toBe(MAX_TRANCHE_SECONDS);
    expect(r.charge).toBe(10);
  });

  it("ne facture rien pour un temps nul ou négatif", () => {
    expect(computeTrancheCharge(0, 500).charge).toBe(0);
    expect(computeTrancheCharge(-5, 500).charge).toBe(0);
  });

  it("écrête au solde restant et signale l'épuisement", () => {
    const r = computeTrancheCharge(10, 2);
    expect(r.charge).toBe(2);
    expect(r.newBalance).toBe(0);
    expect(r.depleted).toBe(true);
  });

  it("signale l'épuisement quand le solde tombe exactement à 0", () => {
    const r = computeTrancheCharge(30, 10);
    expect(r.charge).toBe(10);
    expect(r.newBalance).toBe(0);
    expect(r.depleted).toBe(true);
  });

  it("vide un solde de 500 pts en 25 minutes de heartbeats de 10 s", () => {
    let balance = 500;
    let ticks = 0;
    while (balance > 0 && ticks < 10_000) {
      const r = computeTrancheCharge(10, balance);
      balance = r.newBalance;
      ticks += 1;
      if (r.depleted) break;
    }
    // 25 min × 6 ticks/min = 150 ticks à 3,33 pts = 499,50 pts :
    // le résidu de 0,50 pt (arrondi) est facturé au 151e tick.
    expect(ticks).toBe(151);
    expect(balance).toBe(0);
  });
});
