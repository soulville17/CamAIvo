// Edge Function CamAIvo — stripe-webhook
// Appelée par Stripe (pas de JWT utilisateur : verify_jwt désactivé).
// La signature Stripe-Signature (HMAC SHA-256) est vérifiée manuellement,
// puis le paiement est crédité via credit_points (idempotent).
import { createClient } from "npm:@supabase/supabase-js@2";

const SIGNATURE_TOLERANCE_S = 300; // 5 min contre le rejeu

/** Vérifie l'en-tête Stripe-Signature : HMAC-SHA256(`${t}.${payload}`). */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = new Map(
    sigHeader.split(",").map((p) => p.split("=") as [string, string]),
  );
  const timestamp = parts.get("t");
  const expected = parts.get("v1");
  if (!timestamp || !expected) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_S) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const computed = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparaison en temps constant
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET manquant");
    return new Response("not_configured", { status: 501 });
  }

  const payload = await req.text();
  const sigHeader = req.headers.get("Stripe-Signature") ?? "";
  if (!(await verifyStripeSignature(payload, sigHeader, secret))) {
    return new Response("invalid_signature", { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("invalid_payload", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const paymentId = metadata.payment_id ?? (session.client_reference_id as string);

  if (event.type === "checkout.session.completed" && paymentId) {
    const { data, error } = await admin.rpc("credit_points", {
      p_payment_id: paymentId,
    });
    if (error) {
      console.error("credit_points:", error.message);
      // 500 → Stripe réessaiera (credit_points est idempotent)
      return new Response("credit_failed", { status: 500 });
    }
    console.log("Paiement crédité:", paymentId, JSON.stringify(data));
  } else if (event.type === "checkout.session.expired" && paymentId) {
    await admin.rpc("fail_payment", { p_payment_id: paymentId });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
