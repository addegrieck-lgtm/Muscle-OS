/**
 * Résolution des conflits entre données locales et distantes.
 * Règle : par ligne, la version modifiée le plus récemment l'emporte (last-write-wins sur updatedAt).
 * Les versements ne sont jamais supprimés physiquement (statut « cancelled »), donc une fusion
 * ne peut pas faire disparaître silencieusement un versement : au pire elle change son statut,
 * et la version la plus récente de l'utilisateur est conservée.
 */
export interface Versioned {
  updatedAt: string; // ISO 8601 UTC
}

export function mergeRows<T extends Versioned>(
  local: readonly T[],
  remote: readonly T[],
  keyOf: (row: T) => string,
): { merged: T[]; toPush: T[]; toApplyLocally: T[] } {
  const remoteByKey = new Map(remote.map((r) => [keyOf(r), r]));
  const localByKey = new Map(local.map((l) => [keyOf(l), l]));
  const merged: T[] = [];
  const toPush: T[] = [];
  const toApplyLocally: T[] = [];

  for (const [key, l] of localByKey) {
    const r = remoteByKey.get(key);
    if (!r || l.updatedAt > r.updatedAt) {
      merged.push(l);
      toPush.push(l);
    } else if (r.updatedAt > l.updatedAt) {
      merged.push(r);
      toApplyLocally.push(r);
    } else {
      merged.push(l);
    }
  }
  for (const [key, r] of remoteByKey) {
    if (!localByKey.has(key)) {
      merged.push(r);
      toApplyLocally.push(r);
    }
  }
  return { merged, toPush, toApplyLocally };
}
