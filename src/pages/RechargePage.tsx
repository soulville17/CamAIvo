import { motion } from "framer-motion";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

/** RECHARGE — packs de points, Stripe + Mobile Money (Phase 5). */
export function RechargePage() {
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
      <GlassPanel>
        <p className="text-sm text-muted">
          Packs de points (EUR / XOF), paiement carte et Mobile Money arrivent en
          Phase 5.
        </p>
      </GlassPanel>
    </motion.div>
  );
}
