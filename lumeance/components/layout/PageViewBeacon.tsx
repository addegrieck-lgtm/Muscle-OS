"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Envoie une page vue à la mesure d'audience interne (sans cookie), à chaque changement de page. */
export function PageViewBeacon() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const referrer = first.current ? document.referrer : "";
    first.current = false;
    const body = JSON.stringify({ path: pathname, referrer });
    try {
      if (!navigator.sendBeacon?.("/api/stats", new Blob([body], { type: "application/json" })))
        void fetch("/api/stats", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
    } catch {
      /* mesure facultative */
    }
  }, [pathname]);
  return null;
}
