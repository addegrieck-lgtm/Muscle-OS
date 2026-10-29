import { diffDays, type LocalDate } from './dates';
import { ratioBasisPoints, sumCents, type Cents } from './money';
import { currentWeekIndex, weekStartDate } from './plan';
import type { Challenge, ChallengeWeek, Deposit, WeekState } from './types';

export interface WeekView {
  index: number;
  startDate: LocalDate;
  plannedCents: Cents | null;
  depositedCents: Cents;
  /** Ce qu'il reste à verser pour compléter la semaine (0 si complète ou sans montant prévu). */
  missingCents: Cents;
  state: WeekState;
  deposits: Deposit[];
}

export interface ChallengeProgress {
  totalSavedCents: Cents;
  targetCents: Cents;
  remainingCents: Cents;
  /** 0–10 000 (points de base) pour un affichage précis sans flottant cumulatif. */
  progressBp: number;
  completedWeeks: number;
  skippedWeeks: number;
  lateWeeks: number;
  currentWeek: number;
  /** Cumul prévu jusqu'à la semaine en cours incluse (null en mode libre). */
  expectedToDateCents: Cents | null;
  /** Prochaine semaine à traiter, dans l'ordre (null si tout est traité). */
  nextWeek: WeekView | null;
  averageDepositCents: Cents;
  depositCount: number;
  isGoalReached: boolean;
  weeks: WeekView[];
}

export function activeDeposits(deposits: readonly Deposit[]): Deposit[] {
  return deposits.filter((d) => d.status === 'active');
}

/**
 * Statut d'une semaine.
 * - completed : versements ≥ montant prévu (ou au moins un versement en mode libre)
 * - partial   : versements > 0 mais inférieurs au montant prévu
 * - skipped   : ignorée explicitement par l'utilisateur
 * - late      : semaine passée, ni complète ni ignorée
 * - current / upcoming : semaine en cours / à venir
 */
export function weekState(params: {
  plannedCents: Cents | null;
  depositedCents: Cents;
  skipped: boolean;
  index: number;
  currentWeek: number;
}): WeekState {
  const { plannedCents, depositedCents, skipped, index, currentWeek } = params;
  if (skipped) return 'skipped';
  if (depositedCents > 0 && (plannedCents === null || depositedCents >= plannedCents)) return 'completed';
  if (depositedCents > 0) return 'partial';
  if (index < currentWeek) return 'late';
  if (index === currentWeek) return 'current';
  return 'upcoming';
}

export function computeProgress(
  challenge: Challenge,
  weeks: readonly ChallengeWeek[],
  deposits: readonly Deposit[],
  today: LocalDate,
): ChallengeProgress {
  const live = activeDeposits(deposits).filter((d) => d.challengeId === challenge.id);
  const byWeek = new Map<number, Deposit[]>();
  for (const d of live) {
    const list = byWeek.get(d.weekIndex) ?? [];
    list.push(d);
    byWeek.set(d.weekIndex, list);
  }
  const weekByIndex = new Map(weeks.map((w) => [w.index, w]));
  const currentWeek = currentWeekIndex(challenge.startDate, today, challenge.weekCount);

  const views: WeekView[] = [];
  for (let index = 1; index <= challenge.weekCount; index++) {
    const week = weekByIndex.get(index);
    const plannedCents = week?.plannedCents ?? null;
    const weekDeposits = (byWeek.get(index) ?? []).sort((a, b) => a.depositedOn.localeCompare(b.depositedOn));
    const depositedCents = sumCents(weekDeposits.map((d) => d.amountCents));
    views.push({
      index,
      startDate: weekStartDate(challenge.startDate, index),
      plannedCents,
      depositedCents,
      missingCents: plannedCents === null ? 0 : Math.max(0, plannedCents - depositedCents),
      state: weekState({ plannedCents, depositedCents, skipped: week?.skipped ?? false, index, currentWeek }),
      deposits: weekDeposits,
    });
  }

  // Chaque versement est compté une seule fois, même s'il est rattaché à une semaine hors plage.
  const totalSavedCents = sumCents(live.map((d) => d.amountCents));
  const targetCents = challenge.targetCents;
  const hasPlan = views.some((v) => v.plannedCents !== null);
  const expectedToDateCents = hasPlan
    ? sumCents(views.filter((v) => v.index <= currentWeek).map((v) => v.plannedCents ?? 0))
    : null;

  const nextWeek =
    views.find((v) => v.state === 'current') ??
    views.find((v) => v.state === 'late' || v.state === 'partial') ??
    views.find((v) => v.state === 'upcoming') ??
    null;

  return {
    totalSavedCents,
    targetCents,
    remainingCents: Math.max(0, targetCents - totalSavedCents),
    progressBp: ratioBasisPoints(totalSavedCents, targetCents),
    completedWeeks: views.filter((v) => v.state === 'completed').length,
    skippedWeeks: views.filter((v) => v.state === 'skipped').length,
    lateWeeks: views.filter((v) => v.state === 'late').length,
    currentWeek,
    expectedToDateCents,
    nextWeek,
    averageDepositCents: live.length ? Math.round(totalSavedCents / live.length) : 0,
    depositCount: live.length,
    isGoalReached: targetCents > 0 && totalSavedCents >= targetCents,
    weeks: views,
  };
}

