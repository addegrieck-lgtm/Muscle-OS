import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/lib/env";

/**
 * Point d'entrée des webhooks de paiement — INACTIF EN V1.
 * Intégration future (voir docs/PAIEMENT.md) :
 * 1. lire le corps BRUT (req.text()) et vérifier la signature via PaymentProvider.verifyWebhook ;
 * 2. insérer l'événement dans payment_webhook_events (unique provider + event_id) : si conflit,
 *    répondre 200 sans retraiter (idempotence) ;
 * 3. enregistrer la transaction (payment_transactions) avec le client service_role, puis mettre à jour
 *    payment_status : la base refuse « paid » si les transactions ne couvrent pas le total.
 */
export async function POST() {
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: "Paiement en ligne non activé" }, { status: 503 });
  }
  return NextResponse.json(
    { error: "Aucun prestataire de paiement n’est implémenté" },
    { status: 501 },
  );
}
