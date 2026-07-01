import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "success" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  // CTA principal — dégradé orange + ombre diffuse (bouton "ARRÊTER LE SWAP")
  primary:
    "bg-ember-gradient text-white shadow-ember hover:brightness-110 active:brightness-95",
  // État "DÉMARRER LE SWAP"
  success:
    "bg-live text-ink font-bold hover:brightness-110 active:brightness-95 shadow-[0_8px_32px_-8px_rgba(34,197,94,0.5)]",
  ghost:
    "bg-white/5 text-snow border border-glass-border hover:bg-white/10 active:bg-white/5",
  danger: "bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
  xl: "h-14 px-8 text-lg rounded-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60",
        "disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
