import { Coins } from "lucide-react";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PointsBadgeProps {
  points: number;
  className?: string;
}

/**
 * Jeton doré + solde de points (header).
 * Le compteur animé (framer-motion) sera branché sur le vrai solde en Phase 3.
 */
export function PointsBadge({ points, className }: PointsBadgeProps) {
  const low = points > 0 && points < 100;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-token/30 bg-token/10 px-3 py-1.5",
        className,
      )}
      title="Solde de points"
    >
      <Coins className="h-4 w-4 text-token" aria-hidden />
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          low ? "text-red-400" : "text-token",
        )}
      >
        {formatPoints(points)}
      </span>
      <span className="hidden text-xs text-muted sm:inline">pts</span>
    </div>
  );
}
