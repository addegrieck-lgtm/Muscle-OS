"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, safeNext, sessionCookieOptions } from "@/lib/session";

/** `values` : champs renvoyés pour ne pas vider le formulaire après une erreur (jamais le mot de passe). */
export type AuthState = { error: string; field?: string; values?: { email?: string; displayName?: string; terms?: boolean } } | null;

/** Appel serveur → API interne (le jeton partagé ne quitte jamais le serveur du site). */
async function internal(path: string, body: Record<string, unknown>): Promise<{ ok: true; token: string } | { ok: false; error: string; field?: string }> {
  const h = await headers();
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/internal/v1/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-token": process.env.WEB_INTERNAL_TOKEN ?? "" },
      body: JSON.stringify({ ...body, userAgent: h.get("user-agent") ?? undefined, clientIp: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { token?: string; error?: { code?: string; message?: string; details?: { path: string; message: string }[] } } | null;
    if (res.ok && data?.token) return { ok: true, token: data.token };
    if (res.status === 429 && data?.error?.code !== "locked") return { ok: false, error: "Trop de tentatives depuis cette connexion. Réessaie plus tard." };
    const detail = data?.error?.details?.[0];
    return { ok: false, error: detail?.message ?? data?.error?.message ?? "Action impossible pour le moment.", field: detail?.path };
  } catch {
    return { ok: false, error: "Service indisponible, réessaie dans un instant." };
  }
}

async function openSession(token: string, next: string): Promise<never> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  jar.delete("vae_ref");
  redirect(safeNext(next));
}

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  const values = { email: String(form.get("email") ?? ""), displayName: String(form.get("displayName") ?? ""), terms: form.get("terms") === "on" };
  if (password !== String(form.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas.", field: "confirm", values };
  if (!values.terms) return { error: "Accepte le règlement et la politique de confidentialité pour créer ton compte.", field: "terms", values };
  const r = await internal("register", {
    email: String(form.get("email") ?? ""),
    password,
    displayName: String(form.get("displayName") ?? ""),
    referralCode: (await cookies()).get("vae_ref")?.value,
  });
  if (!r.ok) return { error: r.error, field: r.field, values };
  return openSession(r.token, String(form.get("next") ?? "/rejoindre"));
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const r = await internal("login", { email, password: String(form.get("password") ?? "") });
  if (!r.ok) return { error: r.error, values: { email } };
  return openSession(r.token, String(form.get("next") ?? "/compte"));
}

/** Active l'accès propriétaire avec le code défini au déploiement (ADMIN_SETUP_CODE de l'API). */
export async function claimAdminAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { error: "Connecte-toi d'abord." };
  const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/v1/me/claim-admin`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Session ${token}` },
    body: JSON.stringify({ code: String(form.get("code") ?? "") }),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { error: "Service indisponible, réessaie dans un instant." };
  if (res.status === 429) return { error: "Trop de tentatives. Réessaie dans une heure." };
  if (!res.ok) return { error: "Code invalide." };
  redirect("/compte?admin=1");
}
