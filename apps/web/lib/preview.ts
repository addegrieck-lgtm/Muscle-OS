/**
 * Mode « aperçu statique » (GitHub Pages) : export HTML sans serveur ni API.
 * Pas de données en direct, pas de formulaire, pas d'analytics, et non indexé.
 * Activé au build par NEXT_PUBLIC_PREVIEW=1 (voir next.config.ts).
 */
export const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";
