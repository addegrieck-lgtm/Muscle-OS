import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cleanSecret } from "@/lib/env";
import { createStripeProvider } from "./stripe";
import { PaymentsDisabledError, type PaymentProvider } from "./types";

const VARS = [
  "PAYMENTS_ENABLED",
  "PAYMENT_PROVIDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;
type PaymentVar = (typeof VARS)[number];
type Source = "process.env" | "cloudflare" | null;

/**
 * Lit une variable serveur : process.env d'abord, puis les variables et secrets du Worker
 * Cloudflare (selon la configuration, les secrets n'apparaissent pas toujours dans process.env).
 */
function readVar(name: PaymentVar): { value: string; source: Source } {
  const fromProcess = cleanSecret(process.env[name]);
  if (fromProcess) return { value: fromProcess, source: "process.env" };
  try {
    const { env } = getCloudflareContext();
    const raw = (env as unknown as Record<string, unknown>)[name];
    const fromWorker = typeof raw === "string" ? cleanSecret(raw) : "";
    if (fromWorker) return { value: fromWorker, source: "cloudflare" };
  } catch {
    /* hors Cloudflare (next dev, tests) */
  }
  return { value: "", source: null };
}

const isOn = (v: string) => ["1", "true"].includes(v.toLowerCase());
const isSecretKey = (v: string) => /^(sk|rk)_(test|live)_/.test(v);
const isWebhookSecret = (v: string) => v.startsWith("whsec_");

/**
 * Retourne le prestataire actif. Le paiement en ligne n'est ouvert que si TOUT est réuni :
 * PAYMENTS_ENABLED=1, PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET.
 * Sinon la fonction refuse : aucun faux paiement n'est possible (voir docs/PAIEMENT.md).
 */
export function getPaymentProvider(): PaymentProvider {
  const v = Object.fromEntries(VARS.map((n) => [n, readVar(n).value])) as Record<
    PaymentVar,
    string
  >;
  if (
    isOn(v.PAYMENTS_ENABLED) &&
    v.PAYMENT_PROVIDER.toLowerCase() === "stripe" &&
    isSecretKey(v.STRIPE_SECRET_KEY) &&
    isWebhookSecret(v.STRIPE_WEBHOOK_SECRET)
  )
    return createStripeProvider(v.STRIPE_SECRET_KEY, v.STRIPE_WEBHOOK_SECRET);
  throw new PaymentsDisabledError();
}

/**
 * Diagnostic SANS secret, affiché dans l'administration : pour chaque variable, si elle est
 * lue, d'où, et si sa forme est attendue. Aucune valeur n'est renvoyée, seulement un préfixe
 * public (sk_test_, whsec_…) pour les clés.
 */
export function paymentsDiagnostic(): { name: PaymentVar; ok: boolean; detail: string }[] {
  return VARS.map((name) => {
    const { value, source } = readVar(name);
    if (!source) return { name, ok: false, detail: "absente (non lue par le site)" };
    const where = source === "cloudflare" ? " — lue dans les secrets du Worker" : "";
    switch (name) {
      case "PAYMENTS_ENABLED":
        return isOn(value)
          ? { name, ok: true, detail: `activé${where}` }
          : { name, ok: false, detail: `doit valoir 1${where}` };
      case "PAYMENT_PROVIDER":
        return value.toLowerCase() === "stripe"
          ? { name, ok: true, detail: `stripe${where}` }
          : { name, ok: false, detail: `doit valoir stripe${where}` };
      case "STRIPE_SECRET_KEY":
        return isSecretKey(value)
          ? { name, ok: true, detail: `${value.slice(0, 8)}…${where}` }
          : {
              name,
              ok: false,
              detail: value.startsWith("pk_")
                ? `clé publique (pk_…) : il faut la clé secrète sk_…${where}`
                : `doit commencer par sk_test_ ou sk_live_${where}`,
            };
      case "STRIPE_WEBHOOK_SECRET":
        return isWebhookSecret(value)
          ? { name, ok: true, detail: `whsec_…${where}` }
          : { name, ok: false, detail: `doit commencer par whsec_${where}` };
    }
  });
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
