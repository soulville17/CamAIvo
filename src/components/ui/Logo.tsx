import { cn } from "@/lib/cn";

interface LogoProps {
  /** Affiche le slogan sous le logo */
  withTagline?: boolean;
  className?: string;
}

/** Logo texte "CamAIvo" — le "AI" en dégradé orange, + slogan optionnel. */
export function Logo({ withTagline = false, className }: LogoProps) {
  return (
    <div className={cn("select-none leading-none", className)}>
      <span className="font-display text-xl font-bold tracking-tight text-snow">
        Cam
        <span className="bg-ember-gradient bg-clip-text text-transparent">AI</span>
        vo
      </span>
      {withTagline && (
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Swap en temps réel
        </p>
      )}
    </div>
  );
}
