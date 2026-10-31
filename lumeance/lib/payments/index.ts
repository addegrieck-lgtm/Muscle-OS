import "server-only";
import { paymentsEnabled } from "@/lib/env";
import { PaymentsDisabledError, type PaymentProvider } from "./types";

/**
 * Retourne le prestataire actif. En V1 aucun prestataire n'est implémenté : même si
 * PAYMENTS_ENABLED=1, la fonction refuse, pour qu'aucun faux paiement ne soit possible.
 * Intégration future : ajouter lib/payments/stripe.ts implémentant PaymentProvider et le
 * référencer ici (voir docs/PAIEMENT.md).
 */
export function getPaymentProvider(): PaymentProvider {
  if (!paymentsEnabled()) throw new PaymentsDisabledError();
  throw new PaymentsDisabledError();
}

export { PaymentsDisabledError };
