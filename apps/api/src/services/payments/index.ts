import type { Env } from "../../env";
import type { PaymentProvider } from "./provider";
import { createSandboxProvider } from "./sandbox";
import { createStripeProvider } from "./stripe";

export function paymentProviderFromEnv(env: Env): PaymentProvider | null {
  switch (env.PAYMENT_PROVIDER) {
    case "stripe":
      return createStripeProvider({ secretKey: env.STRIPE_SECRET_KEY!, webhookSecret: env.STRIPE_WEBHOOK_SECRET! });
    case "sandbox":
      return createSandboxProvider({ publicApiUrl: env.PUBLIC_API_URL, webhookSecret: env.SANDBOX_WEBHOOK_SECRET! });
    default:
      return null;
  }
}
