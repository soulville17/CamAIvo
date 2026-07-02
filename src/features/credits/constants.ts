/**
 * Barème du système de points (§7).
 * Doit rester aligné avec la constante POINTS_PAR_MINUTE de l'Edge Function
 * consume-points (Phase 3) — le serveur reste la source de vérité.
 */
export const POINTS_PAR_MINUTE = 20;

/** Intervalle des heartbeats de session (secondes). */
export const HEARTBEAT_INTERVAL_S = 10;

/** Estimation client des points consommés pour une durée donnée (affichage). */
export function estimatePointsUsed(elapsedSeconds: number): number {
  return (elapsedSeconds / 60) * POINTS_PAR_MINUTE;
}

/** Minutes de swap restantes pour un solde donné. */
export function minutesForPoints(points: number): number {
  return Math.floor(points / POINTS_PAR_MINUTE);
}
