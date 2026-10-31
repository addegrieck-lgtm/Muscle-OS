import { useId, type ReactNode } from "react";
import type { ArtForm } from "@/types/catalog";

/**
 * Illustrations vectorielles de luminaires, utilisées tant que les photographies réelles des
 * produits ne sont pas disponibles. Ce sont des ÉVOCATIONS de forme, jamais présentées comme
 * des photographies de produit : le libellé « Illustration » accompagne chaque usage.
 */

type Mood = "nuit" | "jour";

function rng(seedText: string) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Ctx {
  id: string;
  rand: () => number;
  mood: Mood;
}

const metal = (c: Ctx) => `url(#metal-${c.id})`;

function Globe({
  c,
  x,
  y,
  r,
  warm = 1,
}: {
  c: Ctx;
  x: number;
  y: number;
  r: number;
  warm?: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 3.2} fill={`url(#halo-${c.id})`} opacity={0.5 * warm} />
      <circle cx={x} cy={y} r={r} fill={`url(#glass-${c.id})`} />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#E6DCCF"
        strokeOpacity={0.55}
        strokeWidth={0.6}
      />
      <circle cx={x} cy={y + r * 0.1} r={r * 0.22} fill="#FFF6E6" opacity={0.95} />
      <path
        d={`M${x - r * 0.55} ${y - r * 0.35} A ${r * 0.7} ${r * 0.7} 0 0 1 ${x - r * 0.05} ${y - r * 0.72}`}
        stroke="#fff"
        strokeOpacity={0.6}
        strokeWidth={0.8}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Drop({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <path
        d={`M${x} ${y} L${x + s * 0.45} ${y + s * 0.9} L${x} ${y + s * 1.6} L${x - s * 0.45} ${y + s * 0.9} Z`}
        fill="#F7EFE2"
        fillOpacity={0.85}
        stroke="#C6B49A"
        strokeWidth={0.4}
      />
      <circle cx={x} cy={y + s * 0.8} r={s * 1.1} fill="#FFE9C4" opacity={0.08} />
    </g>
  );
}

function Canopy({ c, x, y = 0, w = 46 }: { c: Ctx; x: number; y?: number; w?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={y} width={w} height={6} rx={1.5} fill={metal(c)} />
      <rect x={x - w / 2 + 6} y={y + 6} width={w - 12} height={2} fill={metal(c)} opacity={0.7} />
    </g>
  );
}

function cascade(c: Ctx): ReactNode {
  const cx = 200;
  const globes = Array.from({ length: 26 }, () => {
    const a = c.rand() * Math.PI * 2;
    const rr = Math.sqrt(c.rand()) * 92;
    const depth = (Math.sin(a) + 1) / 2;
    return {
      x: cx + Math.cos(a) * rr,
      y: 120 + c.rand() * 250 + (1 - rr / 92) * 40,
      r: 7 + c.rand() * 8 + depth * 3,
      depth,
    };
  }).sort((a, b) => a.depth - b.depth);
  return (
    <g>
      <ellipse cx={cx} cy={22} rx={96} ry={9} fill="none" stroke={metal(c)} strokeWidth={1.2} />
      <Canopy c={c} x={cx} y={8} w={200} />
      {globes.map((g, i) => (
        <line
          key={`w${i}`}
          x1={g.x}
          y1={22}
          x2={g.x}
          y2={g.y - g.r}
          stroke="#C6B49A"
          strokeOpacity={0.55}
          strokeWidth={0.5}
        />
      ))}
      {globes.map((g, i) => (
        <Globe key={`g${i}`} c={c} x={g.x} y={g.y} r={g.r} warm={0.6 + g.depth * 0.4} />
      ))}
    </g>
  );
}

function globes(c: Ctx): ReactNode {
  const cx = 200;
  const hub = 205;
  const arms: ReactNode[] = [];
  const balls: ReactNode[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + c.rand() * 0.3;
    const len = 70 + c.rand() * 80;
    const tilt = -0.35 + c.rand() * 0.9;
    const x = cx + Math.cos(a) * len;
    const y = hub + Math.sin(a) * len * 0.42 + tilt * 50;
    const front = Math.sin(a) > 0;
    arms.push(
      <path
        key={`a${i}`}
        d={`M${cx} ${hub} Q ${cx + Math.cos(a) * len * 0.5} ${hub + tilt * 30} ${x} ${y}`}
        stroke={metal(c)}
        strokeWidth={1.6}
        fill="none"
        opacity={front ? 1 : 0.6}
      />,
    );
    balls.push(
      <Globe key={`b${i}`} c={c} x={x} y={y} r={front ? 15 : 12} warm={front ? 1 : 0.7} />,
    );
  }
  return (
    <g>
      <Canopy c={c} x={cx} y={8} />
      <line x1={cx} y1={16} x2={cx} y2={hub} stroke={metal(c)} strokeWidth={2} />
      <circle cx={cx} cy={hub} r={9} fill={metal(c)} />
      {arms}
      {balls}
    </g>
  );
}

function halo(c: Ctx): ReactNode {
  const cx = 200;
  const cy = 230;
  const rx = 150;
  const ry = 34;
  const drops: ReactNode[] = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry + 4;
    if (Math.sin(a) < -0.2 && i % 2) continue;
    drops.push(<Drop key={i} x={x} y={y} s={7 + c.rand() * 4} />);
  }
  return (
    <g>
      <Canopy c={c} x={cx} y={8} w={60} />
      {[-0.8, 0, 0.8].map((k, i) => (
        <line
          key={i}
          x1={cx + k * 10}
          y1={16}
          x2={cx + k * rx * 0.9}
          y2={cy}
          stroke="#C6B49A"
          strokeOpacity={0.5}
          strokeWidth={0.5}
        />
      ))}
      <ellipse
        cx={cx}
        cy={cy - 30}
        rx={rx * 1.3}
        ry={ry * 2.6}
        fill={`url(#halo-${c.id})`}
        opacity={0.45}
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="#FFE7BF"
        strokeWidth={9}
        opacity={0.35}
        filter={`url(#blur-${c.id})`}
      />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={metal(c)} strokeWidth={4} />
      <ellipse
        cx={cx}
        cy={cy - 2}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="#FFF3DC"
        strokeWidth={1}
        opacity={0.9}
      />
      {drops}
    </g>
  );
}

