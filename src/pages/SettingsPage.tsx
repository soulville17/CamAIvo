import { motion } from "framer-motion";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

/** PARAMÈTRES — profil, préférences swap, sécurité, usage responsable (Phase 6). */
export function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading title="Paramètres" subtitle="Profil, préférences et sécurité" />
      <div className="space-y-4">
        <GlassPanel>
          <p className="text-sm text-muted">
            Profil, sélection de webcam, options du moteur et sécurité arrivent en
            Phase 6.
          </p>
        </GlassPanel>
        <GlassPanel>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-snow">
            Usage responsable
          </h2>
          <p className="text-sm text-muted">
            N&rsquo;utilise que des avatars dont tu détiens les droits. Toute
            usurpation d&rsquo;identité de personnes réelles sans consentement est
            interdite. Une option de filigrane sur la sortie sera disponible ici.
          </p>
        </GlassPanel>
      </div>
    </motion.div>
  );
}
