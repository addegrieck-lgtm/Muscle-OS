/**
 * Couche de paiement indépendante du prestataire (implémentation : lib/payments/stripe.ts).
 *
 * Règles à respecter :
 * - la session de paiement est créée côté serveur à partir d'une commande dont les montants ont
 *   été recalculés (lib/services/pricing.ts) ;
 * - seul le webhook signé du prestataire confirme un paiement (jamais le retour navigateur) ;
 * - chaque événement est enregistré dans payment_webhook_events (unique provider + event_id)
 *   pour garantir l'idempotence ;
 * - chaque mouvement d'argent est une ligne de payment_transactions ; le statut « payée » d'une
 *   commande est refusé par la base tant que les transactions ne couvrent pas le total.
 */
export interface CheckoutSessionRequest {
  orderId: string;
  orderNumber: string;
  amount: number; // centimes
  currency: "EUR";
  customerEmail: string;
  /** Libellé affiché sur la page de paiement (ex. « Commande LUM-2026-001042 »). */
  description: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CheckoutSession {
  provider: string;
  sessionId: string;
  redirectUrl: string;
}

export interface VerifiedEvent {
  provider: string;
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "payment.expired" | "refund.succeeded" | "other";
  orderId: string | null;
  amount: number | null;
  currency: string | null;
  providerReference: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSession>;
  /** Vérifie la signature et décode l'événement ; lève une erreur si la signature est invalide. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent>;
  /** Relit une session de paiement (page de confirmation) ; null si inconnue. */
  getCheckoutSession(sessionId: string): Promise<{ orderId: string | null; paid: boolean } | null>;
  refund(
    providerReference: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{ reference: string }>;
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Le paiement en ligne n'est pas activé.");
    this.name = "PaymentsDisabledError";
  }
}
