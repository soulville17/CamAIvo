import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAuthStore } from "@/features/auth/authStore";

/** MOT DE PASSE OUBLIÉ — envoi de l'email de réinitialisation Supabase. */
export function ForgotPasswordPage() {
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <GlassPanel className="p-6">
      <h1 className="text-lg font-bold text-snow">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-muted">
        Indique ton email, on t&rsquo;envoie un lien de réinitialisation.
      </p>

      {sent ? (
        <Alert variant="success" className="mt-6">
          Si un compte existe pour <strong>{email}</strong>, un email de
          réinitialisation vient d&rsquo;être envoyé.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="toi@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
          >
            Envoyer le lien
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        <Link to="/login" className="hover:text-snow">
          Retour à la connexion
        </Link>
      </p>
    </GlassPanel>
  );
}
