import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/authStore";
import { Logo } from "@/components/ui/Logo";

/** Écran d'attente pendant la restauration de session au boot. */
function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Logo withTagline className="text-center" />
      <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-ember-gradient" />
      </div>
    </div>
  );
}

/** Protège le dashboard : session requise, sinon redirection vers /login. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "loading") return <SplashScreen />;
  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Pages d'auth : si déjà connecté, on renvoie vers le dashboard. */
export function RedirectIfAuth() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") return <SplashScreen />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
