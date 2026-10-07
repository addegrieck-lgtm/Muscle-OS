/**
 * Interface commune aux prestataires de paiement. Ajouter un prestataire = un fichier qui
 * implémente ces deux fonctions ; le reste de la boutique ne change pas (voir docs/SHOP_PAYMENT.md).
 */
export interface CheckoutRequest {
  orderId: string;
  publicId: string;
  currency: string;
  lines: { name: string; unitAmountCents: number; quantity: number }[];
  totalCents: number;
  successUrl: string;
  cancelUrl: string;
  customerReference: string;
  expiresAt: Date;
}

export type ProviderEvent =
  | { kind: "payment.succeeded"; id: string; orderId: string; providerPaymentId: string; amountCents: number; currency: string; raw: unknown }
  | { kind: "payment.failed"; id: string; orderId: string; reason: string; raw: unknown }
  | { kind: "refund.succeeded"; id: string; providerPaymentId: string; refunds: { id: string; amountCents: number; reason: string | null }[]; raw: unknown }
  | { kind: "ignored"; id: string; type: string };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<{ checkoutId: string; url: string }>;
  /** Vérifie la signature et la fraîcheur, puis normalise l'événement. Lève une erreur si invalide. */
  parseWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): ProviderEvent;
}

export class WebhookSignatureError extends Error {}

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export const header = (h: Record<string, string | string[] | undefined>, name: string) => {
  const v = h[name.toLowerCase()];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
};
