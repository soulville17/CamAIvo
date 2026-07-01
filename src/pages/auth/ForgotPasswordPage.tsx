import { Link } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";

/** MOT DE PASSE OUBLIÉ — email de réinitialisation Supabase en Phase 1. */
export function ForgotPasswordPage() {
  return (
    <GlassPanel className="p-6">
      <h1 className="text-lg font-bold text-snow">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-muted">
        Envoi de l&rsquo;email de réinitialisation en Phase 1.
      </p>
      <Button variant="primary" size="lg" className="mt-6 w-full" disabled>
        Envoyer le lien
      </Button>
      <p className="mt-4 text-center text-xs text-muted">
        <Link to="/login" className="hover:text-snow">
          Retour à la connexion
        </Link>
      </p>
    </GlassPanel>
  );
}
