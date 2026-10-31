/**
 * Couche de paiement indépendante — PRÉPARÉE, NON ACTIVE EN V1.
 *
 * Un prestataire (Stripe ou autre) implémentera cette interface. Règles à respecter :
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
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded" | "other";
  orderId: string | null;
  amount: number | null;
  providerReference: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSession>;
  /** Vérifie la signature et décode l'événement ; lève une erreur si la signature est invalide. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent>;
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
