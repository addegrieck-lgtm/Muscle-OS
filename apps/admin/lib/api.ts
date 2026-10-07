import "server-only";

const BASE = process.env.API_URL ?? "http://localhost:4000";

/** Appels admin côté serveur : le jeton ne quitte jamais le serveur Next. */
export async function adminApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}/admin/v1${path}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${process.env.ADMIN_API_TOKEN ?? ""}`, ...(init.body !== undefined ? { "content-type": "application/json" } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : null,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; details?: { path: string; message: string }[] } } | null;
    const details = body?.error?.details?.map((d) => `${d.path} : ${d.message}`).join(", ");
    throw new Error(`${body?.error?.message ?? res.statusText}${details ? ` (${details})` : ""}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}
