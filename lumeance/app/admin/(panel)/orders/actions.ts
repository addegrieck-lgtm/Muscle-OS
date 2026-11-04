"use server";

import { accountDiscounts, type AccountContext } from "@/lib/catalog/loyalty";
import { ht } from "@/lib/catalog/tax";
import {
  PRO_DISCOUNT_MIN,
  PRO_DISCOUNT_MIN_LABEL,
  isOnPromotion,
  proDiscount,
} from "@/lib/catalog/pro";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { firstError } from "@/lib/admin/forms";
import { back, dbError } from "@/lib/admin/redirect";
import { formatPrice, parseEuroInput } from "@/lib/money";
import { canTransition } from "@/lib/services/orders";
import { getPaymentProvider } from "@/lib/payments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  manualOrderSchema,
  orderStatusChangeSchema,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/validation/schemas";

export async function changeOrderStatus(form: FormData) {
  await requireAdmin();
  const parsed = orderStatusChangeSchema.safeParse({
    orderId: form.get("orderId"),
    status: form.get("status"),
    note: form.get("note") ?? "",
  });
  if (!parsed.success) back("/admin/orders", { erreur: "Demande invalide." });
  const { orderId, status, note } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status, payment_status")
    .eq("id", orderId)
    .single();
  if (!order) back("/admin/orders", { erreur: "Commande introuvable." });
  if (!canTransition(order.status as OrderStatus, status, order.payment_status as PaymentStatus)) {
    back(`/admin/orders/${orderId}`, {
      erreur:
        "Ce changement de statut n’est pas autorisé (un paiement confirmé est requis pour préparer ou expédier).",
    });
  }
  // La note est transmise au déclencheur d'historique via un paramètre de transaction.
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note,
  });
  if (error) back(`/admin/orders/${orderId}`, { erreur: dbError("changeOrderStatus", error) });
  revalidatePath(`/admin/orders/${orderId}`);
  back(`/admin/orders/${orderId}`, { ok: "Statut mis à jour." });
}

export async function saveAdminNotes(form: FormData) {
  await requireAdmin();
  const orderId = z.string().uuid().parse(form.get("orderId"));
  const notes = z
    .string()
    .max(4000)
    .parse(String(form.get("admin_notes") ?? ""));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ admin_notes: notes || null })
    .eq("id", orderId);
  if (error) back(`/admin/orders/${orderId}`, { erreur: dbError("saveAdminNotes", error) });
  back(`/admin/orders/${orderId}`, { ok: "Notes enregistrées." });
}

export async function recordManualPayment(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const orderId = z.string().uuid().parse(form.get("orderId"));
  const amount = parseEuroInput(String(form.get("amount") ?? ""));
  const reference = z.string().trim().min(3).max(120).safeParse(form.get("reference"));
  if (!amount || !reference.success)
    back(`/admin/orders/${orderId}`, { erreur: "Montant ou référence de paiement invalide." });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_manual_payment", {
    p_order_id: orderId,
    p_amount: amount,
    p_reference: reference.data,
    p_note: String(form.get("note") ?? "").slice(0, 500) || null,
  });
  if (error) back(`/admin/orders/${orderId}`, { erreur: dbError("recordManualPayment", error) });
  back(`/admin/orders/${orderId}`, { ok: "Paiement enregistré." });
}

/**
 * Remboursement d'un paiement en ligne via le prestataire. Le montant remboursable est relu en
 * base (paiements confirmés − remboursements déjà faits) ; la clé d'idempotence empêche un double
 * remboursement en cas de double envoi du formulaire.
 */
