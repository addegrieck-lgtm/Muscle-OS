import type { ISODate, WeightEntry, WorkoutSession } from '../types/models';
import { addDays, avg, daysBetween, movingAverage, startOfWeek } from '../utils';

/** Variation hebdomadaire (%) de la moyenne glissante 7 j sur les ~14-21 derniers jours. */
export function weeklyWeightChangePct(entries: WeightEntry[], today: ISODate): number | null {
  const pts = entries.map((e) => ({ date: e.date, value: e.kg })).filter((p) => daysBetween(p.date, today) >= 0 && daysBetween(p.date, today) <= 28);
  if (pts.length < 6) return null;
  const ma = movingAverage(pts, 7);
  const first = ma.find((p) => daysBetween(p.date, today) <= 28 && daysBetween(ma[0].date, p.date) >= 6) ?? ma[0];
  const last = ma[ma.length - 1];
  const span = daysBetween(first.date, last.date);
  if (span < 10) return null;
  return ((last.value - first.value) / first.value / span) * 7 * 100;
}

export function latestWeight(entries: WeightEntry[]): number | undefined {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0]?.kg;
}

export function weeklyTonnage(sessions: WorkoutSession[]): { week: ISODate; sets: number; reps: number }[] {
  const map = new Map<ISODate, { sets: number; reps: number }>();
  for (const s of sessions) {
    const w = startOfWeek(s.date);
    const cur = map.get(w) ?? { sets: 0, reps: 0 };
    for (const e of s.exercises) for (const set of e.sets) if (set.done) {
      cur.sets += 1;
      cur.reps += set.reps;
    }
    map.set(w, cur);
  }
  return [...map.entries()].map(([week, v]) => ({ week, ...v })).sort((a, b) => a.week.localeCompare(b.week));
}

export function exerciseHistory(sessions: WorkoutSession[], exerciseId: string): { date: ISODate; best: number; load?: number }[] {
  return sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .map((s) => {
      const log = s.exercises.find((e) => e.exerciseId === exerciseId)!;
      const done = log.sets.filter((x) => x.done);
      return { date: s.date, best: Math.max(0, ...done.map((x) => x.reps)), load: done.find((x) => x.load)?.load };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function adherence(sessions: WorkoutSession[], plannedPerWeek: number, weeks = 4, today: ISODate): number {
  const recent = sessions.filter((s) => s.finishedAt && daysBetween(s.date, today) < weeks * 7 && daysBetween(s.date, today) >= 0);
  return Math.min(100, Math.round((recent.length / Math.max(1, plannedPerWeek * weeks)) * 100));
}

export function streakDays(dates: ISODate[], today: ISODate): number {
  const set = new Set(dates);
  let n = 0;
  let d = today;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export const averageOf = avg;
