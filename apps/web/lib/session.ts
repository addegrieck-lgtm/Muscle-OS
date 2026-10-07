import "server-only";
import { cookies } from "next/headers";
import type { Me } from "@vaeloria/types";

export const SESSION_COOKIE = "vae_session";
const API = () => process.env.API_URL ?? "http://localhost:4000";

/** Jeton de session (cookie HttpOnly posé par le site, jamais lisible en JavaScript). */
export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

/** Appel API authentifié, côté serveur uniquement. */
export async function authedApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await sessionToken();
  const res = await fetch(`${API()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Session ${token}` } : {}),
      ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : null,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ApiError(res.status, b?.error?.code ?? "error", b?.error?.message ?? res.statusText, b?.error?.details);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export async function getMe(): Promise<Me | null> {
  if (!(await sessionToken())) return null;
  try {
    return await authedApi<Me>("/api/v1/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/** N'accepte qu'un chemin interne (évite les redirections ouvertes après connexion). */
export function safeNext(next: string | null | undefined, fallback = "/compte"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
