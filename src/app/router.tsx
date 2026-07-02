import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { AuthLayout } from "@/app/layout/AuthLayout";
import { RequireAuth, RedirectIfAuth } from "@/features/auth/guards";
import { DashboardPage } from "@/pages/DashboardPage";
import { AvatarsPage } from "@/pages/AvatarsPage";
import { StatsPage } from "@/pages/StatsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { RechargePage } from "@/pages/RechargePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

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
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/avatars", element: <AvatarsPage /> },
          { path: "/stats", element: <StatsPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/recharge", element: <RechargePage /> },
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
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
