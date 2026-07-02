import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface AlertProps {
  variant: "error" | "success";
  children: ReactNode;
  className?: string;
}

/** Bandeau de feedback des formulaires (erreur / succès). */
export function Alert({ variant, children, className }: AlertProps) {
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        variant === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-live/30 bg-live/10 text-live",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
