import type { ISODate } from '../types/models';

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const round = (v: number, step = 1): number => Math.round(v / step) * step;
export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
export const avg = (arr: number[]): number => (arr.length ? sum(arr) / arr.length : 0);

/** Date locale au format YYYY-MM-DD (pas d'UTC pour éviter les décalages de fuseau). */
export const toISODate = (d: Date = new Date()): ISODate => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const today = (): ISODate => toISODate(new Date());

export const parseISODate = (s: ISODate): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: ISODate, n: number): ISODate => {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const daysBetween = (a: ISODate, b: ISODate): number =>
  Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);

/** 0 = lundi … 6 = dimanche */
export const weekdayIndex = (s: ISODate): number => (parseISODate(s).getDay() + 6) % 7;

export const startOfWeek = (s: ISODate): ISODate => addDays(s, -weekdayIndex(s));

export const formatDate = (s: ISODate, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string =>
  parseISODate(s).toLocaleDateString('fr-FR', opts);

/** Supprime accents + minuscules — utile pour l'analyse de texte du coach. */
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ');

export const fmt = (n: number, digits = 0): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Moyenne mobile simple sur `window` jours calendaires (tient compte des jours manquants). */
export function movingAverage(points: { date: ISODate; value: number }[], window = 7): { date: ISODate; value: number }[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const inWindow = sorted.filter((q) => {
      const d = daysBetween(q.date, p.date);
      return d >= 0 && d < window;
    });
    return { date: p.date, value: avg(inWindow.map((q) => q.value)) };
  });
}

/** Pseudo-aléatoire déterministe (pour des programmes reproductibles et testables). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export const hashString = (str: string): number => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
