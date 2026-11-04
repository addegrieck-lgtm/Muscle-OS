import { z } from "zod";

const flag = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3100"),
  NEXT_PUBLIC_INDEXABLE: flag,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

/** Variables publiques : lues explicitement pour que Next les inline côté client. */
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_INDEXABLE: process.env.NEXT_PUBLIC_INDEXABLE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Interrupteur du paiement en ligne. Ne suffit pas à lui seul : les clés du prestataire doivent
 * aussi être présentes (voir lib/payments/index.ts et docs/PAIEMENT.md). Valeurs tolérantes aux
 * espaces, guillemets et majuscules saisis par erreur dans le tableau de bord. */
export function paymentsEnabled(): boolean {
  const flag = cleanSecret(process.env.PAYMENTS_ENABLED).toLowerCase();
  return (flag === "1" || flag === "true") && Boolean(paymentProviderName());
}

export function paymentProviderName(): string {
  return cleanSecret(process.env.PAYMENT_PROVIDER).toLowerCase();
}

/** Valeur de variable nettoyée : espaces, retours à la ligne et guillemets copiés par erreur. */
export function cleanSecret(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}
