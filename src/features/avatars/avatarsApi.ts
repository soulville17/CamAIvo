import { supabase } from "@/lib/supabase";
import type { Avatar } from "@/types/db";

/**
 * Charge les avatars visibles par l'utilisateur : les siens + les publics.
 * (La RLS filtre déjà côté serveur ; le tri met les siens en premier.)
 */
export async function fetchAvatars(): Promise<{
  avatars: Avatar[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("avatars")
    .select("*")
    .order("is_public", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { avatars: [], error: "Impossible de charger les avatars." };
  }
  return { avatars: (data ?? []) as Avatar[], error: null };
}
