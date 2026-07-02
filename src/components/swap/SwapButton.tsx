import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SessionStatus } from "@/stores/swapStore";

interface SwapButtonProps {
  sessionStatus: SessionStatus;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Le gros bouton signature pleine largeur :
 * vert « DÉMARRER LE SWAP » au repos, orange « ARRÊTER LE SWAP » en session.
 */
export function SwapButton({ sessionStatus, disabled, onStart, onStop }: SwapButtonProps) {
  const active = sessionStatus === "active";
  const loading = sessionStatus === "starting" || sessionStatus === "stopping";

  return (
    <Button
      variant={active ? "primary" : "success"}
      size="xl"
      className="w-full font-display text-lg font-bold uppercase tracking-wider"
      disabled={disabled && !active}
      loading={loading}
      onClick={active ? onStop : onStart}
    >
      {active ? (
        <>
          <Square className="h-5 w-5 fill-current" aria-hidden />
          Arrêter le swap
        </>
      ) : (
        <>
          <Play className="h-5 w-5 fill-current" aria-hidden />
          {sessionStatus === "starting" ? "Connexion au moteur…" : "Démarrer le swap"}
        </>
      )}
    </Button>
  );
}
