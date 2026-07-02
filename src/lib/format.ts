/** Formate une durée en "M:SS" (ex. 83 → "1:23"). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Formate un nombre de points pour l'affichage (arrondi, séparateurs fr). */
export function formatPoints(points: number): string {
  return Math.round(points).toLocaleString("fr-FR");
}
