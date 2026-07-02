import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CircleUserRound,
  LogOut,
  Radio,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PlanUsageCard } from "@/components/ui/PlanUsageCard";
import { useAuthStore } from "@/features/auth/authStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Live Swap", icon: Radio },
  { to: "/avatars", label: "Mes avatars", icon: CircleUserRound },
  { to: "/stats", label: "Statistiques", icon: BarChart3 },
  { to: "/settings", label: "Paramètres", icon: Settings },
  { to: "/recharge", label: "Recharge", icon: Wallet },
] as const;

function SidebarContent() {
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-2 pt-2">
        <Logo withTagline />
        {/* Bouton fermer — visible uniquement en drawer mobile */}
        <button
          onClick={closeSidebar}
          className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-snow lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors",
                isActive
                  ? "bg-ember/15 text-ember-light"
                  : "text-muted hover:bg-white/5 hover:text-snow",
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2">
        <PlanUsageCard
          email={profile?.email ?? user?.email ?? "…"}
          plan={profile?.plan ?? "starter"}
          pointsBalance={profile?.points_balance ?? 0}
          pointsQuota={profile?.points_quota ?? 0}
        />
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-white/5 hover:text-snow"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

/** Sidebar fixe sur desktop, drawer animé (framer-motion) sur mobile. */
export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-glass-border bg-ink-soft/60 lg:block">
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-glass-border bg-ink-soft lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
