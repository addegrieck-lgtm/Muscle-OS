import "server-only";
import { cleanSecret, paymentProviderName, paymentsEnabled } from "@/lib/env";
import { createStripeProvider } from "./stripe";
import { PaymentsDisabledError, type PaymentProvider } from "./types";

/**
 * Retourne le prestataire actif. Le paiement en ligne n'est ouvert que si TOUT est réuni :
 * PAYMENTS_ENABLED=1, PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET.
 * Sinon la fonction refuse : aucun faux paiement n'est possible (voir docs/PAIEMENT.md).
 */
export function getPaymentProvider(): PaymentProvider {
  if (!paymentsEnabled()) throw new PaymentsDisabledError();
  if (paymentProviderName() === "stripe") {
    const secret = cleanSecret(process.env.STRIPE_SECRET_KEY);
    const webhook = cleanSecret(process.env.STRIPE_WEBHOOK_SECRET);
    if (/^(sk|rk)_(test|live)_/.test(secret) && webhook.startsWith("whsec_"))
      return createStripeProvider(secret, webhook);
  }
  throw new PaymentsDisabledError();
}

/**
 * Diagnostic SANS secret (présence et forme des valeurs uniquement), affiché dans
 * l'administration : quelles conditions manquent pour ouvrir la commande en ligne.
 */
export function paymentsDiagnostic(): { label: string; ok: boolean }[] {
  const flag = cleanSecret(process.env.PAYMENTS_ENABLED).toLowerCase();
  const secret = cleanSecret(process.env.STRIPE_SECRET_KEY);
  const webhook = cleanSecret(process.env.STRIPE_WEBHOOK_SECRET);
  return [
    { label: "PAYMENTS_ENABLED vaut 1", ok: flag === "1" || flag === "true" },
    { label: "PAYMENT_PROVIDER vaut stripe", ok: paymentProviderName() === "stripe" },
    {
      label: "STRIPE_SECRET_KEY commence par sk_test_ ou sk_live_ (ou rk_…)",
      ok: /^(sk|rk)_(test|live)_/.test(secret),
    },
    { label: "STRIPE_WEBHOOK_SECRET commence par whsec_", ok: webhook.startsWith("whsec_") },
  ];
}

/** Le parcours de commande peut-il être proposé ? */
export function checkoutAvailable(): boolean {
  try {
    getPaymentProvider();
    return true;
  } catch {
    return false;
  }
}

export { PaymentsDisabledError };
