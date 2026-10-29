import { addDays, diffDays, type LocalDate } from './dates';
import { sumCents, type Cents } from './money';
import type { ChallengeType, CustomStrategy } from './types';

export const DEFAULT_WEEK_COUNT = 52;
export const DEFAULT_UNIT_CENTS: Cents = 100;

/** Somme 1 + 2 + … + n, multipliée par l'unité : 1 378 € pour 52 semaines à 1 €. */
export function progressionTotal(weekCount: number, unitCents: Cents): Cents {
  return ((weekCount * (weekCount + 1)) / 2) * unitCents;
}

/** Montant prévu de la semaine `index` (1-based) en mode classique ou inversé. */
export function plannedAmountForWeek(
  type: 'classic' | 'reverse',
  index: number,
  weekCount: number,
  unitCents: Cents,
): Cents {
  if (index < 1 || index > weekCount) throw new RangeError(`Semaine hors plage : ${index}`);
  return (type === 'classic' ? index : weekCount + 1 - index) * unitCents;
}

/**
 * Répartit `targetCents` sur `weekCount` semaines selon la stratégie, au centime près :
 * la somme des montants est toujours exactement égale à la cible.
 */
export function distributeTarget(targetCents: Cents, weekCount: number, strategy: CustomStrategy): Cents[] {
  if (weekCount < 1) throw new RangeError('Au moins une semaine est nécessaire');
  if (targetCents < 0) throw new RangeError('Montant négatif');

  // Poids entiers : 1 pour « equal », 1..n pour « increasing », n..1 pour « decreasing ».
  const weights = Array.from({ length: weekCount }, (_, i) =>
    strategy === 'equal' ? 1 : strategy === 'increasing' ? i + 1 : weekCount - i,
  );
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // Arrondi à l'euro inférieur quand c'est possible, pour des montants faciles à verser.
  const roundTo = targetCents >= weightSum * 100 ? 100 : 1;
  const amounts = weights.map((w) => Math.floor((targetCents * w) / weightSum / roundTo) * roundTo);

  // Le reliquat est réparti par unités d'arrondi en partant des semaines les plus lourdes.
  let remainder = targetCents - sumCents(amounts);
  const order = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i);
  for (let k = 0; remainder > 0; k = (k + 1) % weekCount) {
    const step = Math.min(roundTo, remainder);
    amounts[order[k].i] += step;
    remainder -= step;
  }
  return amounts;
}

/** Montants prévus de toutes les semaines (null pour le mode libre). */
export function buildPlan(params: {
  type: ChallengeType;
  weekCount: number;
  unitCents: Cents;
  targetCents: Cents;
  strategy: CustomStrategy | null;
}): (Cents | null)[] {
  const { type, weekCount, unitCents, targetCents, strategy } = params;
  switch (type) {
    case 'classic':
    case 'reverse':
      return Array.from({ length: weekCount }, (_, i) => plannedAmountForWeek(type, i + 1, weekCount, unitCents));
    case 'free':
      return Array.from({ length: weekCount }, () => null);
    case 'custom':
      return distributeTarget(targetCents, weekCount, strategy ?? 'equal');
  }
}

/** Premier jour de la semaine `index`. */
export function weekStartDate(startDate: LocalDate, index: number): LocalDate {
  return addDays(startDate, (index - 1) * 7);
}

/** Semaine en cours (1-based) ; 0 avant le début, weekCount + 1 après la fin. */
export function currentWeekIndex(startDate: LocalDate, today: LocalDate, weekCount: number): number {
  const days = diffDays(startDate, today);
  if (days < 0) return 0;
  return Math.min(weekCount + 1, Math.floor(days / 7) + 1);
}

/** Nombre de semaines nécessaires pour atteindre une date cible (au moins 1). */
export function weeksUntil(startDate: LocalDate, targetDate: LocalDate): number {
  return Math.max(1, Math.ceil((diffDays(startDate, targetDate) + 1) / 7));
}

/**
 * Effort hebdomadaire nécessaire pour atteindre une cible avant une date.
 * Arrondi au centime supérieur : l'effort annoncé n'est jamais sous-estimé.
 */
export function requiredWeeklyCents(targetCents: Cents, weekCount: number): Cents {
  return Math.ceil(targetCents / Math.max(1, weekCount));
}
