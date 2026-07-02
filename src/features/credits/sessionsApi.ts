import { supabase } from "@/lib/supabase";
import type { SwapMode } from "@/features/swap-engine";

/** Réponse de l'Edge Function consume-points. */
export interface TickResponse {
  balance: number;
  charge: number;
  points_used: number;
  duration_seconds: number;
  depleted: boolean;
  ended: boolean;
  error?: string;
}

/** Crée la ligne swap_sessions au démarrage (RLS : l'utilisateur crée la sienne). */
export async function createSwapSession(
  userId: string,
  avatarId: string,
  mode: SwapMode,
): Promise<{ sessionId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("swap_sessions")
    .insert({ user_id: userId, avatar_id: avatarId, mode })
    .select("id")
    .single();

  if (error || !data) {
    return { sessionId: null, error: "Impossible de créer la session de swap." };
  }
  return { sessionId: data.id as string, error: null };
}

/**
 * Heartbeat / arrêt de session : le SERVEUR calcule le temps écoulé,
 * débite le solde et coupe la session si épuisée.
 */
export async function sendSessionTick(
  sessionId: string,
  action: "heartbeat" | "stop",
): Promise<{ data: TickResponse | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("consume-points", {
    body: { sessionId, action },
  });

  if (error) {
    return { data: null, error: "Heartbeat de session en échec." };
  }
  return { data: data as TickResponse, error: null };
}