function organic(c: Ctx): ReactNode {
  const leaves: ReactNode[] = [];
  const path = (t: number) => {
    const x = 40 + t * 320;
    const y = 190 + Math.sin(t * Math.PI * 1.6) * 34;
    return { x, y };
  };
  for (let i = 0; i < 46; i++) {
    const t = c.rand();
    const p = path(t);
    const ang = -60 + c.rand() * 120 + (c.rand() > 0.5 ? 180 : 0);
    const len = 14 + c.rand() * 18;
    leaves.push(
      <ellipse
        key={i}
        cx={p.x + Math.cos((ang * Math.PI) / 180) * len * 0.6}
        cy={p.y + Math.sin((ang * Math.PI) / 180) * len * 0.6}
        rx={len / 2}
        ry={len / 6}
        transform={`rotate(${ang} ${p.x + Math.cos((ang * Math.PI) / 180) * len * 0.6} ${p.y + Math.sin((ang * Math.PI) / 180) * len * 0.6})`}
        fill={metal(c)}
        opacity={0.75 + c.rand() * 0.25}
      />,
    );
  }
  const lights: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const p = path((i + 0.5) / 9);
    lights.push(<Globe key={i} c={c} x={p.x} y={p.y + 14} r={5} />);
  }
  const d = Array.from({ length: 41 }, (_, i) => path(i / 40))
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join("");
  return (
    <g>
      <line
        x1={110}
        y1={0}
        x2={110}
        y2={path(0.22).y}
        stroke="#C6B49A"
        strokeOpacity={0.5}
        strokeWidth={0.6}
      />
      <line
        x1={290}
        y1={0}
        x2={290}
        y2={path(0.78).y}
        stroke="#C6B49A"
        strokeOpacity={0.5}
        strokeWidth={0.6}
      />
      <ellipse cx={200} cy={200} rx={190} ry={70} fill={`url(#halo-${c.id})`} opacity={0.5} />
      <path d={d} stroke={metal(c)} strokeWidth={2.4} fill="none" />
      {leaves}
      {lights}
    </g>
  );
}

