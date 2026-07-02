import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Configuration Supabase manquante : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env",
  );
}

/** Client Supabase partagé (auth persistée en localStorage par défaut). */
export const supabase = createClient(url, anonKey);
