"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return `${h >= 100 ? h : pad(h)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Horloge HH:MM:SS : temps restant avant `until`, ou temps écoulé depuis `since`. Rendue côté serveur puis mise à jour. */
export function Clock({ until, since, className }: { until?: string | null; since?: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const label = until ? "Temps restant" : "Durée";
  const value = now === null ? "--:--:--" : until ? hms(new Date(until).getTime() - now) : hms(now - new Date(since ?? now).getTime());
  return (
    <span role="timer" aria-label={label} className={className}>
      <span suppressHydrationWarning className="tabular-nums">{value}</span>
    </span>
  );
}
