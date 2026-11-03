/**
 * Balise Pinterest (mesure des conversions et audiences publicitaires). Elle ne se charge
 * qu'avec le consentement « publicité et réseaux sociaux » du visiteur (bandeau cookies) ; sans
 * accord, aucun appel n'est fait à Pinterest. Pas de correspondance avancée (e-mail) : le site ne
 * transmet aucune donnée personnelle à Pinterest.
 */
export const PINTEREST_TAG_ID = process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || "";

type Pintrk = ((...args: unknown[]) => void) & { queue?: unknown[]; version?: string };
declare global {
  interface Window {
    pintrk?: Pintrk;
  }
}

/** Charge la balise une seule fois (code de base fourni par Pinterest, sans e-mail). */
export function loadPinterest(): void {
  if (!PINTEREST_TAG_ID || typeof window === "undefined" || window.pintrk) return;
  const fn: Pintrk = (...args: unknown[]) => {
    fn.queue!.push(args);
  };
  fn.queue = [];
  fn.version = "3.0";
  window.pintrk = fn;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://s.pinimg.com/ct/core.js";
  document.head.appendChild(s);
  window.pintrk("load", PINTEREST_TAG_ID);
}

/** Événement Pinterest ; sans effet tant que la balise n'est pas chargée (pas de consentement). */
export function pinEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.pintrk) return;
  if (event === "page") window.pintrk("page");
  else if (data) window.pintrk("track", event, data);
  else window.pintrk("track", event);
}
