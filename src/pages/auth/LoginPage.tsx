import { Link } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";

/** CONNEXION — branchée sur Supabase Auth en Phase 1. */
export function LoginPage() {
  return (
    <GlassPanel className="p-6">
      <h1 className="text-lg font-bold text-snow">Connexion</h1>
      <p className="mt-1 text-sm text-muted">
        Formulaire branché sur Supabase Auth en Phase 1.
      </p>
      <Button variant="primary" size="lg" className="mt-6 w-full" disabled>
        Se connecter
      </Button>
      <div className="mt-4 flex justify-between text-xs text-muted">
        <Link to="/register" className="hover:text-snow">
          Créer un compte
        </Link>
        <Link to="/forgot-password" className="hover:text-snow">
          Mot de passe oublié&nbsp;?
        </Link>
      </div>
    </GlassPanel>
  );
}
