import { Outlet } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { HelpBubble } from "@/app/layout/HelpBubble";

/** Layout des pages d'authentification : logo centré + carte verre. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Logo withTagline className="text-center" />
      <div className="w-full max-w-md">
        <Outlet />
      </div>
      <HelpBubble />
    </div>
  );
}
