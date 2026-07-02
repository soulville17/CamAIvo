import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAuthStore } from "@/features/auth/authStore";

/** CONNEXION — email + mot de passe via Supabase Auth. */
export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate(from, { replace: true });
    }
  }

  return (
    <GlassPanel className="p-6">
      <h1 className="text-lg font-bold text-snow">Connexion</h1>
      <p className="mt-1 text-sm text-muted">
        Ravi de te revoir ! Connecte-toi pour swapper.
      </p>

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
        <Input
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
        >
          Se connecter
        </Button>
      </form>

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
