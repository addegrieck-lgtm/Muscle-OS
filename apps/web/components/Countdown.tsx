"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { j: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), min: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Compte à rebours. Rendu serveur avec la valeur initiale, puis mis à jour chaque seconde. */
export function Countdown({ target, label }: { target: string; label?: string }) {
  const end = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const p = parts(end - (now ?? end));
  const cells = now === null ? null : ([["j", p.j], ["h", p.h], ["min", p.min], ["s", p.s]] as const);
  return (
    <div role="timer" aria-label={label ?? "Temps restant"} className="flex gap-2 sm:gap-3">
      {(cells ?? ([["j", "–"], ["h", "–"], ["min", "–"], ["s", "–"]] as const)).map(([u, v]) => (
        <div key={u} className="metal-border min-w-16 rounded-lg px-3 py-2 text-center">
          <div className="text-2xl font-bold tabular-nums sm:text-3xl">{typeof v === "number" ? String(v).padStart(2, "0") : v}</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{u}</div>
        </div>
      ))}
    </div>
  );
}
