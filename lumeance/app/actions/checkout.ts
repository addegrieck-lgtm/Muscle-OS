"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { accountContext, getCurrentAccount } from "@/lib/services/account";
import { getProducts } from "@/lib/services/catalog";
import { getShippingSettings } from "@/lib/services/content";
import { priceCart } from "@/lib/services/pricing";
import { clientIp } from "@/lib/services/rate-limit";
import { allowRequest } from "@/lib/services/request-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { checkoutSchema } from "@/lib/validation/schemas";

export interface CheckoutState {
  ok: false;
  message: string;
  errors?: Record<string, string>;
  /** Champs saisis, renvoyés pour ne pas vider le formulaire en cas d'erreur. */
  values?: Record<string, string>;
}

const FIELD_LABELS: Record<string, string> = {
  email: "Adresse e-mail invalide.",
  phone: "Numéro de téléphone trop long.",
  first_name: "Prénom requis.",
  last_name: "Nom requis.",
  address_line_1: "Adresse requise.",
  address_line_2: "Complément d’adresse trop long.",
  postal_code: "Code postal invalide.",
  city: "Ville requise.",
  country: "Pays invalide.",
};

const fail = (message: string, errors?: Record<string, string>): CheckoutState => ({
  ok: false,
  message,
  errors,
});

/**
 * Commande en ligne :
 * 1. montants RECALCULÉS côté serveur à partir du catalogue et du compte connecté ;
 * 2. création atomique de la commande « en attente de paiement » (fonction SQL réservée au
 *    serveur) ;
 * 3. redirection vers la page de paiement Stripe. La commande ne devient « payée » qu'à
 *    réception du webhook signé (app/api/payments/webhook/[provider]).
 */
export async function startCheckout(
  _: CheckoutState | null,
  form: FormData,
): Promise<CheckoutState> {
  const state = await checkout(form);
  const values: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k !== "cart" && typeof v === "string") values[k] = v;
  return { ...state, values };
}

async function checkout(form: FormData): Promise<CheckoutState> {
  let provider;
  try {
    provider = getPaymentProvider();
  } catch {
    return fail("Le paiement en ligne n’est pas encore ouvert.");
  }
  const db = createSupabaseServiceClient();
  if (!db) return fail("Le paiement en ligne n’est pas encore ouvert.");

  if (
    !(await allowRequest(`checkout:${clientIp(await headers())}`, 10, 10 * 60_000, "FORMS_LIMITER"))
  )
    return fail("Trop de tentatives. Merci de réessayer dans quelques minutes.");

  let lines: unknown = [];
  try {
    lines = JSON.parse(String(form.get("cart") ?? "[]"));
  } catch {
    /* panier illisible : refusé par la validation */
  }
  const parsed = checkoutSchema.safeParse({
    email: form.get("email"),
    phone: form.get("phone") ?? "",
    address: {
      first_name: form.get("first_name"),
      last_name: form.get("last_name"),
      address_line_1: form.get("address_line_1"),
      address_line_2: form.get("address_line_2") ?? "",
      postal_code: form.get("postal_code"),
      city: form.get("city"),
      country: form.get("country") || "FR",
    },
    accept_cgv: form.get("accept_cgv") ?? "",
    lines,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] === "address" ? i.path[1] : i.path[0]);
      errors[key] ??= FIELD_LABELS[key] ?? i.message;
    }
    return fail(errors.lines ?? errors.accept_cgv ?? "Merci de vérifier le formulaire.", errors);
  }
  const d = parsed.data;

  const [catalog, shipping, account] = await Promise.all([
    getProducts(),
    getShippingSettings(),
    getCurrentAccount(),
  ]);
  if (shipping.countries.length && !shipping.countries.includes(d.address.country))
    return fail("Nous ne livrons pas encore ce pays.", { country: "Pays non desservi." });

  const quote = priceCart(d.lines, catalog, shipping, accountContext(account));
  if (quote.removed.length > 0 || quote.lines.length === 0)
    return fail("Votre panier a changé. Merci de le vérifier avant de payer.");
  if (quote.lines.some((l) => l.isDemo))
    return fail("Votre panier contient une pièce d’aperçu qui ne peut pas être commandée.");
  if (quote.shipping === null)
    return fail(
      "Les frais de livraison de cette commande doivent être confirmés : contactez-nous.",
    );
  if (quote.total < 50) return fail("Montant de commande invalide.");

  const email = account?.email || d.email;
  const items = quote.lines.map((l) => ({
    product_id: l.productId,
    name: l.name,
    reference: l.reference,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    total: l.total,
    variant:
      l.variantId || l.options
        ? { id: l.variantId, name: l.variantName, options: l.options }
        : null,
  }));
  const note = [
    ...quote.discounts.map((x) => `Remise : ${x.productId ? `offre ${x.label}` : x.label}`),
    d.phone ? `Téléphone : ${d.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: created, error } = await db.rpc("create_checkout_order", {
    p_customer_id: account?.customerId ?? null,
    p_email: email,
    p_first_name: d.address.first_name,
    p_last_name: d.address.last_name,
    p_phone: d.phone ?? "",
    p_address: { ...d.address, email, phone: d.phone },
    p_items: items,
    p_subtotal: quote.subtotal,
    p_shipping: quote.shipping,
    p_discount: quote.discount,
    p_total: quote.total,
    p_credit_id: quote.usedCreditId,
    p_note: note,
  });
  const order = (Array.isArray(created) ? created[0] : created) as
    { order_id: string; order_number: string } | undefined;
  if (error || !order) {
    console.error("checkout: create_checkout_order", error?.message);
    return fail("La commande n’a pas pu être enregistrée. Merci de réessayer.");
  }

  let redirectUrl: string;
  try {
    const session = await provider.createCheckoutSession({
      orderId: order.order_id,
      orderNumber: order.order_number,
      amount: quote.total,
      currency: "EUR",
      customerEmail: email,
      description: `LUMÉANCE — commande ${order.order_number}`,
      successUrl: `${siteUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/panier`,
      idempotencyKey: `checkout:${order.order_id}`,
    });
    redirectUrl = session.redirectUrl;
  } catch (e) {
    console.error("checkout: stripe", e instanceof Error ? e.message : e);
    await db.rpc("release_checkout_order", {
      p_order_id: order.order_id,
      p_failed: true,
      p_note: "Page de paiement non créée",
    });
    return fail("Le service de paiement est momentanément indisponible. Merci de réessayer.");
  }
  redirect(redirectUrl);
}