export async function refundOnlinePayment(form: FormData) {
  const session = await requireAdmin(CATALOG_ROLES);
  const orderId = z.string().uuid().parse(form.get("orderId"));
  const page = `/admin/orders/${orderId}`;
  const amount = parseEuroInput(String(form.get("amount") ?? ""));
  if (!amount || amount <= 0) back(page, { erreur: "Montant de remboursement invalide." });
  const note = String(form.get("note") ?? "").slice(0, 500);

  let provider;
  try {
    provider = getPaymentProvider();
  } catch {
    back(page, { erreur: "Le paiement en ligne n’est pas configuré." });
  }
  const db = createSupabaseServiceClient();
  if (!db) back(page, { erreur: "Base de données non configurée." });
  const supabase = await createSupabaseServerClient();
  const { data: txs } = await supabase
    .from("payment_transactions")
    .select("kind, amount, provider, provider_reference, status")
    .eq("order_id", orderId)
    .eq("status", "succeeded");
  const online = (txs ?? []).filter((t) => t.kind === "payment" && t.provider === provider.name);
  const charge = online[0];
  if (!charge?.provider_reference)
    back(page, { erreur: "Aucun paiement en ligne à rembourser pour cette commande." });
  const paid = online.reduce((s, t) => s + Number(t.amount), 0);
  const refunded = (txs ?? [])
    .filter((t) => t.kind === "refund")
    .reduce((s, t) => s + Number(t.amount), 0);
  if (amount > paid - refunded)
    back(page, {
      erreur: `Montant supérieur au reste remboursable (${formatPrice(paid - refunded)}).`,
    });

  let reference: string;
  try {
    ({ reference } = await provider.refund(
      charge.provider_reference,
      amount,
      `refund:${orderId}:${refunded}:${amount}`,
    ));
  } catch (e) {
    console.error("refund:", e instanceof Error ? e.message : e);
    back(page, { erreur: "Le remboursement a été refusé par le prestataire de paiement." });
  }
  const { error } = await db.rpc("record_provider_refund", {
    p_order_id: orderId,
    p_provider: provider.name,
    p_amount: amount,
    p_reference: reference,
    p_recorded_by: session.userId,
    p_note: note,
  });
  if (error) back(page, { erreur: dbError("refundOnlinePayment", error) });
  revalidatePath(page);
  back(page, { ok: `Remboursement de ${formatPrice(amount)} effectué.` });
}

