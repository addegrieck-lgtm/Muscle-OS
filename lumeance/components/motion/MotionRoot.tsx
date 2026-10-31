"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Révélations au défilement (GSAP) pour tous les éléments [data-reveal] de la page.
 * - data-reveal="up" (défaut) : fondu + montée ; "fade" : fondu ; "mask" : dévoilement par masque
 * - data-reveal-delay="0.2" : délai en secondes
 * - [data-parallax="0.15"] : parallaxe verticale légère (ScrollTrigger)
 * GSAP est chargé à la demande ; si le mouvement est réduit, rien n'est animé.
 */
export function MotionRoot() {
  const pathname = usePathname();

  useEffect(() => {
    if (!document.documentElement.classList.contains("js-motion")) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const mods = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).catch(
        () => null,
      );
      if (!mods) {
        // Échec de chargement : on affiche tout plutôt que de laisser du contenu masqué.
        document.documentElement.classList.remove("js-motion");
        return;
      }
      const [{ gsap }, { ScrollTrigger }] = mods;
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"),
      );
      // Un élément masqué par clip-path n'intersecte jamais : on observe alors son parent.
      const targets = new Map<Element, HTMLElement[]>();
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            io.unobserve(e.target);
            for (const el of targets.get(e.target) ?? []) {
              el.dataset.revealed = "1";
              const delay = Number(el.dataset.revealDelay ?? 0);
              if (el.dataset.reveal === "mask") {
                gsap.fromTo(
                  el,
                  { clipPath: "inset(100% 0% 0% 0%)" },
                  {
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: 1.6,
                    ease: "expo.out",
                    delay,
                    onComplete: () => void (el.style.clipPath = "none"),
                  },
                );
              } else {
                gsap.to(el, { opacity: 1, y: 0, x: 0, duration: 1.3, ease: "expo.out", delay });
              }
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      els.forEach((el) => {
        const target = el.dataset.reveal === "mask" && el.parentElement ? el.parentElement : el;
        targets.set(target, [...(targets.get(target) ?? []), el]);
        io.observe(target);
      });

      const ctx = gsap.context(() => {
        document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
          const k = Number(el.dataset.parallax) || 0.15;
          gsap.fromTo(
            el,
            { yPercent: -k * 50 },
            {
              yPercent: k * 50,
              ease: "none",
              scrollTrigger: {
                trigger: el.parentElement ?? el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      });

      cleanup = () => {
        io.disconnect();
        ctx.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [pathname]);

  return null;
}
