import { Timer, Wifi, WifiOff } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { formatDuration, formatPoints } from "@/lib/format";
import type { SwapStats } from "@/features/swap-engine";
import { cn } from "@/lib/cn";

interface SessionStatusBarProps {
  active: boolean;
  elapsedSeconds: number;
  pointsUsed: number;
  stats: SwapStats;
  avatarName: string | null;
}

const CONNECTION_LABELS = {
  stable: { label: "Connexion stable", dot: "bg-live" },
  unstable: { label: "Connexion instable", dot: "bg-amber-400" },
  down: { label: "Moteur déconnecté", dot: "bg-red-500" },
} as const;

/** Barre d'état sous les caméras : direct, timer, points utilisés, connexion, avatar. */
export function SessionStatusBar({
  active,
  elapsedSeconds,
  pointsUsed,
  stats,
  avatarName,
}: SessionStatusBarProps) {
  const conn = CONNECTION_LABELS[stats.connection];

  return (
    <GlassPanel padded={false} className="mt-4 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          {active ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-live" aria-hidden />
              <span className="text-live">En direct</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="text-muted">Hors session</span>
            </>
          )}
        </span>

        <span className="flex items-center gap-1.5 tabular-nums text-snow">
          <Timer className="h-3.5 w-3.5 text-muted" aria-hidden />
          {formatDuration(elapsedSeconds)}
        </span>

        <span className="tabular-nums text-token">
          {formatPoints(pointsUsed)} pts utilisés
        </span>

        <span className="flex items-center gap-1.5 text-muted">
          <span className={cn("h-2 w-2 rounded-full", conn.dot, active && "animate-pulse-live")} />
          {active ? conn.label : "—"}
          {active && stats.fps > 0 && (
            <span className="tabular-nums">
              · {stats.fps} fps · {stats.latencyMs} ms
            </span>
          )}
        </span>

        <span className="ml-auto font-semibold text-snow">
          Avatar&nbsp;: <span className="text-ember-light">{avatarName ?? "aucun"}</span>
        </span>
      </div>
    </GlassPanel>
  );
}
