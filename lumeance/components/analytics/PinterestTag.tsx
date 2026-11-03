"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "@/components/layout/CookieConsent";
import { loadPinterest, pinEvent, PINTEREST_TAG_ID } from "@/lib/analytics/pinterest";

/** Charge la balise Pinterest après consentement, puis signale chaque page vue. */
export function PinterestTag() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(Boolean(readConsent()?.marketing));
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!allowed || !PINTEREST_TAG_ID) return;
    loadPinterest();
    pinEvent("page");
    if (pathname.startsWith("/produit/")) pinEvent("pagevisit", { property: pathname });
  }, [allowed, pathname]);

  return null;
}
