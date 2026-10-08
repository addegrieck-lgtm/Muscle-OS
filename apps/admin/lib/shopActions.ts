"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApi } from "./api";

export type FormState = { error: string } | null;
const euros = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? "").replace(",", ".")) * 100);
const intOrNull = (v: FormDataEntryValue | null) => (String(v ?? "").trim() === "" ? null : Number(v));
const isoOrNull = (v: FormDataEntryValue | null) => (String(v ?? "").trim() === "" ? null : new Date(String(v)).toISOString());

export async function saveProduct(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const pointsMode = String(form.get("pointsMode"));
  const body = {
    name: form.get("name"),
    slug: form.get("slug"),
    categoryId: form.get("categoryId"),
    shortDescription: form.get("shortDescription") ?? "",
    description: form.get("description") ?? "",
    priceCents: euros(form.get("price")),
    points: pointsMode === "custom" ? intOrNull(form.get("points")) : null,
    imageUrl: String(form.get("imageUrl") ?? "").trim() || null,
    stock: intOrNull(form.get("stock")),
    active: form.get("active") === "on",
    sortOrder: Number(form.get("sortOrder") || 0),
    deliveryType: form.get("deliveryType"),
    deliveries: JSON.parse(String(form.get("deliveries") || "[]")),
  };
  try {
    await adminApi(id ? `/shop/products/${id}` : "/shop/products", { method: id ? "PUT" : "POST", body });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/shop/products");
  redirect("/shop/products");
}

export async function deleteProduct(id: string) {
  await adminApi(`/shop/products/${id}`, { method: "DELETE" });
  revalidatePath("/shop/products");
}

export async function savePromotion(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const kind = String(form.get("kind"));
  const target = String(form.get("target") ?? "all");
  const [targetType, targetId] = target === "all" ? ["all", null] : target.split(":");
  const raw = String(form.get("value") ?? "");
  const body = {
    name: form.get("name"),
    label: String(form.get("label") ?? "").trim() || null,
    kind,
    value: kind === "fixed" ? euros(raw) : Number(raw),
    targetType,
    targetId,
    startsAt: isoOrNull(form.get("startsAt")) ?? new Date().toISOString(),
    endsAt: isoOrNull(form.get("endsAt")),
    active: form.get("active") === "on",
  };
  try {
    await adminApi(id ? `/shop/promotions/${id}` : "/shop/promotions", { method: id ? "PUT" : "POST", body });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/shop/promotions");
  redirect("/shop/promotions");
}

export async function deletePromotion(id: string) {
  await adminApi(`/shop/promotions/${id}`, { method: "DELETE" });
  revalidatePath("/shop/promotions");
}

export async function saveRank(key: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const body = {
    key: form.get("key"),
    name: form.get("name"),
    minPoints: Number(form.get("minPoints")),
    position: Number(form.get("position")),
    productId: String(form.get("productId") ?? "") || null,
    color: String(form.get("color") ?? "") || null,
    perks: String(form.get("perks") ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
    active: form.get("active") === "on",
  };
  try {
    await adminApi(key ? `/shop/ranks/${key}` : "/shop/ranks", { method: key ? "PUT" : "POST", body });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/shop/ranks");
  return null;
}

export async function syncRanks() {
  await adminApi("/shop/ranks/sync", { method: "POST" });
  revalidatePath("/shop/ranks");
}

export async function reviewRank(uuid: string, rankKey: string, decision: "keep" | "revoke") {
  await adminApi("/shop/ranks/reviews", { method: "POST", body: { uuid, rankKey, decision } });
  revalidatePath("/shop/ranks");
}

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminApi("/shop/settings", { method: "PUT", body: { pointsPerEuro: Number(String(form.get("pointsPerEuro")).replace(",", ".")) } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/shop/ranks");
  return null;
}

export async function refundOrder(publicId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminApi(`/shop/orders/${publicId}/refund`, { method: "POST", body: { amountCents: euros(form.get("amount")), reason: form.get("reason") } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/shop/orders/${publicId}`);
  return null;
}

export async function refulfillOrder(publicId: string) {
  await adminApi(`/shop/orders/${publicId}/fulfill`, { method: "POST" });
  revalidatePath(`/shop/orders/${publicId}`);
}

export async function retryDelivery(id: string) {
  await adminApi(`/shop/deliveries/${id}/retry`, { method: "POST" });
  revalidatePath("/shop/deliveries");
}

export async function adjustPoints(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminApi("/shop/points/adjust", { method: "POST", body: { uuid: form.get("uuid"), delta: Number(form.get("delta")), label: form.get("label") } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { error: "" };
}

export async function saveCategory(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminApi(`/shop/categories/${id}`, {
      method: "PUT",
      body: {
        name: form.get("name"), description: form.get("description") ?? "", position: Number(form.get("position") || 0), active: form.get("active") === "on",
        seoTitle: String(form.get("seoTitle") ?? "") || null, seoDescription: String(form.get("seoDescription") ?? "") || null,
      },
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/shop/categories");
  return null;
}
