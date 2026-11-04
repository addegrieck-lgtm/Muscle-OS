import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Webhook du prestataire de paiement (Stripe : …/api/payments/webhook/stripe).
 * 1. corps BRUT + vérification de signature (PaymentProvider.verifyWebhook) ;
 * 2. événement enregistré dans payment_webhook_events (unique provider + event_id) : un
 *    événement déjà traité est acquitté sans être rejoué (idempotence) ;
 * 3. paiement / échec / expiration appliqués par des fonctions SQL réservées au serveur ; la base
 *    refuse « payée » si les transactions ne couvrent pas le total.
 * Une erreur de traitement renvoie 500 : le prestataire renverra l'événement.
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: name } = await ctx.params;
  let provider;
  try {
    provider = getPaymentProvider();
  } catch {
    return NextResponse.json({ error: "Paiement en ligne non activé" }, { status: 503 });
  }
  if (name !== provider.name)
    return NextResponse.json({ error: "Prestataire inconnu" }, { status: 404 });
  const db = createSupabaseServiceClient();
  if (!db) return NextResponse.json({ error: "Base non configurée" }, { status: 503 });

  const raw = await req.text();
  let event;
  try {
    event = await provider.verifyWebhook(raw, req.headers);
  } catch (e) {
    console.warn("webhook: signature refusée", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const { error: insertError } = await db.from("payment_webhook_events").insert({
    provider: event.provider,
    event_id: event.eventId,
    event_type: event.type === "other" ? "other" : event.type,
    payload: event.raw,
  });
  if (insertError) {
    if (insertError.code !== "23505") {
      console.error("webhook: enregistrement", insertError.message);
      return NextResponse.json({ error: "Erreur d’enregistrement" }, { status: 500 });
    }
    const { data: seen } = await db
      .from("payment_webhook_events")
      .select("processed_at")
      .eq("provider", event.provider)
      .eq("event_id", event.eventId)
      .maybeSingle();
    if (seen?.processed_at) return NextResponse.json({ received: true, duplicate: true });
  }

  let outcome = "ignored";
  let failure: string | null = null;
  try {
    if (event.type !== "other" && !event.orderId) throw new Error("Commande non référencée");
    if (event.type === "payment.succeeded") {
      if (!event.amount || !event.currency || !event.providerReference)
        throw new Error("Montant ou référence manquant");
      const { data, error } = await db.rpc("record_provider_payment", {
        p_order_id: event.orderId,
        p_provider: event.provider,
        p_amount: event.amount,
        p_currency: event.currency,
        p_reference: event.providerReference,
        p_raw: event.raw,
      });
      if (error) throw new Error(error.message);
      outcome = String(data);
      if (outcome === "partial" || outcome === "paid_after_cancel")
        console.warn(`webhook: commande ${event.orderId} — ${outcome}, à vérifier`);
    } else if (event.type === "payment.failed" || event.type === "payment.expired") {
      const { data, error } = await db.rpc("release_checkout_order", {
        p_order_id: event.orderId,
        p_failed: event.type === "payment.failed",
        p_note:
          event.type === "payment.failed" ? "Paiement refusé" : "Paiement non effectué (expiré)",
      });
      if (error) throw new Error(error.message);
      outcome = String(data);
    }
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  }

  await db
    .from("payment_webhook_events")
    .update({ processed_at: failure ? null : new Date().toISOString(), error: failure })
    .eq("provider", event.provider)
    .eq("event_id", event.eventId);

  if (failure) {
    console.error(`webhook: ${event.type} ${event.eventId}`, failure);
    return NextResponse.json({ error: "Traitement impossible" }, { status: 500 });
  }
  return NextResponse.json({ received: true, outcome });
}
