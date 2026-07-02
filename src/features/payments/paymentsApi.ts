import { supabase } from "@/lib/supabase";
import type { PackId } from "@/features/payments/packs";
import type { Payment, PointTransaction } from "@/types/db";

export type ProviderId = "stripe" | "mobile_money";

/**
 * Adaptateur générique de prestataire de paiement.
 * Stripe est complet ; le Mobile Money (Orange Money, Wave, MTN via un
 * agrégateur type CinetPay/PayDunya) partage le même contrat et s'activera
 * quand les clés marchandes seront configurées côté serveur.
 */
export interface PaymentProviderAdapter {
  id: ProviderId;
  label: string;
  detail: string;
  /** false = affiché mais marqué « bientôt » */
  available: boolean;
  createCheckout(packId: PackId): Promise<{ url: string | null; error: string | null }>;
}

async function invokeCreateCheckout(
  packId: PackId,
  provider: ProviderId,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { packId, provider, origin: window.location.origin },
  });
  if (error || !data?.url) {
    const message =
      (data as { message?: string } | null)?.message ??
      "Impossible de démarrer le paiement. Réessaie plus tard.";
    return { url: null, error: message };
  }
  return { url: data.url as string, error: null };
}

export const stripeProvider: PaymentProviderAdapter = {
  id: "stripe",
  label: "Carte bancaire",
  detail: "Visa, Mastercard — via Stripe",
  available: true,
  createCheckout: (packId) => invokeCreateCheckout(packId, "stripe"),
};

export const mobileMoneyProvider: PaymentProviderAdapter = {
  id: "mobile_money",
  label: "Mobile Money",
  detail: "Orange Money, Wave, MTN MoMo",
  available: false, // TODO : activer quand l'agrégateur sera branché (create-checkout)
  createCheckout: (packId) => invokeCreateCheckout(packId, "mobile_money"),
};

export const PAYMENT_PROVIDERS: PaymentProviderAdapter[] = [
  stripeProvider,
  mobileMoneyProvider,
];

/** Historique des mouvements de points (achats, consommation, bonus). */
export async function fetchPointTransactions(
  limit = 15,
): Promise<{ transactions: PointTransaction[]; error: string | null }> {
  const { data, error } = await supabase
    .from("point_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return { transactions: [], error: "Impossible de charger l'historique." };
  }
  return { transactions: (data ?? []) as PointTransaction[], error: null };
}

/** Paiements récents (pour afficher les en-attente / échoués). */
export async function fetchPayments(
  limit = 10,
): Promise<{ payments: Payment[]; error: string | null }> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return { payments: [], error: "Impossible de charger les paiements." };
  }
  return { payments: (data ?? []) as Payment[], error: null };
}
