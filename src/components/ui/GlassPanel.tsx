import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Padding interne par défaut, désactivable pour les panneaux caméra */
  padded?: boolean;
}

/** Carte "verre" signature : blur, bordure lumineuse subtile, coins arrondis. */
export function GlassPanel({
  children,
  className,
  padded = true,
  ...props
}: GlassPanelProps) {
  return (
    <div className={cn("glass", padded && "p-5", className)} {...props}>
      {children}
    </div>
  );
}
