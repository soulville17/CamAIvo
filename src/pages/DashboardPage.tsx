import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { CameraPanel } from "@/components/swap/CameraPanel";
import { SwapButton } from "@/components/swap/SwapButton";
import { SessionStatusBar } from "@/components/swap/SessionStatusBar";
import { AvatarPicker } from "@/components/avatars/AvatarPicker";
import { fetchAvatars } from "@/features/avatars/avatarsApi";
import { useSwapStore } from "@/stores/swapStore";
import { useAuthStore } from "@/features/auth/authStore";
import { useUiStore } from "@/stores/uiStore";
import { configuredSwapMode } from "@/features/swap-engine";
import type { Avatar } from "@/types/db";

/** LIVE SWAP — écran principal : caméras, contrôles, avatars. */
export function DashboardPage() {
  const {
    cameraStream,
    cameraError,
    outputStream,
    sessionStatus,
    selectedAvatar,
    elapsedSeconds,
    pointsUsed,
    stats,
    engineError,
    enableCamera,
    selectAvatar,
    startSwap,
    stopSwap,
  } = useSwapStore();
  const pointsBalance = useAuthStore((s) => s.profile?.points_balance ?? 0);
  const engineMode = useUiStore((s) => s.engineMode);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAvatars().then(({ avatars, error }) => {
      if (cancelled) return;
      setAvatars(avatars);
      setAvatarsError(error);
      setAvatarsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = sessionStatus === "active";
  const noPoints = pointsBalance <= 0;
  const startDisabled = !cameraStream || !selectedAvatar || noPoints;

  // Libellé du watermark selon le mode réel du moteur
  const watermarkMode =
    configuredSwapMode === "mock"
      ? "Mock"
      : engineMode === "cloud"
        ? "Cloud"
        : "Local";

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

      {engineError && (
        <Alert variant="error" className="mb-4">
          {engineError}
        </Alert>
      )}
      {noPoints && (
        <Alert variant="error" className="mb-4">
          Points épuisés —{" "}
          <Link to="/recharge" className="font-semibold underline">
            recharger
          </Link>{" "}
          pour continuer à swapper.
        </Alert>
      )}

      {/* Deux panneaux caméra — empilés sur mobile, côte à côte sur desktop */}
      <div className="grid gap-4 md:grid-cols-2">
        <CameraPanel
          title="Caméra réelle"
          badge={
            <Badge variant="live" pulse={!!cameraStream}>
              Live
            </Badge>
          }
          stream={cameraStream}
          mirrored
          placeholder={
            <div className="flex flex-col items-center gap-3 text-center">
              {cameraError ? (
                <>
                  <TriangleAlert className="h-8 w-8 text-amber-400" aria-hidden />
                  <p className="max-w-xs text-xs text-muted">{cameraError}</p>
                  <Button variant="ghost" size="sm" onClick={() => void enableCamera()}>
                    Réessayer
                  </Button>
                </>
              ) : (
                <>
                  <Camera className="h-8 w-8 text-muted" aria-hidden />
                  <Button variant="ghost" size="sm" onClick={() => void enableCamera()}>
                    Activer la caméra
                  </Button>
                </>
              )}
            </div>
          }
        />

        <CameraPanel
          title="Caméra CamAIvo"
          badge={
            <Badge variant="cloud">
              {active && stats.fps > 0 ? `${stats.fps} FPS` : "30 FPS"} · 1080p
            </Badge>
          }
          stream={outputStream}
          watermark={`CamAIvo · ${watermarkMode}`}
          placeholder={
            <div className="flex flex-col items-center gap-2 text-center text-muted">
              <Sparkles className="h-8 w-8 text-ember" aria-hidden />
              <p className="text-xs">
                {active
                  ? "Connexion au moteur…"
                  : "Le flux transformé apparaîtra ici au démarrage du swap"}
              </p>
            </div>
          }
        />
      </div>

      <SessionStatusBar
        active={active}
        elapsedSeconds={elapsedSeconds}
        pointsUsed={pointsUsed}
        stats={stats}
        avatarName={selectedAvatar?.name ?? null}
      />

      <div className="mt-4">
        <SwapButton
          sessionStatus={sessionStatus}
          disabled={startDisabled}
          onStart={() => void startSwap()}
          onStop={() => void stopSwap()}
        />
        {!active && startDisabled && (
          <p className="mt-2 text-center text-xs text-muted">
            {!cameraStream
              ? "Active d'abord ta caméra."
              : !selectedAvatar
                ? "Sélectionne un avatar ci-dessous pour démarrer."
                : "Solde de points insuffisant."}
          </p>
        )}
      </div>

      {/* Sélection d'avatar — à chaud si session active */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
          Mes avatars
        </h2>
        <AvatarPicker
          avatars={avatars}
          selectedId={selectedAvatar?.id ?? null}
          onSelect={(a) => void selectAvatar(a)}
          loading={avatarsLoading}
          error={avatarsError}
        />
      </section>
    </motion.div>
  );
}
