/**
 * Mode « export statique » : HTML sans serveur ni API (GitHub Pages, Cloudflare Workers).
 * Pas de données en direct, pas de formulaire, pas d'analytics côté API.
 * Activé au build par NEXT_PUBLIC_PREVIEW=1 (voir next.config.ts).
 */
export const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";

/**
 * Le site peut-il être indexé ? Toujours en mode serveur ; en export statique seulement
 * si NEXT_PUBLIC_INDEXABLE=1 (site public sur Cloudflare). L'aperçu GitHub Pages reste
 * non indexé pour ne pas faire doublon.
 */
export const INDEXABLE = !PREVIEW || process.env.NEXT_PUBLIC_INDEXABLE === "1";