function tiers(c: Ctx): ReactNode {
  const cx = 200;
  const levels = [
    { y: 150, rx: 70, ry: 14 },
    { y: 225, rx: 110, ry: 20 },
    { y: 305, rx: 145, ry: 26 },
  ];
  return (
    <g>
      <Canopy c={c} x={cx} y={8} w={50} />
      <line x1={cx} y1={16} x2={cx} y2={340} stroke={metal(c)} strokeWidth={2} />
      <ellipse cx={cx} cy={240} rx={170} ry={150} fill={`url(#halo-${c.id})`} opacity={0.45} />
      {levels.map((l, i) => (
        <g key={i}>
          <ellipse
            cx={cx}
            cy={l.y}
            rx={l.rx}
            ry={l.ry}
            fill="none"
            stroke={metal(c)}
            strokeWidth={2.4}
          />
          {Array.from({ length: 10 + i * 6 }, (_, k) => {
            const a = (k / (10 + i * 6)) * Math.PI * 2;
            const x = cx + Math.cos(a) * l.rx;
            const y = l.y + Math.sin(a) * l.ry;
            return (
              <g key={k}>
                <line x1={x} y1={y} x2={x} y2={y + 10} stroke="#C6B49A" strokeWidth={0.4} />
                <Drop x={x} y={y + 9} s={6 + c.rand() * 3} />
              </g>
            );
          })}
          {Array.from({ length: 4 + i * 2 }, (_, k) => {
            const a = (k / (4 + i * 2)) * Math.PI * 2 + 0.3;
            return (
              <Globe
                key={`f${k}`}
                c={c}
                x={cx + Math.cos(a) * l.rx * 0.95}
                y={l.y - 8 + Math.sin(a) * l.ry}
                r={4}
              />
            );
          })}
        </g>
      ))}
      <Drop x={cx} y={340} s={12} />
    </g>
  );
}

function dome(c: Ctx): ReactNode {
  const cx = 200;
  return (
    <g>
      <line
        x1={cx}
        y1={0}
        x2={cx}
        y2={170}
        stroke="#C6B49A"
        strokeOpacity={0.6}
        strokeWidth={0.8}
      />
      <ellipse cx={cx} cy={330} rx={190} ry={120} fill={`url(#halo-${c.id})`} opacity={0.7} />
      <path
        d={`M${cx - 150} 290 C ${cx - 150} 190, ${cx - 80} 170, ${cx} 170 C ${cx + 80} 170, ${cx + 150} 190, ${cx + 150} 290 Z`}
        fill={`url(#amber-${c.id})`}
      />
      <path
        d={`M${cx - 150} 290 C ${cx - 150} 190, ${cx - 80} 170, ${cx} 170 C ${cx + 80} 170, ${cx + 150} 190, ${cx + 150} 290`}
        fill="none"
        stroke="#F3E2C4"
        strokeOpacity={0.7}
        strokeWidth={0.8}
      />
      <path
        d={`M${cx - 110} 230 C ${cx - 100} 200, ${cx - 70} 186, ${cx - 30} 182`}
        stroke="#fff"
        strokeOpacity={0.45}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx} cy={290} rx={150} ry={14} fill="#FFF2D8" opacity={0.85} />
      <ellipse
        cx={cx}
        cy={292}
        rx={60}
        ry={6}
        fill="#fff"
        opacity={0.9}
        filter={`url(#blur-${c.id})`}
      />
    </g>
  );
}

