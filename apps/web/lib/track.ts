"use client";

/**
 * Mesure d'audience first-party, sans cookie, sans IP, sans outil tiers.
 * Identifiant visiteur aléatoire (localStorage), refus respecté (opt-out, Do Not Track, GPC).
 * Les événements sont envoyés au site (/api/track) qui les relaie à l'API côté serveur.
 */
export type TrackName = "page_view" | "copy_ip" | "click_play" | "click_discord" | "click_leaderboard" | "beta_signup" | "shop_view";

const OPT_OUT_KEY = "vae-analytics-optout";

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function analyticsDisabled(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return storage("local")?.getItem(OPT_OUT_KEY) === "1" || nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

export function setAnalyticsOptOut(optOut: boolean) {
  const s = storage("local");
  if (optOut) s?.setItem(OPT_OUT_KEY, "1");
  else s?.removeItem(OPT_OUT_KEY);
}

function visitorId(): string | undefined {
  const s = storage("local");
  if (!s) return undefined;
  let id = s.getItem("vae-vid");
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
    s.setItem("vae-vid", id);
  }
  return id;
}

/** Les paramètres UTM de la page d'arrivée sont conservés pour toute la session. */
function utm(): Record<string, string> | undefined {
  const s = storage("session");
  const params = new URLSearchParams(window.location.search);
  const fromUrl: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign", "content"]) {
    const v = params.get(`utm_${k}`);
    if (v) fromUrl[k] = v.slice(0, 100);
  }
  if (Object.keys(fromUrl).length > 0) {
    s?.setItem("vae-utm", JSON.stringify(fromUrl));
    return fromUrl;
  }
  const saved = s?.getItem("vae-utm");
  return saved ? (JSON.parse(saved) as Record<string, string>) : undefined;
}

export function track(name: TrackName) {
  // Aperçu statique : aucun serveur pour recevoir les événements.
  if (process.env.NEXT_PUBLIC_PREVIEW === "1" || typeof window === "undefined" || analyticsDisabled()) return;
  const payload = JSON.stringify({
    name,
    path: window.location.pathname,
    visitorId: visitorId(),
    referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined,
    utm: utm(),
  });
  if (!navigator.sendBeacon?.("/api/track", payload)) {
    void fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
  }
}
