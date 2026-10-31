"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "lumeance.consent.v1";
const OPEN_EVENT = "lumeance:cookies";

export type Consent = { audience: boolean; at: string };

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

/**
 * Bandeau de consentement. Le site n'utilise aujourd'hui AUCUN traceur soumis à consentement
 * (pas de publicité, pas de mesure d'audience). Le choix est conservé pour l'activation future
 * d'une mesure d'audience : rien ne sera chargé sans accord (refus aussi simple que l'accord).
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const save = (audience: boolean) => {
    localStorage.setItem(KEY, JSON.stringify({ audience, at: new Date().toISOString() }));
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl border border-brun/10 bg-ivoire/95 p-5 text-brun shadow-[0_20px_60px_-20px_rgba(25,24,23,0.35)] backdrop-blur-md md:bottom-6 md:p-7"
    >
      <p className="t-eyebrow text-champagne">Cookies</p>
      <p className="t-small mt-3">
        Ce site n’utilise que des éléments strictement nécessaires (panier, préférences). Aucune
        mesure d’audience ni publicité n’est active. Si une mesure d’audience est ajoutée, elle ne
        sera activée qu’avec votre accord.{" "}
        <Link href="/confidentialite" className="underline underline-offset-4">
          En savoir plus
        </Link>
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => save(false)}
          className="t-eyebrow border border-brun/25 px-5 py-3 hover:border-brun"
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          className="t-eyebrow bg-brun px-5 py-3 text-ivoire hover:bg-noir"
        >
          Accepter
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="hover:text-ivoire"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      Gérer les cookies
    </button>
  );
}
