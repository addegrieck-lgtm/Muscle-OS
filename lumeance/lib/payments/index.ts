import "server-only";
import { paymentsEnabled } from "@/lib/env";
import { createStripeProvider } from "./stripe";
import { PaymentsDisabledError, type PaymentProvider } from "./types";

/**
 * Retourne le prestataire actif. Le paiement en ligne n'est ouvert que si TOUT est réuni :
 * PAYMENTS_ENABLED=1, PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET.
 * Sinon la fonction refuse : aucun faux paiement n'est possible (voir docs/PAIEMENT.md).
 */
export function getPaymentProvider(): PaymentProvider {
  if (!paymentsEnabled()) throw new PaymentsDisabledError();
  if (process.env.PAYMENT_PROVIDER === "stripe") {
    const secret = process.env.STRIPE_SECRET_KEY;
    const webhook = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret && /^(sk|rk)_(test|live)_/.test(secret) && webhook?.startsWith("whsec_"))
      return createStripeProvider(secret, webhook);
  }
  throw new PaymentsDisabledError();
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
