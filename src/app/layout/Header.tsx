import { Cloud, FlaskConical, HardDrive, Menu } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PointsBadge } from "@/components/ui/PointsBadge";
import { useAuthStore } from "@/features/auth/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import type { SwapMode } from "@/features/swap-engine";
import { cn } from "@/lib/cn";

const PIPELINE_ORDER: SwapMode[] = ["mock", "local", "cloud"];

const PIPELINE_STYLE: Record<SwapMode, { label: string; className: string }> = {
  mock: {
    label: "démo",
    className: "border-token/30 bg-token/15 text-token",
  },
  local: {
    label: "local",
    className: "border-live/30 bg-live/15 text-live",
  },
  cloud: {
    label: "cloud",
    className: "border-cloud/30 bg-cloud/15 text-cloud",
  },
};

/** Header : burger (mobile), logo + slogan, badge pipeline moteur, compteur de points. */
export function Header() {
  const openSidebar = useUiStore((s) => s.openSidebar);
  const pipeline = useSettingsStore((s) => s.enginePipeline);
  const setEnginePipeline = useSettingsStore((s) => s.setEnginePipeline);
  const pointsBalance = useAuthStore((s) => s.profile?.points_balance ?? 0);

  function cyclePipeline() {
    const idx = PIPELINE_ORDER.indexOf(pipeline);
    const next = PIPELINE_ORDER[(idx + 1) % PIPELINE_ORDER.length] ?? "mock";
    setEnginePipeline(next);
  }

  const style = PIPELINE_STYLE[pipeline];

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

      {/* Pipeline moteur : démo → local → cloud (prend effet au prochain swap) */}
      <button
        onClick={cyclePipeline}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
          style.className,
        )}
        title="Changer le pipeline du moteur de swap (démo / local / cloud)"
      >
        {pipeline === "mock" ? (
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
        ) : pipeline === "local" ? (
          <HardDrive className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Cloud className="h-3.5 w-3.5" aria-hidden />
        )}
        {style.label}
      </button>

      <PointsBadge points={pointsBalance} />
    </header>
  );
}
