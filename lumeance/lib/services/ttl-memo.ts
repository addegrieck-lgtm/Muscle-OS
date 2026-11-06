/**
 * Mémoire courte, partagée par les requêtes d'une même instance du serveur (Cloudflare garde
 * une instance active plusieurs minutes) : évite de relire la base à chaque visite pour des
 * données publiques qui changent rarement. Une erreur n'est jamais gardée en mémoire.
 * Conséquence : une modification faite dans l'administration apparaît sur le site public après
 * au plus `ttlMs` (60 s par défaut).
 */
const store = new Map<string, { until: number; value: Promise<unknown> }>();

export const PUBLIC_DATA_TTL_MS = 60_000;

export function memo<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs = PUBLIC_DATA_TTL_MS,
  now = Date.now(),
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.until > now) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { until: now + ttlMs, value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}

/** Vide la mémoire (tests, ou après une modification faite sur cette même instance). */
export function forget(prefix = ""): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
