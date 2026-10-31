"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { firstError } from "@/lib/admin/forms";
import { back, dbError } from "@/lib/admin/redirect";
import { parseEuroInput } from "@/lib/money";
import { canTransition } from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
      "id, name, reference, price, product_variants(id, name, sku, finish, price_adjustment, active)",
    )
    .in(
      "id",
      d.lines.map((l) => l.productId),
    );
  const items = [];
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
  }
  const subtotal = items.reduce((s, i) => s + i.total, 0);
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
  back(`/admin/orders/${order.id}`, { ok: "Commande manuelle créée en brouillon." });
}
