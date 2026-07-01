import { motion } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/**
 * LIVE SWAP — écran principal.
 * Phase 0 : coquille visuelle (panneaux caméra factices).
 * Phase 2 : webcam réelle + MockSwapEngine + sélection d'avatar.
 */
export function DashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading
        title="Live Swap"
        subtitle="Change d'apparence en live avec CamAIvo"
      />

      {/* Deux panneaux caméra — empilés sur mobile, côte à côte sur desktop */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Caméra réelle
            </h2>
            <Badge variant="live" pulse>
              Live
            </Badge>
          </div>
          <div className="flex aspect-video items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-2 text-muted">
              <Camera className="h-8 w-8" aria-hidden />
              <p className="text-xs">Webcam disponible en Phase 2</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Caméra CamAIvo
            </h2>
            <Badge variant="cloud">30 FPS · 1080p</Badge>
          </div>
          <div className="flex aspect-video items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-2 text-muted">
              <Sparkles className="h-8 w-8 text-ember" aria-hidden />
              <p className="text-xs">Flux transformé (SwapEngine, Phase 2)</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Gros bouton signature — logique start/stop en Phase 2 */}
      <Button variant="success" size="xl" className="mt-4 w-full" disabled>
        Démarrer le swap
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        Sélectionne un avatar pour activer le swap (Phase 2)
      </p>
    </motion.div>
  );
}