/** Cumul des versements par date, pour le graphique d'évolution. */
export function cumulativeSeries(deposits: readonly Deposit[]): { date: LocalDate; cumulativeCents: Cents }[] {
  const byDate = new Map<LocalDate, Cents>();
  for (const d of activeDeposits(deposits)) byDate.set(d.depositedOn, (byDate.get(d.depositedOn) ?? 0) + d.amountCents);
  let running = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, cumulativeCents: (running += amount) }));
}

/** Plus longue série et série en cours de semaines complétées consécutives (jusqu'à la semaine en cours). */
export function weekStreaks(weeks: readonly WeekView[], currentWeek: number): { current: number; best: number } {
  let best = 0;
  let run = 0;
  for (const w of weeks) {
    if (w.state === 'completed') best = Math.max(best, ++run);
    else if (w.index < currentWeek) run = 0;
  }
  // Série en cours : en remontant depuis la semaine en cours (une semaine en cours non validée ne casse pas la série).
  let current = 0;
  for (let i = Math.min(currentWeek, weeks.length) - 1; i >= 0; i--) {
    const w = weeks[i];
    if (w.state === 'completed') current++;
    else if (w.index === currentWeek) continue;
    else break;
  }
  return { current, best };
}

/**
 * Régularité : part des semaines écoulées (avant la semaine en cours) qui ont été complétées.
 * Les semaines ignorées volontairement ne sont pas comptées comme des échecs.
 */
export function regularityBp(weeks: readonly WeekView[], currentWeek: number): number {
  const elapsed = weeks.filter((w) => w.index < currentWeek && w.state !== 'skipped');
  if (elapsed.length === 0) return 0;
  return Math.floor((elapsed.filter((w) => w.state === 'completed').length * 10_000) / elapsed.length);
}

/**
 * Projection indicative : au rythme moyen observé depuis le début, montant atteint à la fin du challenge.
 * Retourne null s'il n'y a pas assez de recul (moins d'une semaine écoulée ou aucun versement).
 */
export function projectFinalCents(
  totalSavedCents: Cents,
  startDate: LocalDate,
  today: LocalDate,
  weekCount: number,
): Cents | null {
  const elapsedDays = diffDays(startDate, today) + 1;
  if (elapsedDays < 7 || totalSavedCents <= 0) return null;
  const totalDays = weekCount * 7;
  if (elapsedDays >= totalDays) return totalSavedCents;
  return Math.round((totalSavedCents * totalDays) / elapsedDays);
}