function sconce(c: Ctx): ReactNode {
  return (
    <g>
      <rect x={70} y={110} width={14} height={240} rx={7} fill={metal(c)} />
      <ellipse cx={200} cy={210} rx={190} ry={190} fill={`url(#halo-${c.id})`} opacity={0.55} />
      <path
        d="M84 300 C 160 300, 210 270, 230 200"
        stroke={metal(c)}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <Globe c={c} x={232} y={170} r={38} />
    </g>
  );
}

function floor(c: Ctx): ReactNode {
  return (
    <g>
      <ellipse cx={120} cy={448} rx={54} ry={8} fill={metal(c)} />
      <path
        d="M120 446 L120 140 C 120 70, 200 52, 268 92 C 290 105, 300 120, 300 150"
        stroke={metal(c)}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <line x1={300} y1={150} x2={300} y2={186} stroke="#C6B49A" strokeWidth={0.8} />
      <ellipse cx={300} cy={260} rx={150} ry={170} fill={`url(#halo-${c.id})`} opacity={0.55} />
      <Globe c={c} x={300} y={222} r={36} />
    </g>
  );
}

const FORMS: Record<ArtForm, (c: Ctx) => ReactNode> = {
  cascade,
  globes,
  halo,
  organic,
  tiers,
  dome,
  sconce,
  floor,
};

export function LuminaireArt({
  form,
  seed = form,
  mood = "nuit",
  className,
  label,
  framed = true,
}: {
  form: ArtForm;
  seed?: string;
  mood?: Mood;
  className?: string;
  label?: string;
  framed?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const c: Ctx = { id, rand: rng(seed), mood };
  const night = mood === "nuit";
  return (
    <svg
      viewBox="0 0 400 500"
      className={className}
      role="img"
      aria-label={label ?? "Illustration d’un luminaire"}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`bg-${id}`} cx="0.5" cy="0.38" r="0.85">
          <stop offset="0" stopColor={night ? "#3a2f27" : "#F6F1EA"} />
          <stop offset="0.55" stopColor={night ? "#221d1a" : "#ECE3D7"} />
          <stop offset="1" stopColor={night ? "#141312" : "#E2D6C6"} />
        </radialGradient>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0" stopColor="#FFE2B0" stopOpacity={night ? 0.55 : 0.5} />
          <stop offset="0.45" stopColor="#E9C48C" stopOpacity={night ? 0.18 : 0.16} />
          <stop offset="1" stopColor="#E9C48C" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`glass-${id}`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#FFF8EC" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#F4DDB5" stopOpacity={0.6} />
          <stop offset="0.8" stopColor="#C6A372" stopOpacity={0.25} />
          <stop offset="1" stopColor="#A88A62" stopOpacity={0.35} />
        </radialGradient>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9D6B4" />
          <stop offset="0.45" stopColor="#A88A62" />
          <stop offset="0.7" stopColor="#D9C4A1" />
          <stop offset="1" stopColor="#8A6E4B" />
        </linearGradient>
        <linearGradient id={`amber-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E7C38F" stopOpacity={0.55} />
          <stop offset="0.7" stopColor="#C58E4C" stopOpacity={0.75} />
          <stop offset="1" stopColor="#FCE6BF" stopOpacity={0.95} />
        </linearGradient>
        <filter id={`blur-${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {framed && (
        <>
          <rect width="400" height="500" fill={`url(#bg-${id})`} />
          {/* Architecture suggérée : lignes de mur et de sol. */}
          <g
            stroke={night ? "#F1ECE4" : "#44372E"}
            strokeOpacity={night ? 0.05 : 0.07}
            strokeWidth={1}
          >
            <line x1="0" y1="430" x2="400" y2="430" />
            <line x1="60" y1="0" x2="60" y2="430" />
            <line x1="340" y1="0" x2="340" y2="430" />
          </g>
          <ellipse
            cx="200"
            cy="445"
            rx="160"
            ry="14"
            fill="#FFDDA6"
            opacity={night ? 0.06 : 0.12}
          />
        </>
      )}
      {FORMS[form](c)}
    </svg>
  );
}
