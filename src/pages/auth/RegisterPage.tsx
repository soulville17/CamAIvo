import { Link } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";

/** INSCRIPTION — branchée sur Supabase Auth en Phase 1 (500 pts offerts). */
export function RegisterPage() {
  return (
    <GlassPanel className="p-6">
      <h1 className="text-lg font-bold text-snow">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted">
        Inscription (plan starter, 500 points offerts) en Phase 1.
      </p>
      <Button variant="primary" size="lg" className="mt-6 w-full" disabled>
        S&rsquo;inscrire
      </Button>
      <p className="mt-4 text-center text-xs text-muted">
        Déjà un compte&nbsp;?{" "}
        <Link to="/login" className="text-ember-light hover:underline">
          Se connecter
        </Link>
      </p>
    </GlassPanel>
  );
}
