/**
 * Après un déploiement, une page restée ouverte (ou servie juste avant la bascule) peut demander
 * un fichier JavaScript qui n'existe plus : « ChunkLoadError ». Recharger la page récupère la
 * nouvelle version. Un seul rechargement par minute, pour ne jamais boucler.
 */
const KEY = "lumeance.chunk-reload";

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return (
    name === "ChunkLoadError" ||
    (typeof message === "string" &&
      /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        message,
      ))
  );
}

/** Recharge la page si l'erreur vient d'un fichier introuvable ; renvoie true si c'est le cas. */
export function reloadOnChunkError(error: unknown, now = Date.now()): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0;
    if (now - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    /* stockage indisponible : on recharge quand même, une fois par affichage */
  }
  window.location.reload();
  return true;
}
