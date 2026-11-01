"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** WebGL disponible, appareil suffisamment puissant et connexion assez rapide pour une scène 3D
 * (environ 1 Mo de JavaScript à télécharger) ; sinon, l'illustration vectorielle reste affichée. */
export function canUseWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    if (nav.connection?.saveData) return false;
    if (["slow-2g", "2g", "3g"].includes(nav.connection?.effectiveType ?? "")) return false;
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return false;
    return true;
  } catch {
    return false;
  }
}
