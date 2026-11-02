"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import type { HomeContent } from "@/types/catalog";

export interface HeroSlide {
  slug: string;
  name: string;
  category: string;
  image: string;
}

/**
 * Tête de page : les pièces phares en grand (visualisation 3D), qui se succèdent toutes les 7 s,
 * et un interrupteur pour allumer ou éteindre la pièce. Défilement suspendu au survol, au clavier
 * et si l'utilisateur préfère réduire les animations.
 */
export function HeroShowcase({ content, slides }: { content: HomeContent; slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [on, setOn] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => window.clearInterval(t);
  }, [paused, slides.length]);

  const cur = slides[i]!;
  return (
    <section
      className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-noir text-ivoire md:items-center"
      aria-labelledby="hero-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_68%_40%,#3b2f26_0%,#1f1b18_55%,#141312_100%)]" />

      {/* Pièce phare : plein cadre atténué sur mobile, moitié droite sur grand écran. */}
      <div className="absolute inset-0 -z-10 opacity-60 md:left-[36%] md:opacity-100 md:[mask-image:linear-gradient(to_right,transparent,black_30%)]">
        {slides.map((s, k) => (
          <div
            key={s.slug}
            aria-hidden={k !== i}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-[var(--ease-luxe)] ${k === i ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={s.image}
              alt=""
              fill
              priority={k === 0}
              sizes="(min-width: 768px) 58vw, 100vw"
              className={`object-cover object-top transition-[filter] duration-[1200ms] ease-[var(--ease-luxe)] ${on ? "" : "brightness-[0.22] saturate-[0.35]"}`}
            />
          </div>
        ))}
        <div
          className={`glow-breathe pointer-events-none absolute left-1/2 top-[30%] h-[60vmax] w-[60vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,214,150,0.14),transparent_62%)] transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-noir via-noir/40 to-transparent md:bg-gradient-to-r md:from-noir md:via-noir/50 md:to-transparent" />

      <div className="container-luxe pb-24 pt-40 md:pb-0 md:pt-24">
        <div className="max-w-xl">
          <p data-reveal="fade" className="t-eyebrow text-champagne">
            Maison française de luminaires
          </p>
          <h1
            id="hero-title"
            data-reveal
            data-reveal-delay="0.1"
            className="t-display mt-6 -ml-[0.06em]"
          >
            {content.heroTitle}
          </h1>
          <p
            data-reveal
            data-reveal-delay="0.25"
            className="mt-6 font-serif text-2xl italic text-champagne-clair md:text-[2rem]"
          >
            {content.heroSignature}
          </p>
          <p data-reveal data-reveal-delay="0.4" className="mt-6 max-w-md text-ivoire/75">
            {content.heroText}
          </p>
          <p data-reveal data-reveal-delay="0.45" className="t-eyebrow mt-4 text-champagne-clair">
            Luminaires d’exception · livraison offerte
          </p>
          <div
            data-reveal
            data-reveal-delay="0.55"
            className="mt-10 flex flex-wrap items-center gap-6"
          >
            <ButtonLink href={`/produit/${cur.slug}`} variant="outline-light">
              Découvrir {cur.name}
            </ButtonLink>
            <Link
              href="/collections"
              className="t-eyebrow text-ivoire/70 underline-offset-8 hover:underline"
            >
              Toute la collection
            </Link>
          </div>

          <div
            data-reveal
            data-reveal-delay="0.7"
            className="mt-14 flex flex-wrap items-center gap-8"
          >
            {/* Interrupteur : allume ou éteint la pièce. */}
            <button
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => setOn((v) => !v)}
              className="group flex items-center gap-3"
            >
              <span
                className={`relative h-6 w-11 rounded-full border transition-colors duration-500 ${on ? "border-champagne bg-champagne/30" : "border-ivoire/30 bg-transparent"}`}
              >
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-500 ${on ? "left-[1.4rem] bg-champagne shadow-[0_0_14px_rgba(255,214,150,0.9)]" : "left-1 bg-ivoire/50"}`}
                />
              </span>
              <span className="t-eyebrow text-ivoire/70">{on ? "Allumé" : "Éteint"}</span>
            </button>

            {slides.length > 1 && (
              <div className="flex items-center gap-3" role="tablist" aria-label="Pièces phares">
                {slides.map((s, k) => (
                  <button
                    key={s.slug}
                    type="button"
                    role="tab"
                    aria-selected={k === i}
                    aria-label={s.name}
                    onClick={() => setI(k)}
                    className={`h-px transition-all duration-500 ${k === i ? "w-12 bg-champagne" : "w-6 bg-ivoire/30 hover:bg-ivoire/60"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="t-eyebrow absolute bottom-8 right-6 hidden text-[0.62rem] text-ivoire/55 md:block">
        {cur.category} · {cur.name} — visualisation 3D
      </p>
    </section>
  );
}