/** Commande manuelle : les prix sont TOUJOURS relus en base, jamais saisis. */
export async function createManualOrder(form: FormData) {
  await requireAdmin();
  // Chaque ligne : « idProduit » ou « idProduit:idVariante », avec sa quantité.
  const choices = form.getAll("line_item").map(String);
  const qtys = form.getAll("line_qty").map((q) => Number(q));
  const lines = choices
    .map((choice, i) => {
      const [productId = "", variantId = ""] = choice.split(":");
      return { productId, variantId: variantId || null, quantity: qtys[i] ?? 0 };
    })
    .filter((l) => l.productId && l.quantity > 0);
  const parsed = manualOrderSchema.safeParse({
    email: form.get("email"),
    first_name: form.get("first_name"),
    last_name: form.get("last_name"),
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
    lines,
    shipping_amount: parseEuroInput(String(form.get("shipping_amount") || "0")) ?? NaN,
    discount_amount: parseEuroInput(String(form.get("discount_amount") || "0")) ?? NaN,
    admin_notes: form.get("admin_notes") ?? "",
  });
  if (!parsed.success) back("/admin/orders/new", { erreur: firstError(parsed.error.issues) });
  const d = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, reference, price, compare_at_price, promotion, product_variants(id, name, sku, finish, price_adjustment, active)",
    )
    .in(
      "id",
      d.lines.map((l) => l.productId),
    );
  const items = [];
  const proLines: { total: number; onPromotion: boolean }[] = [];
  for (const l of d.lines) {
    const p = products?.find((x) => x.id === l.productId);
    if (!p) back("/admin/orders/new", { erreur: "Produit introuvable." });
    const v = l.variantId
      ? (
          p.product_variants as {
            id: string;
            name: string;
            sku: string;
            finish: string | null;
            price_adjustment: number;
            active: boolean;
          }[]
        ).find((x) => x.id === l.variantId)
      : null;
    if (l.variantId && !v)
      back("/admin/orders/new", { erreur: `Variante introuvable pour ${p.name}.` });
    const unit = Number(p.price) + Number(v?.price_adjustment ?? 0);
    items.push({
      product_id: p.id,
      product_name_snapshot: p.name,
      product_reference_snapshot: v?.sku ?? p.reference,
      unit_price: unit,
      quantity: l.quantity,
      variant_snapshot: v ? { id: v.id, name: v.name, sku: v.sku, finish: v.finish } : null,
      total: unit * l.quantity,
    });
    proLines.push({
      total: unit * l.quantity,
      onPromotion: isOnPromotion({
        promotion: p.promotion,
        price: Number(p.price),
        compareAtPrice: p.compare_at_price == null ? null : Number(p.compare_at_price),
      }),
    });
  }
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  // Remise professionnelle par paliers (−5/10/20 % dès 500/1 500/3 000 € HT de pièces), sur les
  // pièces hors promotion, ajoutée à la remise saisie. Case cochée sous le minimum : refus explicite plutôt qu'une remise ignorée.
  const wantsPro = form.get("pro_discount") === "on";
  if (wantsPro && ht(subtotal) < PRO_DISCOUNT_MIN)
    back("/admin/orders/new", {
      erreur: `Remise professionnelle : minimum ${PRO_DISCOUNT_MIN_LABEL} de pièces (commande : ${formatPrice(ht(subtotal))} HT).`,
    });
  const pro = wantsPro ? proDiscount(proLines) : { percent: 0, amount: 0 };
  if (pro.amount > 0) {
    d.discount_amount += pro.amount;
    d.admin_notes = [
      `Remise professionnelle −${pro.percent} % (palier : ${formatPrice(ht(subtotal))} HT de pièces, hors pièces en promotion) : ${formatPrice(pro.amount)} TTC.`,
      d.admin_notes,
    ]
      .filter(Boolean)
      .join("\n");
  }
  // Avantages du compte client en ligne (même e-mail) : remise pro si validée, Cercle,
  // parrainage — même calcul que le panier du site (lib/catalog/loyalty.ts).
  let usedCreditId: string | null = null;
  if (form.get("account_benefits") === "on") {
    if (wantsPro)
      back("/admin/orders/new", {
        erreur: "Choisissez soit la remise professionnelle manuelle, soit les avantages du compte.",
      });
    const { data: acc } = await supabase
      .from("customer_accounts")
      .select(
        "auth_user_id, customer_id, account_type, pro_status, referred_by, customers!inner(email)",
      )
      .eq("customers.email", d.email)
      .maybeSingle();
    if (!acc)
      back("/admin/orders/new", {
        erreur: "Aucun compte client en ligne pour cette adresse e-mail.",
      });
    const [{ data: paidOrders }, { data: credits }] = await Promise.all([
      supabase
        .from("orders")
        .select("total")
        .eq("customer_id", acc.customer_id)
        .in("payment_status", ["paid", "partially_refunded"]),
      supabase
        .from("referral_credits")
        .select("id, amount")
        .eq("account_id", acc.auth_user_id)
        .is("used_at", null)
        .order("created_at"),
    ]);
    const ctx: AccountContext =
      acc.account_type === "entreprise"
        ? { type: "entreprise", proApproved: acc.pro_status === "approved" }
        : {
            type: "particulier",
            spent: (paidOrders ?? []).reduce((s, o) => s + Number(o.total), 0),
            referredFirstOrder: Boolean(acc.referred_by) && (paidOrders ?? []).length === 0,
            credits: (credits ?? []).map((c) => ({ id: c.id, amount: Number(c.amount) })),
          };
    const res = accountDiscounts(proLines, subtotal - d.discount_amount, ctx);
    const total = res.discounts.reduce((s, x) => s + x.amount, 0);
    if (total > 0) {
      d.discount_amount += total;
      usedCreditId = res.usedCreditId;
      d.admin_notes = [
        `Avantages du compte : ${res.discounts.map((x) => `${x.label} ${formatPrice(x.amount)}`).join(" ; ")}.`,
        d.admin_notes,
      ]
        .filter(Boolean)
        .join("\n");
    }
  }
  if (d.discount_amount > subtotal + d.shipping_amount)
    back("/admin/orders/new", { erreur: "La remise dépasse le montant de la commande." });

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .upsert(
      { email: d.email, first_name: d.first_name, last_name: d.last_name, phone: d.phone },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (cErr) back("/admin/orders/new", { erreur: dbError("customer", cErr) });
  await supabase
    .from("customer_addresses")
    .insert({ ...d.address, customer_id: customer.id, address_type: "shipping" });

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      status: "draft",
      payment_status: "unpaid",
      payment_method: "manual",
      subtotal,
      shipping_amount: d.shipping_amount,
      discount_amount: d.discount_amount,
      total: subtotal + d.shipping_amount - d.discount_amount,
      shipping_address_snapshot: d.address,
      billing_address_snapshot: d.address,
      admin_notes: d.admin_notes,
    })
    .select("id")
    .single();
  if (oErr) back("/admin/orders/new", { erreur: dbError("order", oErr) });
  const { error: iErr } = await supabase
    .from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));
  if (iErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    back("/admin/orders/new", { erreur: dbError("order_items", iErr) });
  }
  if (usedCreditId) {
    await supabase
      .from("referral_credits")
      .update({ used_order_id: order.id, used_at: new Date().toISOString() })
      .eq("id", usedCreditId)
      .is("used_at", null);
  }
  back(`/admin/orders/${order.id}`, { ok: "Commande manuelle créée en brouillon." });
}
