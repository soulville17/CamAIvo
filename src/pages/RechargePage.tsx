import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  CreditCard,
  Gift,
  Smartphone,
  Undo2,
} from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PACKS, type PackId } from "@/features/payments/packs";
import {
  PAYMENT_PROVIDERS,
  fetchPointTransactions,
  type ProviderId,
} from "@/features/payments/paymentsApi";
import { minutesForPoints } from "@/features/credits/constants";
import { formatPoints } from "@/lib/format";
import { useAuthStore } from "@/features/auth/authStore";
import type { PointTransaction, TransactionType } from "@/types/db";
import { cn } from "@/lib/cn";

const TX_META: Record<
  TransactionType,
  { label: string; icon: typeof Coins; className: string }
> = {
  purchase: { label: "Achat de points", icon: ArrowUpCircle, className: "text-live" },
  consumption: {
    label: "Session de swap",
    icon: ArrowDownCircle,
    className: "text-ember-light",
  },
  bonus: { label: "Bonus de bienvenue", icon: Gift, className: "text-token" },
  refund: { label: "Remboursement", icon: Undo2, className: "text-cloud" },
};

/** RECHARGE — packs de points, choix du moyen de paiement, historique. */
export function RechargePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [provider, setProvider] = useState<ProviderId>("stripe");
  const [busyPack, setBusyPack] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancel" | null>(
    null,
  );
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Retour de Stripe : ?checkout=success|cancel
  useEffect(() => {
    const result = searchParams.get("checkout");
    if (result === "success" || result === "cancel") {
      setCheckoutResult(result);
      setSearchParams({}, { replace: true });
      if (result === "success") {
        // Le webhook peut mettre 1-2 s : on rafraîchit tout de suite puis après délai
        void refreshProfile();
        window.setTimeout(() => void refreshProfile(), 2500);
      }
    }
  }, [searchParams, setSearchParams, refreshProfile]);

  useEffect(() => {
    let cancelled = false;
    void fetchPointTransactions().then(({ transactions }) => {
      if (cancelled) return;
      setTransactions(transactions);
      setHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checkoutResult]);

  async function handleBuy(packId: PackId) {
    const adapter = PAYMENT_PROVIDERS.find((p) => p.id === provider);
    if (!adapter) return;
    setError(null);
    setBusyPack(packId);
    const { url, error: checkoutError } = await adapter.createCheckout(packId);
    setBusyPack(null);
    if (checkoutError || !url) {
      setError(checkoutError);
      return;
    }
    window.location.assign(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading
        title="Recharge"
        subtitle="Achète des points pour continuer à swapper"
      />

      {checkoutResult === "success" && (
        <Alert variant="success" className="mb-4">
          Paiement confirmé ! Tes points sont crédités (le solde se met à jour en
          quelques secondes).
        </Alert>
      )}
      {checkoutResult === "cancel" && (
        <Alert variant="error" className="mb-4">
          Paiement annulé — aucun montant n&rsquo;a été débité.
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Packs */}
      <div className="grid gap-4 md:grid-cols-3">
        {PACKS.map((pack) => (
          <GlassPanel
            key={pack.id}
            className={cn(
              "relative flex flex-col gap-3",
              pack.highlight && "border-ember/40 shadow-emberSoft",
            )}
          >
            {pack.highlight && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <Badge variant="plan">Populaire</Badge>
              </span>
            )}
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-token" aria-hidden />
              <span className="font-display text-lg font-bold text-snow">
                {pack.label}
              </span>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-token">
                {formatPoints(pack.points)} <span className="text-base">pts</span>
              </p>
              <p className="text-xs text-muted">
                ≈ {minutesForPoints(pack.points)} min de swap · {pack.description}
              </p>
            </div>
            <div className="mt-auto">
              <p className="text-xl font-bold text-snow">
                {pack.priceEur.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </p>
              <p className="text-xs text-muted">
                ≈ {pack.priceXof.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <Button
              variant={pack.highlight ? "primary" : "ghost"}
              className="w-full"
              loading={busyPack === pack.id}
              disabled={busyPack !== null}
              onClick={() => void handleBuy(pack.id)}
            >
              Choisir ce pack
            </Button>
          </GlassPanel>
        ))}
      </div>

      {/* Moyen de paiement */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
          Moyen de paiement
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => p.available && setProvider(p.id)}
              disabled={!p.available}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                provider === p.id && p.available
                  ? "border-ember/60 bg-ember/10"
                  : "border-glass-border bg-white/[0.03] hover:border-white/25",
                !p.available && "cursor-not-allowed opacity-60",
              )}
            >
              {p.id === "stripe" ? (
                <CreditCard className="h-5 w-5 shrink-0 text-cloud" aria-hidden />
              ) : (
                <Smartphone className="h-5 w-5 shrink-0 text-token" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-snow">
                  {p.label}
                  {!p.available && <Badge variant="neutral">Bientôt</Badge>}
                </span>
                <span className="block truncate text-xs text-muted">{p.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Historique */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
          Historique
        </h2>
        <GlassPanel padded={false}>
          {historyLoading ? (
            <p className="p-4 text-sm text-muted">Chargement…</p>
          ) : transactions.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              Aucun mouvement pour l&rsquo;instant.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {transactions.map((tx) => {
                const meta = TX_META[tx.type];
                const Icon = meta.icon;
                return (
                  <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className={cn("h-4 w-4 shrink-0", meta.className)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-snow">{meta.label}</p>
                      <p className="text-xs text-muted">
                        {new Date(tx.created_at).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          tx.amount >= 0 ? "text-live" : "text-ember-light",
                        )}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {formatPoints(tx.amount)} pts
                      </p>
                      <p className="text-[11px] tabular-nums text-muted">
                        solde : {formatPoints(tx.balance_after)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanel>
      </section>
    </motion.div>
  );
}
