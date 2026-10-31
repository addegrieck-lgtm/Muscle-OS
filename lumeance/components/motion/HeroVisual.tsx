"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { canUseWebGL } from "@/hooks/useReducedMotion";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/**
 * Visuel du hero : illustration vectorielle immédiate (aucun coût), remplacée en fondu par la
 * scène 3D une fois la page au repos, si WebGL est disponible et le mouvement autorisé.
 * Le rendu 3D s'arrête quand le hero sort de l'écran.
 */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [use3d, setUse3d] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !canUseWebGL()) return;
    setMobile(window.matchMedia("(max-width: 767px)").matches);
    const start = () => setUse3d(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(start, { timeout: 1800 })
      : window.setTimeout(start, 900);
    return () => {
      if (!w.requestIdleCallback) clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), {
      threshold: 0,
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      <div
        className={`absolute inset-0 transition-opacity duration-[1600ms] ${ready ? "opacity-0" : "opacity-100"}`}
      >
        <LuminaireArt
          form="cascade"
          seed="hero"
          framed={false}
          className="h-full w-full"
          label="Illustration d’un lustre en cascade"
        />
      </div>
      {use3d && (
        <div
          className={`absolute inset-0 transition-opacity duration-[1600ms] ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <HeroScene
            mobile={mobile}
            active={visible}
            onReady={() => setTimeout(() => setReady(true), 250)}
          />
        </div>
      )}
    </div>
  );
}
