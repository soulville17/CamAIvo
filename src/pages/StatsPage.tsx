import { motion } from "framer-motion";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

/** STATISTIQUES — KPI + graphique en Phase 6. */
export function StatsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading
        title="Statistiques"
        subtitle="Ton activité de swap en un coup d'œil"
      />
      <GlassPanel>
        <p className="text-sm text-muted">
          KPI (temps de swap, points consommés, sessions) et graphique arrivent en
          Phase 6.
        </p>
      </GlassPanel>
    </motion.div>
  );
}
