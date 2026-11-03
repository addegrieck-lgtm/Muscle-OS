"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PINTEREST_TAG_ID } from "@/lib/analytics/pinterest";

// v2 : ajout du choix « publicité et réseaux sociaux » (balise Pinterest) ; les choix v1 ne
// couvraient pas ce traceur, le bandeau est donc présenté de nouveau.
const KEY = "lumeance.consent.v2";

/**
 * Bandeau requis dès qu'un traceur soumis à consentement est actif : aujourd'hui la balise
 * Pinterest (publicité et réseaux sociaux), si son identifiant est configuré.
 */
export const CONSENT_REQUIRED = Boolean(PINTEREST_TAG_ID);
const OPEN_EVENT = "lumeance:cookies";
/** Émis à chaque enregistrement du choix : les traceurs autorisés se chargent aussitôt. */
export const CONSENT_EVENT = "lumeance:consent";

export type Consent = { audience: boolean; marketing: boolean; at: string };

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

/**
 * Bandeau de consentement (recommandations CNIL) : refus aussi simple que l'accord, rien n'est
 * chargé avant le choix, choix modifiable à tout moment (« Gérer les cookies » du pied de page),
 * conservé 6 mois puis redemandé.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!CONSENT_REQUIRED) return;
    const c = readConsent();
    const expired = c && Date.now() - new Date(c.at).getTime() > 182 * 24 * 3600 * 1000;
    if (!c || expired) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const save = (accept: boolean) => {
    const c: Consent = { audience: false, marketing: accept, at: new Date().toISOString() };
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* stockage indisponible : le choix vaut pour la visite en cours */
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setOpen(false);
    // Retrait du consentement : la balise déjà chargée cesse d'être utilisée au rechargement.
    if (!accept && window.pintrk) window.location.reload();
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
        Avec votre accord, nous utilisons la balise de Pinterest pour mesurer l’efficacité de nos
        publications et vous proposer nos pièces sur Pinterest. Le panier et vos préférences,
        strictement nécessaires, ne demandent pas d’accord. Vous pouvez changer d’avis à tout moment
        depuis « Gérer les cookies », en bas de page.{" "}
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
          Tout refuser
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          className="t-eyebrow bg-brun px-5 py-3 text-ivoire hover:bg-noir"
        >
          Tout accepter
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  if (!CONSENT_REQUIRED) return null;
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
