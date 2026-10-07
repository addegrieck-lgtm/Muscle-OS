"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track, type TrackName } from "@/lib/track";

/**
 * Page vues + clics sur tout élément portant `data-track="click_discord"` etc.
 * Un seul écouteur délégué : aucun code à ajouter dans les composants serveur.
 */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view");
  }, [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (el?.dataset.track) track(el.dataset.track as TrackName, el.dataset.trackId ? { id: el.dataset.trackId } : undefined);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
