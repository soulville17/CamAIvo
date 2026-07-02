// Edge Function CamAIvo — consume-points
// Reçoit les heartbeats de session (toutes les 10 s) et l'arrêt de session.
// Vérifie le JWT de l'utilisateur, puis délègue le débit à la fonction SQL
// atomique consume_session_points (verrous, journal, coupure à 0).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const POINTS_PAR_MINUTE = Number(Deno.env.get("POINTS_PAR_MINUTE") ?? "20");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  // 1. Authentification : le JWT de l'utilisateur doit être valide
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return json({ error: "unauthorized" }, 401);
  }

  // 2. Payload : { sessionId, action: "heartbeat" | "stop" }
  let sessionId: string;
  let action: string;
  try {
    const body = await req.json();
    sessionId = String(body.sessionId ?? "");
    action = String(body.action ?? "heartbeat");
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!sessionId || !["heartbeat", "stop"].includes(action)) {
    return json({ error: "invalid_body" }, 400);
  }

  // 3. Débit atomique côté serveur (service role)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.rpc("consume_session_points", {
    p_session_id: sessionId,
    p_user_id: user.id,
    p_stop: action === "stop",
    p_points_per_minute: POINTS_PAR_MINUTE,
  });

  if (error) {
    console.error("consume_session_points:", error.message);
    return json({ error: "internal_error" }, 500);
  }
  if (data?.error === "session_not_found") {
    return json(data, 404);
  }
  return json(data);
});
