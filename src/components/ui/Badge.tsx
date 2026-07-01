import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "live" | "cloud" | "local" | "neutral" | "token" | "plan";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
  /** Point pulsant à gauche (badge LIVE) */
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  live: "bg-red-500/15 text-red-400 border-red-500/30",
  cloud: "bg-cloud/15 text-cloud border-cloud/30",
  local: "bg-live/15 text-live border-live/30",
  neutral: "bg-white/5 text-muted border-glass-border",
  token: "bg-token/15 text-token border-token/30",
  plan: "bg-ember/15 text-ember-light border-ember/30",
};

/** Badge arrondi : LIVE rouge pulsant, CLOUD, "30 FPS · 1080p", plan… */
export function Badge({
  variant = "neutral",
  pulse = false,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-live" />
      )}
      {children}
    </span>
  );
}
