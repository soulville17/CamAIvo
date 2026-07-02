import { POINTS_PAR_MINUTE } from "@/features/credits/constants";

/**
 * Miroir EXACT de la logique de débit de la fonction SQL
 * consume_session_points (supabase/migrations/0004). Sert aux tests et à
 * l'estimation optimiste côté client — le serveur reste la référence.
 */

/** Tranche maximale facturable entre deux heartbeats (secondes). */
export const MAX_TRANCHE_SECONDS = 30;

export interface ChargeResult {
  /** Points facturés pour la tranche */
  charge: number;
  /** Nouveau solde après débit */
  newBalance: number;
  /** true si le solde est épuisé → la session doit se couper */
  depleted: boolean;
  /** Secondes réellement comptées (bornées) */
  billedSeconds: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Calcule le débit d'une tranche de session (bornée à 30 s). */
export function computeTrancheCharge(
  elapsedSeconds: number,
  balance: number,
  pointsPerMinute: number = POINTS_PAR_MINUTE,
): ChargeResult {
  const billedSeconds = Math.min(Math.max(elapsedSeconds, 0), MAX_TRANCHE_SECONDS);
  let charge = round2((billedSeconds / 60) * pointsPerMinute);
  let depleted = false;

  if (charge >= balance) {
    charge = balance;
    depleted = true;
  }
  const newBalance = round2(balance - charge);
  if (newBalance <= 0) depleted = true;

  return { charge, newBalance, depleted, billedSeconds };
}
