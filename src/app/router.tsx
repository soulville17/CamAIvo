import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { AuthLayout } from "@/app/layout/AuthLayout";
import { RequireAuth, RedirectIfAuth } from "@/features/auth/guards";

// Pages chargées à la demande (code-splitting par route)
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const AvatarsPage = lazy(() =>
  import("@/pages/AvatarsPage").then((m) => ({ default: m.AvatarsPage })),
);
const StatsPage = lazy(() =>
  import("@/pages/StatsPage").then((m) => ({ default: m.StatsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const RechargePage = lazy(() =>
  import("@/pages/RechargePage").then((m) => ({ default: m.RechargePage })),
);
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

// eslint-disable-next-line react-refresh/only-export-components -- fallback interne au router, jamais hot-reloadé seul
function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-ember-gradient" />
      </div>
    </div>
  );
}

function suspended(node: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>;
}

/**
 * Routing CamAIvo.
 * - Dashboard : session Supabase requise (RequireAuth → redirection /login).
 * - Pages d'auth : inaccessibles si déjà connecté (RedirectIfAuth).
 */
export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: suspended(<DashboardPage />) },
          { path: "/avatars", element: suspended(<AvatarsPage />) },
          { path: "/stats", element: suspended(<StatsPage />) },
          { path: "/settings", element: suspended(<SettingsPage />) },
          { path: "/recharge", element: suspended(<RechargePage />) },
        ],
      },
    ],
  },
  {
    element: <RedirectIfAuth />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: suspended(<LoginPage />) },
          { path: "/register", element: suspended(<RegisterPage />) },
          { path: "/forgot-password", element: suspended(<ForgotPasswordPage />) },
        ],
      },
    ],
  },
  { path: "*", element: suspended(<NotFoundPage />) },
]);
