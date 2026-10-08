"use client";

import { useEffect, useState } from "react";
import type { RankProgress, RankThreshold } from "@vaeloria/types";
import { RankProgressCard } from "./RankProgress";

/**
 * Progression du joueur connecté, chargée après l'affichage : la page boutique reste
 * entièrement en cache (CDN) et seule cette carte est personnalisée.
 */
export function MyProgress({ ranks, next = "/boutique" }: { ranks: RankThreshold[]; next?: string }) {
  const [state, setState] = useState<{ username: string | null; progress: RankProgress | null; loggedIn: boolean } | null>(null);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PREVIEW === "1") return setState({ username: null, progress: null, loggedIn: false });
    fetch("/api/me/progress", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { loggedIn: false }))
      .then((d) => setState({ username: d.username ?? null, progress: d.progress ?? null, loggedIn: Boolean(d.loggedIn) }))
      .catch(() => setState({ username: null, progress: null, loggedIn: false }));
  }, []);
  const loginHref = state?.loggedIn ? "/compte" : `/login?next=${encodeURIComponent(next)}`;
  return <RankProgressCard progress={state?.progress ?? null} ranks={ranks} username={state?.username} loginHref={process.env.NEXT_PUBLIC_PREVIEW === "1" ? undefined : loginHref} />;
}
