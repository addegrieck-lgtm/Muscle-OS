"use client";

import { useCallback, useEffect, useState } from "react";
import type { MyWorld } from "@vaeloria/types";

export type MyWorldState =
  | { status: "loading" }
  | { status: "unavailable" } // aperçu statique ou service indisponible
  | { status: "anonymous" }
  | { status: "ready"; data: MyWorld & { displayName: string | null; minecraft: string | null } };

/** État personnel (fondateur, empire, votes) chargé après l'affichage : les pages restent en cache. */
export function useMyWorld(): [MyWorldState, () => void] {
  const [state, setState] = useState<MyWorldState>({ status: "loading" });
  const load = useCallback(() => {
    if (process.env.NEXT_PUBLIC_PREVIEW === "1") return setState({ status: "unavailable" });
    fetch("/api/world/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return setState({ status: "anonymous" });
        if (!r.ok) return setState({ status: "unavailable" });
        const data = await r.json();
        setState(data.anonymous ? { status: "anonymous" } : { status: "ready", data });
      })
      .catch(() => setState({ status: "unavailable" }));
  }, []);
  useEffect(load, [load]);
  return [state, load];
}

/** Action joueur (créer, rejoindre, voter…). Renvoie le message d'erreur lisible le cas échéant. */
export async function worldAction(path: string, body: object, method: "POST" | "PATCH" = "POST"): Promise<{ ok: true; data: unknown } | { ok: false; error: string; code?: string }> {
  try {
    const r = await fetch(`/api/world/${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = r.status === 204 ? null : await r.json().catch(() => null);
    if (r.ok) return { ok: true, data };
    return { ok: false, error: data?.error?.message ?? "Action impossible pour le moment.", code: data?.error?.code };
  } catch {
    return { ok: false, error: "Service indisponible, réessaie dans un instant." };
  }
}

export const loginHref = (next: string, signup = false) => `/login?next=${encodeURIComponent(next)}${signup ? "&mode=inscription" : ""}`;
