import { cn } from "@/lib/cn";

interface ProgressBarProps {
  /** Valeur courante (ex. points restants) */
  value: number;
  /** Maximum (ex. quota du plan) */
  max: number;
  className?: string;
}

/** Barre de progression fine (quota de points). Jaune doré → rouge si bas. */
export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const low = ratio < 0.15;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          low ? "bg-red-500" : "bg-token",
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
