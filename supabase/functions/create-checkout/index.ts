// Edge Function CamAIvo — create-checkout
// Crée un paiement `pending` + une session de paiement chez le prestataire.
// Les PACKS sont définis ICI, côté serveur : le client n'envoie qu'un packId,
// jamais un montant.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Barème des packs (miroir affiché côté client dans features/payments/packs.ts)
const PACKS: Record<
  string,
  { points: number; amountEur: number; label: string }
> = {
  decouverte: { points: 500, amountEur: 4.99, label: "Pack Découverte" },
  createur: { points: 2000, amountEur: 14.99, label: "Pack Créateur" },
  pro: { points: 5000, amountEur: 29.99, label: "Pack Pro" },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1. Authentification
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  // 2. Payload : { packId, provider, origin }
  let packId = "";
  let provider = "";
  let origin = "";
  try {
    const body = await req.json();
    packId = String(body.packId ?? "");
    provider = String(body.provider ?? "stripe");
    origin = String(body.origin ?? "");
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  const pack = PACKS[packId];
  if (!pack) return json({ error: "unknown_pack" }, 400);
  if (!/^https?:\/\//.test(origin)) {
    origin = Deno.env.get("APP_URL") ?? "http://localhost:5173";
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Mobile Money : adaptateur préparé, agrégateur à brancher ──
  // TODO : intégrer un agrégateur (CinetPay / PayDunya / FedaPay) qui couvre
  // Orange Money, Wave et MTN MoMo. Même contrat que Stripe :
  //   1. créer le payment `pending` (comme ci-dessous)
  //   2. créer la transaction chez l'agrégateur avec metadata payment_id
  //   3. webhook agrégateur → credit_points(payment_id)
  // En attente des clés API du compte marchand.
  if (provider === "mobile_money") {
    return json(
      {
        error: "mobile_money_not_configured",
        message:
          "Le paiement Mobile Money (Orange Money, Wave, MTN) arrive bientôt.",
      },
      501,
    );
  }
  if (provider !== "stripe") return json({ error: "unknown_provider" }, 400);

  // ── Stripe ──
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return json(
      {
        error: "stripe_not_configured",
        message:
          "Paiement carte indisponible : clé Stripe non configurée sur le serveur.",
      },
      501,
    );
  }

  // 3. Paiement en attente (source de vérité du montant et des points)
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "stripe",
      amount: pack.amountEur,
      currency: "EUR",
      points_granted: pack.points,
      status: "pending",
    })
    .select("id")
    .single();
  if (paymentError || !payment) {
    console.error("insert payment:", paymentError?.message);
    return json({ error: "internal_error" }, 500);
  }

  // 4. Session Stripe Checkout (API REST, form-encoded)
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(Math.round(pack.amountEur * 100)),
    "line_items[0][price_data][product_data][name]": `CamAIvo — ${pack.label} (${pack.points} points)`,
    success_url: `${origin}/recharge?checkout=success`,
    cancel_url: `${origin}/recharge?checkout=cancel`,
    client_reference_id: payment.id,
    "metadata[payment_id]": payment.id,
    "metadata[user_id]": user.id,
  });

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await stripeRes.json();
  if (!stripeRes.ok || !session.url) {
    console.error("stripe checkout:", JSON.stringify(session.error ?? session));
    await admin.rpc("fail_payment", { p_payment_id: payment.id });
    return json({ error: "stripe_error" }, 502);
  }

  // Référence prestataire pour le rapprochement
  await admin
    .from("payments")
    .update({ provider_ref: session.id })
    .eq("id", payment.id);

  return json({ url: session.url });
});
