import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/db";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface SignUpResult {
  error: string | null;
  /** true si Supabase exige une confirmation par email avant la 1re connexion */
  needsEmailConfirmation: boolean;
}

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Démarre l'écoute de session — appelé une seule fois au boot de l'app. */
  init: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  /** Met à jour le solde local (après réponse serveur d'un heartbeat/paiement). */
  setPointsBalance: (balance: number) => void;
}

/** Traduit les erreurs Supabase courantes en français. */
function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "Email not confirmed":
      "Email non confirmé : clique sur le lien reçu par email avant de te connecter.",
    "User already registered": "Un compte existe déjà avec cet email.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
  };
  return map[message] ?? message;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("Erreur de chargement du profil :", error.message);
    return null;
  }
  return data as Profile;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  user: null,
  profile: null,

  init: () => {
    if (initialized) return;
    initialized = true;

    // Écoute tous les changements de session (login, logout, refresh de token).
    // INITIAL_SESSION est émis au boot, donc pas besoin d'un getSession séparé.
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({ session, user: session.user, status: "authenticated" });
        // Chargement du profil hors du callback (recommandation Supabase :
        // pas d'appel réseau bloquant dans onAuthStateChange).
        setTimeout(() => {
          void fetchProfile(session.user.id).then((profile) => set({ profile }));
        }, 0);
      } else {
        set({ session: null, user: null, profile: null, status: "unauthenticated" });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateAuthError(error.message) : null };
  },

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || undefined } },
    });
    if (error) {
      return { error: translateAuthError(error.message), needsEmailConfirmation: false };
    }
    // Pas de session retournée → confirmation email exigée par le projet
    return { error: null, needsEmailConfirmation: data.session === null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error ? translateAuthError(error.message) : null };
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const profile = await fetchProfile(userId);
    set({ profile });
  },

  setPointsBalance: (balance) => {
    const profile = get().profile;
    if (profile) set({ profile: { ...profile, points_balance: balance } });
  },
}));
