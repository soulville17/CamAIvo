import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { Coins } from "lucide-react";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PointsBadgeProps {
  points: number;
  className?: string;
}

/** Jeton doré + solde de points (header), compteur animé à chaque variation. */
export function PointsBadge({ points, className }: PointsBadgeProps) {
  const [display, setDisplay] = useState(points);
  const previous = useRef(points);

  useEffect(() => {
    const controls = animate(previous.current, points, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    previous.current = points;
    return () => controls.stop();
  }, [points]);

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
        {formatPoints(display)}
      </span>
      <span className="hidden text-xs text-muted sm:inline">pts</span>
    </div>
  );
}
