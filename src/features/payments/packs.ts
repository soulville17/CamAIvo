/**
 * Packs de points affichés sur /recharge.
 * ⚠ Miroir d'affichage : le barème FACTURÉ est défini côté serveur dans
 * l'Edge Function create-checkout (le client n'envoie qu'un packId).
 */

/** Taux de conversion affiché (parité fixe FCFA/EUR). */
export const EUR_TO_XOF = 655.957;

export type PackId = "decouverte" | "createur" | "pro";

export interface PointsPack {
  id: PackId;
  label: string;
  points: number;
  priceEur: number;
  /** Prix indicatif en FCFA (arrondi aux 5 près) */
  priceXof: number;
  highlight?: boolean;
  description: string;
}

function toXof(eur: number): number {
  return Math.round((eur * EUR_TO_XOF) / 5) * 5;
}

export const PACKS: PointsPack[] = [
  {
    id: "decouverte",
    label: "Découverte",
    points: 500,
    priceEur: 4.99,
    priceXof: toXof(4.99),
    description: "Pour découvrir le live swap",
  },
  {
    id: "createur",
    label: "Créateur",
    points: 2000,
    priceEur: 14.99,
    priceXof: toXof(14.99),
    highlight: true,
    description: "Le bon rythme pour streamer chaque semaine",
  },
  {
    id: "pro",
    label: "Pro",
    points: 5000,
    priceEur: 29.99,
    priceXof: toXof(29.99),
    description: "Pour les créateurs intensifs",
  },
];
