"use server";

import { headers } from "next/headers";
import { getProducts } from "@/lib/services/catalog";
import { getShippingSettings } from "@/lib/services/content";
import { priceCart, type CartQuote } from "@/lib/services/pricing";
import { rateLimit } from "@/lib/services/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { cartSchema, contactSchema, newsletterSchema } from "@/lib/validation/schemas";

export interface FormState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

async function clientKey(action: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${action}:${ip}`;
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [String(i.path[0] ?? "form"), i.message]));
}

/** Recalcule le panier côté serveur à partir du catalogue publié. */
export async function quoteCart(input: unknown): Promise<CartQuote> {
  const parsed = cartSchema.safeParse(input);
  const lines = parsed.success ? parsed.data : [];
  const [catalog, shipping] = await Promise.all([getProducts(), getShippingSettings()]);
  return priceCart(lines, catalog, shipping);
}

export async function subscribeNewsletter(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(await clientKey("newsletter"), 5, 10 * 60_000))
    return { ok: false, message: "Trop de tentatives. Merci de réessayer dans quelques minutes." };
  const parsed = newsletterSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Merci de vérifier le formulaire.",
      errors: fieldErrors(parsed.error.issues),
    };
  }
  if (parsed.data.website) return { ok: true, message: "Merci." }; // robot : réponse neutre
  const db = createSupabaseServiceClient();
  if (!db) {
    return {
      ok: false,
      message: "Les inscriptions ouvriront prochainement : la lettre n’est pas encore active.",
    };
  }
  const { error } = await db.from("newsletter_subscribers").upsert(
    {
      email: parsed.data.email,
      consent_timestamp: new Date().toISOString(),
      consent_source: parsed.data.source,
      status: "subscribed",
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("newsletter:", error.message);
    return { ok: false, message: "Une erreur est survenue. Merci de réessayer plus tard." };
  }
  return { ok: true, message: "Merci. Vous recevrez nos prochaines nouvelles de la maison." };
}

export async function sendContact(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(await clientKey("contact"), 3, 10 * 60_000))
    return { ok: false, message: "Trop de messages envoyés. Merci de réessayer plus tard." };
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Merci de vérifier le formulaire.",
      errors: fieldErrors(parsed.error.issues),
    };
  }
  if (parsed.data.website) return { ok: true, message: "Merci." };
  const db = createSupabaseServiceClient();
  if (!db) {
    return {
      ok: false,
      message:
        "Le formulaire n’est pas encore relié à notre messagerie. Il sera actif à l’ouverture de la boutique.",
    };
  }
  const { name, email, subject, message } = parsed.data;
  const { error } = await db.from("contact_messages").insert({ name, email, subject, message });
  if (error) {
    console.error("contact:", error.message);
    return { ok: false, message: "Une erreur est survenue. Merci de réessayer plus tard." };
  }
  return {
    ok: true,
    message: "Merci, votre message a bien été transmis. Nous vous répondrons personnellement.",
  };
}
