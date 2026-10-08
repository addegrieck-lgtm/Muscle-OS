"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { MapData, ZoneKind } from "@vaeloria/types";
import { Badge, buttonClass, cn } from "@vaeloria/ui";

type Filter = "tout" | "empires" | "guerres" | "koth" | "evenements";
const FILTERS: [Filter, string][] = [["tout", "Tout"], ["empires", "Empires"], ["guerres", "Guerres"], ["koth", "KOTH"], ["evenements", "Événements"]];

const ZONE: Record<ZoneKind, { fill: string; stroke: string; dash?: string; label: string; layer: Filter[] }> = {
  neutral: { fill: "rgb(169 174 184 / 0.04)", stroke: "#3a3d45", dash: "40 30", label: "Zone neutre", layer: ["tout", "empires", "guerres", "koth", "evenements"] },
  spawn: { fill: "rgb(255 255 255 / 0.07)", stroke: "#c3c7cf", label: "Spawn", layer: ["tout", "empires", "guerres", "koth", "evenements"] },
  koth: { fill: "rgb(210 31 47 / 0.16)", stroke: "#d21f2f", label: "KOTH", layer: ["tout", "koth"] },
  warzone: { fill: "url(#vae-hatch)", stroke: "#a3121e", label: "Zone de guerre", layer: ["tout", "guerres"] },
  event: { fill: "rgb(239 68 80 / 0.06)", stroke: "#ef4450", dash: "24 18", label: "Zone d'événement", layer: ["tout", "evenements"] },
  outpost: { fill: "rgb(195 199 207 / 0.08)", stroke: "#8b909b", label: "Outpost", layer: ["tout", "koth", "guerres"] },
};

/**
 * Carte géopolitique stylisée. Coordonnées = blocs Minecraft (X vers l'est, Z vers le sud).
 * Zones : configurées dans l'admin. Territoires : claims des empires, synchronisés par VæloriaBridge.
 */
