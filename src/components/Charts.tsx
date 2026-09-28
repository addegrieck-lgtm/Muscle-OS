import { useMemo, useState } from 'react';
import type { ISODate } from '../types/models';
import { daysBetween, fmt, formatDate } from '../utils';

export interface Series {
  points: { date: ISODate; value: number }[];
  color: string;
  width?: number;
  dots?: boolean;
  area?: boolean;
  label: string;
  dashed?: boolean;
}

/** Courbe temporelle (SVG) — x proportionnel aux dates, lissage léger, point sélectionnable au toucher. */
export function LineChart({ series, height = 180, unit = '', digits = 1 }: { series: Series[]; height?: number; unit?: string; digits?: number }) {
  const W = 340;
  const H = height;
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  const all = series.flatMap((s) => s.points);
  const [sel, setSel] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!all.length) return null;
    const dates = all.map((p) => p.date).sort();
    const d0 = dates[0];
    const d1 = dates[dates.length - 1];
    const span = Math.max(1, daysBetween(d0, d1));
    const vals = all.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    const padV = Math.max(0.5, (max - min) * 0.15);
    min -= padV;
    max += padV;
    const x = (d: ISODate) => pad.l + (daysBetween(d0, d) / span) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
    const ticks = [min + (max - min) * 0.15, (min + max) / 2, max - (max - min) * 0.15];
    return { x, y, d0, d1, ticks, min };
  }, [JSON.stringify(all), H]);

  if (!geo) return <div className="empty small">Pas encore de données</div>;

  const path = (pts: { date: ISODate; value: number }[]) => {
    const s = [...pts].sort((a, b) => a.date.localeCompare(b.date));
    if (s.length === 1) return '';
    return s
      .map((p, i) => {
        const X = geo.x(p.date);
        const Y = geo.y(p.value);
        if (i === 0) return `M${X},${Y}`;
        const prev = s[i - 1];
        const px = geo.x(prev.date);
        const py = geo.y(prev.value);
        const cx = (px + X) / 2;
        return `C${cx},${py} ${cx},${Y} ${X},${Y}`;
      })
      .join(' ');
  };

  const main = series[0];
  const mainSorted = [...main.points].sort((a, b) => a.date.localeCompare(b.date));
  const selected = sel != null ? mainSorted[sel] : mainSorted[mainSorted.length - 1];

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bd = Infinity;
    mainSorted.forEach((p, i) => {
      const d = Math.abs(geo.x(p.date) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setSel(best);
  };

  return (
    <div className="chart">
      {selected && (
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span className="small muted">{formatDate(selected.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="small" style={{ fontWeight: 700 }}>
            {fmt(selected.value, digits)} {unit}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} onPointerDown={onPointer} onPointerMove={(e) => e.buttons && onPointer(e)} style={{ touchAction: 'pan-y' }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`area-${i}-${s.label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {geo.ticks.map((t, i) => (
          <g key={i}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={geo.y(t)} y2={geo.y(t)} strokeDasharray="2 4" />
            <text className="axis-label" x={pad.l - 6} y={geo.y(t) + 3} textAnchor="end">
              {fmt(t, t > 100 ? 0 : 1)}
            </text>
          </g>
        ))}
        <text className="axis-label" x={pad.l} y={H - 4}>
          {formatDate(geo.d0)}
        </text>
        <text className="axis-label" x={W - pad.r} y={H - 4} textAnchor="end">
          {formatDate(geo.d1)}
        </text>
        {series.map((s, i) => {
          const d = path(s.points);
          const sorted = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
          return (
            <g key={i}>
              {s.area && d && sorted.length > 1 && (
                <path d={`${d} L${geo.x(sorted[sorted.length - 1].date)},${H - pad.b} L${geo.x(sorted[0].date)},${H - pad.b} Z`} fill={`url(#area-${i}-${s.label.replace(/\W/g, '')})`} />
              )}
              {d && <path d={d} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />}
              {(s.dots || sorted.length === 1) && sorted.map((p) => <circle key={p.date} cx={geo.x(p.date)} cy={geo.y(p.value)} r={2.4} fill={s.color} opacity={0.8} />)}
            </g>
          );
        })}
        {selected && (
          <g>
            <line x1={geo.x(selected.date)} x2={geo.x(selected.date)} y1={pad.t} y2={H - pad.b} stroke="var(--line-2)" />
            <circle cx={geo.x(selected.date)} cy={geo.y(selected.value)} r={5} fill="var(--bg)" stroke={main.color} strokeWidth={2.5} />
          </g>
        )}
      </svg>
      {series.length > 1 && (
        <div className="legend" style={{ marginTop: 8 }}>
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarChart({ data, height = 140, color = 'var(--text)', highlight }: { data: { label: string; value: number; sub?: string }[]; height?: number; color?: string; highlight?: number }) {
  const W = 340;
  const H = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - 10) / Math.max(1, data.length);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H + 20}`}>
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 16);
          const x = 5 + i * bw + bw * 0.18;
          return (
            <g key={i}>
              <rect x={x} y={H - h} width={bw * 0.64} height={Math.max(2, h)} rx={Math.min(6, bw * 0.2)} fill={i === highlight ? 'var(--accent)' : color} opacity={i === highlight || highlight == null ? 1 : 0.55} />
              {d.value > 0 && (
                <text x={x + bw * 0.32} y={H - h - 4} textAnchor="middle" className="axis-label" style={{ fill: 'var(--text-2)' }}>
                  {fmt(d.value)}
                </text>
              )}
              <text x={x + bw * 0.32} y={H + 14} textAnchor="middle" className="axis-label">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Barres horizontales (volume par muscle, etc.). */
export function HBars({ data, max }: { data: { label: string; value: number; color?: string; note?: string }[]; max?: number }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div className="row-between small" style={{ marginBottom: 4 }}>
            <span>
              {d.label} {d.note && <span className="faint tiny">{d.note}</span>}
            </span>
            <span className="muted">{fmt(d.value)}</span>
          </div>
          <div className="bar">
            <span style={{ width: `${Math.min(100, (d.value / m) * 100)}%`, background: d.color ?? 'var(--text)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
