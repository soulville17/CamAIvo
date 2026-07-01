import { motion } from "framer-motion";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

/** MES AVATARS — CRUD complet en Phase 4. */
export function AvatarsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading
        title="Mes avatars"
        subtitle="Gère les visages utilisés pour le swap"
      />
      <GlassPanel>
        <p className="text-sm text-muted">
          Upload, avatars publics et sélection arrivent en Phase 4.
        </p>
      </GlassPanel>
    </motion.div>
  );
}