export function WorldMap({ data: all, compact = false, initialFilter = "tout" }: { data: MapData; compact?: boolean; initialFilter?: Filter }) {
  const worlds = all.worlds?.length ? all.worlds : [{ key: "vaeloria", name: "VÆLORIA", chunks: 0 }];
  // Plusieurs mondes Minecraft : un onglet par monde ; zones et territoires filtrés sur le monde affiché.
  const [world, setWorld] = useState(worlds[0]!.key);
  const data = useMemo(
    () => ({ ...all, zones: all.zones.filter((z) => (z.world ?? "vaeloria") === world), territories: all.territories.filter((t) => (t.world ?? "vaeloria") === world) }),
    [all, world],
  );
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, z: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ x: number; z: number; px: number; py: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const R = data.radius;
  const span = (2 * R) / zoom;
  const view = `${center.x - span / 2} ${center.z - span / 2} ${span} ${span}`;
  const zone = data.zones.find((z) => z.key === selected) ?? null;
  const liveByZone = useMemo(() => new Map(data.liveEvents.filter((e) => e.zoneKey).map((e) => [e.zoneKey!, e])), [data.liveEvents]);
  const empires = useMemo(() => {
    const m = new Map<string, { name: string; color: string; chunks: number }>();
    for (const t of data.territories) m.set(t.slug, { name: t.name, color: t.color, chunks: (m.get(t.slug)?.chunks ?? 0) + t.chunks });
    return [...m.entries()].sort((a, b) => b[1].chunks - a[1].chunks);
  }, [data.territories]);
  const showTerritories = filter === "tout" || filter === "empires" || filter === "guerres";

  function onPointerDown(e: React.PointerEvent) {
    if (compact) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: center.x, z: center.z, px: e.clientX, py: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !svg.current) return;
    const scale = span / svg.current.getBoundingClientRect().width;
    const clamp = (v: number) => Math.max(-R, Math.min(R, v));
    setCenter({ x: clamp(drag.current.x - (e.clientX - drag.current.px) * scale), z: clamp(drag.current.z - (e.clientY - drag.current.py) * scale) });
  }

  return (
    <div className={cn("grid gap-4", !compact && "lg:grid-cols-[1fr_300px]")}>
      <div>
        {!compact && worlds.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-line/60 pb-3" role="tablist" aria-label="Mondes">
            {worlds.map((w) => (
              <button key={w.key} type="button" role="tab" aria-selected={world === w.key}
                onClick={() => { setWorld(w.key); setSelected(null); setZoom(1); setCenter({ x: 0, z: 0 }); }}
                className={cn("rounded-md px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.06em] transition-colors", world === w.key ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
                {w.name}
                {w.chunks > 0 && <span className="ml-2 text-xs text-subtle tabular-nums">{w.chunks}</span>}
              </button>
            ))}
          </div>
        )}
        {!compact && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtres de la carte">
              {FILTERS.map(([f, label]) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={buttonClass(filter === f ? "primary" : "secondary", "sm")}>{label}</button>
              ))}
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Zoom">
              <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setZoom((z) => Math.min(8, z * 2))} aria-label="Zoomer">+</button>
              <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setZoom((z) => Math.max(1, z / 2))} aria-label="Dézoomer">−</button>
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => { setZoom(1); setCenter({ x: 0, z: 0 }); }}>Recentrer</button>
            </div>
          </div>
        )}
        <div className="metal-border relative overflow-hidden rounded-[var(--radius-card)] p-0">
          <svg
            ref={svg}
            viewBox={view}
            className={cn("block aspect-square w-full touch-none select-none bg-[radial-gradient(ellipse_at_50%_45%,#1a1014_0%,#0d0d10_60%,#07070a_100%)]", !compact && "cursor-grab active:cursor-grabbing")}
            role="img"
            aria-label={`Carte de VÆLORIA — ${worlds.find((w) => w.key === world)?.name ?? world}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <defs>
              <pattern id="vae-grid" width="500" height="500" patternUnits="userSpaceOnUse">
                <path d="M500 0 L0 0 0 500" fill="none" stroke="#1b1c21" strokeWidth="8" />
              </pattern>
              <pattern id="vae-hatch" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="80" height="80" fill="rgb(163 18 30 / 0.10)" />
                <line x1="0" y1="0" x2="0" y2="80" stroke="rgb(210 31 47 / 0.35)" strokeWidth="18" />
              </pattern>
            </defs>
            <rect x={-R} y={-R} width={2 * R} height={2 * R} fill="url(#vae-grid)" />
            <circle cx={0} cy={0} r={R} fill="none" stroke="#2a2c33" strokeWidth={14} strokeDasharray="60 40" />

            {data.zones.filter((z) => ZONE[z.kind].layer.includes(filter)).map((z) => {
              const s = ZONE[z.kind];
              const live = liveByZone.get(z.key);
              return (
                <g key={z.key} onClick={() => setSelected(z.key)} className="cursor-pointer">
                  <rect x={z.x1} y={z.z1} width={z.x2 - z.x1} height={z.z2 - z.z1} fill={s.fill} stroke={selected === z.key ? "#ffffff" : s.stroke} strokeWidth={selected === z.key ? 28 : 16} strokeDasharray={s.dash} rx={20} />
                  {live && (
                    <circle cx={(z.x1 + z.x2) / 2} cy={(z.z1 + z.z2) / 2} r={110} fill="#d21f2f" className="origin-center animate-pulse" />
                  )}
                </g>
              );
            })}

            {showTerritories && data.territories.map((t) => (
              <rect key={`${t.slug}-${t.cx}-${t.cz}`} x={t.cx * data.cellBlocks} y={t.cz * data.cellBlocks} width={data.cellBlocks} height={data.cellBlocks}
                fill={t.color} fillOpacity={Math.min(0.85, 0.25 + t.chunks / 64)} stroke={t.color} strokeOpacity={0.9} strokeWidth={6} />
            ))}

            {data.zones.filter((z) => ZONE[z.kind].layer.includes(filter) && z.kind !== "neutral").map((z) => (
              <text key={`l-${z.key}`} x={(z.x1 + z.x2) / 2} y={z.z1 - 60} textAnchor="middle" fill="#d9dce2" fontSize={compact ? 220 : 150 / Math.sqrt(zoom)} fontWeight={700} letterSpacing={20}
                style={{ fontFamily: "var(--font-chakra), sans-serif", textTransform: "uppercase", paintOrder: "stroke" }} stroke="#07070a" strokeWidth={30}>
                {z.name}
              </text>
            ))}
            <text x={0} y={-R + 260} textAnchor="middle" fill="#8b909b" fontSize={200} fontWeight={700} style={{ fontFamily: "var(--font-chakra), sans-serif" }}>N</text>
          </svg>
          {data.territories.length === 0 && (
            <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/95 to-transparent px-4 pb-3 pt-8 text-center text-xs text-muted">
              {all.territories.length === 0 ? "Les territoires des empires apparaîtront dès les premiers claims de la Saison I." : "Aucun territoire d'empire dans ce monde pour l'instant."}
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <aside className="space-y-4">
          <div className="metal-border rounded-[var(--radius-card)] p-4" aria-live="polite">
            {zone ? (
              <>
                <Badge tone={zone.kind === "koth" || zone.kind === "warzone" ? "danger" : "neutral"}>{ZONE[zone.kind].label}</Badge>
                <p className="mt-2 font-display text-xl font-bold uppercase tracking-[0.04em]">{zone.name}</p>
                <p className="mt-1 text-sm text-muted">{zone.description}</p>
                <p className="mt-2 font-mono text-xs text-subtle">X {zone.x1} → {zone.x2} · Z {zone.z1} → {zone.z2}</p>
                {liveByZone.get(zone.key) && (
                  <Link href={`/evenement/${liveByZone.get(zone.key)!.slug}`} className="mt-3 inline-block text-sm font-semibold text-accent">En direct : {liveByZone.get(zone.key)!.title} →</Link>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Sélectionne une zone sur la carte pour voir ses détails.</p>
            )}
          </div>
          <div className="rounded-[var(--radius-card)] border border-line p-4">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Légende</p>
            <ul className="space-y-1.5 text-sm">
              {(["spawn", "neutral", "koth", "warzone", "event"] as ZoneKind[]).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span aria-hidden className="size-3 rounded-sm border" style={{ borderColor: ZONE[k].stroke, background: k === "warzone" ? "rgb(210 31 47 / 0.3)" : ZONE[k].fill }} />
                  {ZONE[k].label}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line p-4">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Empires sur la carte</p>
            {empires.length === 0 ? (
              <p className="text-sm text-muted">Aucun territoire revendiqué pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {empires.slice(0, 10).map(([slug, e]) => (
                  <li key={slug}><Link href={`/empire/${slug}`} className="flex items-center gap-2 hover:text-accent"><span aria-hidden className="size-3 rounded-sm" style={{ background: e.color }} />{e.name}<span className="ml-auto text-xs text-subtle tabular-nums">{e.chunks} chunks</span></Link></li>
                ))}
              </ul>
            )}
          </div>
          {data.activeWars.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-ruby/40 p-4">
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">Guerres en cours</p>
              <ul className="space-y-1 text-sm">{data.activeWars.map((w) => <li key={w.slug}><Link href={`/guerre/${w.slug}`} className="hover:text-accent">{w.title}</Link></li>)}</ul>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
