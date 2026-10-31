"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { LogoSymbol, Tagline, Wordmark } from "@/components/brand/Logo";
import { canUseWebGL } from "@/hooks/useReducedMotion";

const IntroScene = dynamic(() => import("./IntroScene"), { ssr: false });

import { INTRO_SEEN_KEY as SEEN } from "@/lib/intro";
const TOTAL_MS = 4600;

/**
 * Introduction cinématique (≈ 4,6 s), une fois par session, uniquement sur la page d'accueil.
 * - Désactivée si mouvement réduit, si déjà vue, ou via « Passer » / Échap.
 * - Sans WebGL : version CSS (halo + symbole).
 * - Le contenu de la page est rendu dessous : rien n'est bloqué, aucun impact SEO.
 * La décision d'afficher est prise avant le premier rendu (script dans <head>, classe intro-on)
 * pour éviter tout flash.
 */
export function Intro() {
  const [phase, setPhase] = useState<"off" | "play" | "leave">("off");
  const [webgl, setWebgl] = useState(false);
  const [mobile, setMobile] = useState(false);

  const finish = useCallback(() => {
    setPhase((p) => (p === "play" ? "leave" : p));
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {}
    setTimeout(() => {
      setPhase("off");
      document.documentElement.classList.remove("intro-on");
    }, 1100);
  }, []);

  useEffect(() => {
    if (!document.documentElement.classList.contains("intro-on")) return;
    setWebgl(canUseWebGL());
    setMobile(window.matchMedia("(max-width: 767px)").matches);
    setPhase("play");
    const t = setTimeout(finish, TOTAL_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  return (
    <div
      className={`intro-overlay fixed inset-0 z-[70] items-center justify-center overflow-hidden bg-noir transition-opacity duration-1000 ease-[var(--ease-silk)] ${
        phase === "leave" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={phase === "off"}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(168,138,98,0.22),transparent_60%)]" />
      {phase !== "off" && webgl && (
        <div className="absolute inset-0">
          <IntroScene mobile={mobile} />
        </div>
      )}
      <div className="relative flex flex-col items-center">
        <LogoSymbol className="intro-symbol h-40 w-40 md:h-52 md:w-52" title="LUMÉANCE" />
        <Wordmark className="intro-word mt-8 h-6 w-auto text-ivoire md:h-8" />
        <Tagline className="intro-tag mt-5 h-2 w-auto text-champagne md:h-2.5" />
      </div>
      <button
        type="button"
        onClick={finish}
        className="t-eyebrow absolute bottom-8 right-6 z-10 text-ivoire/60 transition-colors hover:text-ivoire md:bottom-10 md:right-10"
      >
        Passer l’introduction
      </button>
    </div>
  );
}
