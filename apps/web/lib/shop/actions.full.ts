"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OrderView, Quote } from "@vaeloria/types";
import { ApiError, SESSION_COOKIE, authedApi, safeNext, sessionCookieOptions } from "@/lib/session";

type CartItems = { productId: string; quantity: number }[];
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

const fail = (e: unknown): { ok: false; error: string; code?: string } =>
  e instanceof ApiError ? { ok: false, error: e.message, code: e.code } : { ok: false, error: "Service indisponible, réessaie dans un instant." };

/** Devis officiel calculé par l'API (prix, promotions, points). */
export async function quoteCart(items: CartItems): Promise<ActionResult<Quote>> {
  try {
    return { ok: true, data: await authedApi<Quote>("/api/v1/shop/quote", { method: "POST", body: { items } }) };
  } catch (e) {
    return fail(e);
  }
}

/** Crée la commande côté API et renvoie l'URL de la page de paiement du prestataire. */
export async function startCheckout(input: { items: CartItems; recipient: string; idempotencyKey: string }): Promise<ActionResult<{ paymentUrl: string; publicId: string }>> {
  try {
    const r = await authedApi<{ paymentUrl: string; publicId: string }>("/api/v1/shop/checkout", { method: "POST", body: input });
    return { ok: true, data: r };
  } catch (e) {
    return fail(e);
  }
}

export async function orderStatus(publicId: string): Promise<ActionResult<OrderView>> {
  try {
    return { ok: true, data: await authedApi<OrderView>(`/api/v1/shop/orders/${encodeURIComponent(publicId)}`) };
  } catch (e) {
    return fail(e);
  }
}

export async function linkMinecraft(_prev: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await authedApi<{ username: string }>("/api/v1/me/link", { method: "POST", body: { code: String(form.get("code") ?? "") } });
    return { ok: true, message: `Compte Minecraft ${r.username} lié.` };
  } catch (e) {
    return { ok: false, message: fail(e).error };
  }
}

/** Connexion sans Discord — développement uniquement (refusée par l'API en production). */
export async function devLogin(form: FormData): Promise<void> {
  if (process.env.DEV_LOGIN !== "1") redirect("/login");
  const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/internal/v1/auth/dev-login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-token": process.env.WEB_INTERNAL_TOKEN ?? "" },
    body: JSON.stringify({ name: String(form.get("name") ?? ""), referralCode: (await cookies()).get("vae_ref")?.value }),
  });
  if (!res.ok) redirect("/login?erreur=dev");
  const { token } = (await res.json()) as { token: string };
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(safeNext(String(form.get("next") ?? "")));
}
