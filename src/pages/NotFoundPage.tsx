import { Link } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";

/** Page 404. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <GlassPanel className="max-w-md p-8 text-center">
        <p className="font-display text-5xl font-bold text-ember">404</p>
        <p className="mt-3 text-sm text-muted">Cette page n&rsquo;existe pas.</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block text-sm font-semibold text-ember-light hover:underline"
        >
          Retour au Live Swap
        </Link>
      </GlassPanel>
    </div>
  );
}
