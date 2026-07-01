import { Cloud, HardDrive, Menu } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PointsBadge } from "@/components/ui/PointsBadge";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

/** Header : burger (mobile), logo + slogan, toggle CLOUD/LOCAL, compteur de points. */
export function Header() {
  const openSidebar = useUiStore((s) => s.openSidebar);
  const engineMode = useUiStore((s) => s.engineMode);
  const toggleEngineMode = useUiStore((s) => s.toggleEngineMode);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-glass-border bg-ink/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={openSidebar}
        className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-snow lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo visible sur mobile (la sidebar est cachée) */}
      <div className="lg:hidden">
        <Logo />
      </div>

      <div className="flex-1" />

      {/* Toggle du mode moteur — branché au SwapEngine en Phase 7 */}
      <button
        onClick={toggleEngineMode}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
          engineMode === "cloud"
            ? "border-cloud/30 bg-cloud/15 text-cloud"
            : "border-live/30 bg-live/15 text-live",
        )}
        title="Basculer le mode du moteur de swap"
      >
        {engineMode === "cloud" ? (
          <Cloud className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <HardDrive className="h-3.5 w-3.5" aria-hidden />
        )}
        {engineMode}
      </button>

      {/* Solde branché sur Supabase en Phase 3 */}
      <PointsBadge points={500} />
    </header>
  );
}
