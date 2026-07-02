import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAuthStore } from "@/features/auth/authStore";

/** INSCRIPTION — crée le compte + profil (plan starter, 500 pts offerts). */
export function RegisterPage() {
  const signUp = useAuthStore((s) => s.signUp);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    const result = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.needsEmailConfirmation) {
      setAwaitingConfirmation(true);
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  if (awaitingConfirmation) {
    return (
      <GlassPanel className="p-6">
        <h1 className="text-lg font-bold text-snow">Vérifie ta boîte mail 📬</h1>
        <Alert variant="success" className="mt-4">
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Clique
          dessus pour activer ton compte, puis connecte-toi.
        </Alert>
        <p className="mt-4 text-center text-xs text-muted">
          <Link to="/login" className="text-ember-light hover:underline">
            Aller à la connexion
          </Link>
        </p>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="p-6">
      <h1 className="text-lg font-bold text-snow">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted">
        Plan starter avec <span className="font-semibold text-token">500 points</span>{" "}
        offerts (~25 min de swap).
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Input
          label="Nom d'affichage"
          type="text"
          autoComplete="nickname"
          placeholder="Ton pseudo de créateur"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="toi@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          placeholder="6 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
        >
          S&rsquo;inscrire
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Déjà un compte&nbsp;?{" "}
        <Link to="/login" className="text-ember-light hover:underline">
          Se connecter
        </Link>
      </p>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted/70">
        En t&rsquo;inscrivant, tu t&rsquo;engages à un usage responsable : uniquement
        des avatars dont tu détiens les droits, aucune usurpation d&rsquo;identité.
      </p>
    </GlassPanel>
  );
}
