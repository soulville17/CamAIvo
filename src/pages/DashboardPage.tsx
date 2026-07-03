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
import { useSettingsStore } from "@/stores/settingsStore";
import type { Avatar } from "@/types/db";

/** LIVE SWAP — écran principal : caméras, contrôles, avatars. */
export function DashboardPage() {
  const {
    cameraStream,
    cameraError,
    outputStream,
    sessionStatus,
    sessionMode,
    selectedAvatar,
    elapsedSeconds,
    pointsUsed,
    stats,
    engineError,
    depleted,
    enableCamera,
    selectAvatar,
    startSwap,
    stopSwap,
  } = useSwapStore();
  const pointsBalance = useAuthStore((s) => s.profile?.points_balance ?? 0);
  const enginePipeline = useSettingsStore((s) => s.enginePipeline);
  const watermarkEnabled = useSettingsStore((s) => s.watermarkEnabled);

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
      // Présélectionne l'avatar par défaut de l'utilisateur
      const { selectedAvatar, selectAvatar } = useSwapStore.getState();
      if (!selectedAvatar) {
        const defaultAvatar = avatars.find((a) => a.is_default && a.status === "ready");
        if (defaultAvatar) void selectAvatar(defaultAvatar);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = sessionStatus === "active";
  const noPoints = pointsBalance <= 0;
  const startDisabled = !cameraStream || !selectedAvatar || noPoints;

  // Libellé du watermark selon le pipeline du moteur
  const watermarkMode =
    enginePipeline === "mock" ? "Démo" : enginePipeline === "cloud" ? "Cloud" : "Local";

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
      {active && sessionMode && sessionMode !== enginePipeline && (
        <Alert variant="error" className="mb-4">
          Cette session tourne encore sur le moteur «&nbsp;{sessionMode === "mock" ? "démo" : sessionMode}&nbsp;».
          Arrête puis redémarre le swap pour appliquer «&nbsp;
          {enginePipeline === "mock" ? "démo" : enginePipeline}&nbsp;».
        </Alert>
      )}
      {depleted && (
        <Alert variant="error" className="mb-4">
          Points épuisés — ta session a été arrêtée automatiquement.{" "}
          <Link to="/recharge" className="font-semibold underline">
            Recharge
          </Link>{" "}
          pour continuer à swapper.
        </Alert>
      )}
      {noPoints && !depleted && (
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
          watermark={watermarkEnabled ? `CamAIvo · ${watermarkMode}` : undefined}
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
