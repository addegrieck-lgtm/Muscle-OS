"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Motion design de l'administration : chiffres qui défilent, anneaux et courbes qui se dessinent,
 * barres qui se remplissent — au moment où l'élément apparaît à l'écran. Tout est désactivé si
 * l'utilisateur préfère réduire les animations (valeur finale affichée immédiatement).
 */

const ease = (t: number) => 1 - Math.pow(1 - t, 4);

function reduced() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Progression 0 → 1 lancée quand l'élément entre dans l'écran. */
function useReveal<T extends Element>(duration = 1400, delay = 0) {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      setP(1);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setP(ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [duration, delay]);
  return [ref, p] as const;
}

export function AnimatedNumber({
  value,
  format = "int",
  suffix = "",
  delay = 0,
}: {
  value: number;
  format?: "int" | "decimal" | "euro" | "percent";
  suffix?: string;
  delay?: number;
}) {
  const [ref, p] = useReveal<HTMLSpanElement>(1600, delay);
  const v = value * p;
  const text =
    format === "euro"
      ? (v / 100).toLocaleString("fr-FR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        })
      : format === "percent"
        ? `${Math.round(v)} %`
        : format === "decimal"
          ? v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : Math.round(v).toLocaleString("fr-FR");
  return (
    <span ref={ref} className="tabular-nums">
      {text}
      {suffix}
    </span>
  );
}

/** Carte chiffre clé animée, avec évolution par rapport à la période précédente. */
export function KpiCard({
  label,
  value,
  previous,
  format = "int",
  delay = 0,
}: {
  label: string;
  value: number;
  previous?: number;
  format?: "int" | "decimal" | "euro" | "percent";
  delay?: number;
}) {
  const [ref, p] = useReveal<HTMLDivElement>(900, delay);
  const delta =
    previous === undefined
      ? null
      : previous === 0
        ? value > 0
          ? 100
          : 0
        : Math.round(((value - previous) / previous) * 100);
  return (
    <div
      ref={ref}
      style={{ opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}
      className="relative overflow-hidden border border-brun/10 bg-white/70 p-5"
    >
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne to-transparent"
        style={{ transform: `scaleX(${p})` }}
      />
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-brun/55">{label}</p>
      <p className="mt-2 font-serif text-4xl">
        <AnimatedNumber value={value} format={format} delay={delay} />
      </p>
      {delta !== null && (
        <p
          className={`mt-1 text-xs ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-brun/45"}`}
        >
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)} % vs période précédente
        </p>
      )}
    </div>
  );
}

/** Anneau de score 0–100, couleur selon la note. */
export function ScoreRing({
  score,
  size = 132,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const [ref, p] = useReveal<SVGSVGElement>(1800);
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#4d7c5a" : score >= 55 ? "#b08d57" : "#a4473a";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-brun/10"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (score / 100) * p)}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-serif text-4xl leading-none" style={{ color }}>
          {Math.round(score * p)}
        </p>
        {label && (
          <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-brun/50">{label}</p>
        )}
      </div>
    </div>
  );
}

/** Courbe de fréquentation : la ligne se dessine, l'aire apparaît, survol = valeur du jour. */
export function AreaChart({
  points,
  height = 220,
}: {
  points: { label: string; value: number; secondary?: number }[];
  height?: number;
}) {
  const [ref, p] = useReveal<SVGSVGElement>(2000);
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = height;
  const max = Math.max(1, ...points.map((x) => x.value));
  const step = points.length > 1 ? W / (points.length - 1) : W;
  const xy = (v: number, i: number) => [i * step, H - 24 - (v / max) * (H - 48)] as const;
  const line = points.map((pt, i) => `${i ? "L" : "M"}${xy(pt.value, i).join(",")}`).join(" ");
  const line2 = points
    .map((pt, i) => `${i ? "L" : "M"}${xy(pt.secondary ?? 0, i).join(",")}`)
    .join(" ");
  const area = `${line} L${(points.length - 1) * step},${H - 24} L0,${H - 24} Z`;
  const h = hover === null ? null : points[hover];
  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)),
              ),
            ),
          );
        }}
      >
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b08d57" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#b08d57" stopOpacity="0" />
          </linearGradient>
          <clipPath id="area-reveal">
            <rect x="0" y="0" width={W * p} height={H} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={24 + f * (H - 48)}
            y2={24 + f * (H - 48)}
            stroke="#44372e"
            strokeOpacity="0.07"
          />
        ))}
        <g clipPath="url(#area-reveal)">
          <path d={area} fill="url(#area-fill)" />
          <path
            d={line2}
            fill="none"
            stroke="#44372e"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={line}
            fill="none"
            stroke="#b08d57"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        {hover !== null && (
          <line
            x1={hover * step}
            x2={hover * step}
            y1="0"
            y2={H - 24}
            stroke="#44372e"
            strokeOpacity="0.25"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-2 -translate-x-1/2 border border-brun/10 bg-white px-3 py-2 text-xs shadow-sm"
          style={{ left: `${(hover! / Math.max(1, points.length - 1)) * 100}%` }}
        >
          <p className="font-medium">{h.label}</p>
          <p>{h.value.toLocaleString("fr-FR")} pages vues</p>
          {h.secondary !== undefined && (
            <p className="text-brun/60">{h.secondary.toLocaleString("fr-FR")} visiteurs</p>
          )}
        </div>
      )}
      <div className="mt-1 flex justify-between text-[0.65rem] text-brun/45">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Classement en barres horizontales qui se remplissent l'une après l'autre. */
export function BarList({
  items,
  unit = "",
}: {
  items: { label: string; value: number; href?: string }[];
  unit?: string;
}) {
  const [ref, p] = useReveal<HTMLUListElement>(1400);
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-sm text-brun/50">Pas encore de données.</p>;
  return (
    <ul ref={ref} className="space-y-2.5">
      {items.map((it, k) => {
        const local = Math.max(0, Math.min(1, p * 1.6 - k * 0.08));
        const label = it.href ? (
          <a href={it.href} target="_blank" rel="noreferrer" className="hover:underline">
            {it.label}
          </a>
        ) : (
          it.label
        );
        return (
          <li key={it.label} className="relative">
            <div
              className="absolute inset-y-0 left-0 bg-champagne/20"
              style={{ width: `${(it.value / max) * 100 * local}%` }}
            />
            <div className="relative flex justify-between gap-4 px-3 py-1.5 text-sm">
              <span className="truncate">{label}</span>
              <span className="tabular-nums text-brun/70">
                {Math.round(it.value * local).toLocaleString("fr-FR")}
                {unit}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Répartition (appareils, sources) : anneau segmenté animé + légende. */
export function Donut({ items }: { items: { label: string; value: number }[] }) {
  const [ref, p] = useReveal<SVGSVGElement>(1600);
  const total = items.reduce((s, i) => s + i.value, 0);
  const colors = ["#b08d57", "#44372e", "#c6b49a", "#7d8f7a", "#a4473a"];
  const r = 52;
  const c = 2 * Math.PI * r;
  let acc = 0;
  if (!total) return <p className="text-sm text-brun/50">Pas encore de données.</p>;
  return (
    <div className="flex items-center gap-6">
      <svg ref={ref} width="132" height="132" className="-rotate-90 shrink-0">
        {items.map((it, k) => {
          const frac = (it.value / total) * p;
          const el = (
            <circle
              key={it.label}
              cx="66"
              cy="66"
              r={r}
              fill="none"
              stroke={colors[k % colors.length]}
              strokeWidth="16"
              strokeDasharray={`${frac * c} ${c}`}
              strokeDashoffset={-acc * c}
            />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, k) => (
          <li key={it.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5" style={{ background: colors[k % colors.length] }} />
            <span>{it.label}</span>
            <span className="text-brun/55">{Math.round((it.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Apparition en cascade d'un bloc (cartes, lignes d'un tableau). */
export function Rise({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, p] = useReveal<HTMLDivElement>(800, delay);
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}
    >
      {children}
    </div>
  );
}
