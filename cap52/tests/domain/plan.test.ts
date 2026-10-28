import { sumCents } from '../../src/domain/money';
import {
  buildPlan,
  currentWeekIndex,
  distributeTarget,
  plannedAmountForWeek,
  progressionTotal,
  requiredWeeklyCents,
  weeksUntil,
  weekStartDate,
} from '../../src/domain/plan';

describe('mode classique', () => {
  const plan = buildPlan({ type: 'classic', weekCount: 52, unitCents: 100, targetCents: 0, strategy: null });

  it('totalise 1 378 €', () => {
    expect(sumCents(plan as number[])).toBe(137_800);
    expect(progressionTotal(52, 100)).toBe(137_800);
  });

  it('prévoit n € la semaine n', () => {
    plan.forEach((amount, i) => expect(amount).toBe((i + 1) * 100));
  });

  it('a un cumul attendu correct après chaque semaine', () => {
    let cumul = 0;
    for (let n = 1; n <= 52; n++) {
      cumul += plannedAmountForWeek('classic', n, 52, 100);
      expect(cumul).toBe(((n * (n + 1)) / 2) * 100);
    }
  });
});

describe('mode inversé', () => {
  const plan = buildPlan({ type: 'reverse', weekCount: 52, unitCents: 100, targetCents: 0, strategy: null });

  it('totalise aussi 1 378 €', () => {
    expect(sumCents(plan as number[])).toBe(137_800);
  });

  it('commence à 52 € et finit à 1 €', () => {
    expect(plan[0]).toBe(5_200);
    expect(plan[51]).toBe(100);
  });

  it('refuse une semaine hors plage', () => {
    expect(() => plannedAmountForWeek('reverse', 0, 52, 100)).toThrow(RangeError);
    expect(() => plannedAmountForWeek('reverse', 53, 52, 100)).toThrow(RangeError);
  });
});

describe('mode libre', () => {
  it("n'a pas de montant prévu", () => {
    const plan = buildPlan({ type: 'free', weekCount: 52, unitCents: 100, targetCents: 100_000, strategy: null });
    expect(plan).toHaveLength(52);
    expect(plan.every((p) => p === null)).toBe(true);
  });
});

describe('objectif personnalisé', () => {
  it.each([
    ['equal', 300_000, 26],
    ['increasing', 137_800, 52],
    ['decreasing', 50_000, 10],
    ['equal', 1_001, 3], // centimes non divisibles
    ['increasing', 7, 5], // cible inférieure au nombre de poids
    ['equal', 0, 4],
  ] as const)('répartit exactement %s %i sur %i semaines', (strategy, target, weeks) => {
    const amounts = distributeTarget(target, weeks, strategy);
    expect(amounts).toHaveLength(weeks);
    expect(sumCents(amounts)).toBe(target);
    expect(amounts.every((a) => Number.isInteger(a) && a >= 0)).toBe(true);
  });

  it('arrondit à l’euro quand la cible le permet', () => {
    const amounts = distributeTarget(300_000, 26, 'equal');
    expect(amounts.every((a) => a % 100 === 0)).toBe(true);
  });

  it('respecte l’ordre croissant / décroissant', () => {
    const inc = distributeTarget(137_800, 52, 'increasing');
    const dec = distributeTarget(137_800, 52, 'decreasing');
    expect(inc[0]).toBeLessThan(inc[51]);
    expect(dec[0]).toBeGreaterThan(dec[51]);
  });

  it('refuse les entrées invalides', () => {
    expect(() => distributeTarget(100, 0, 'equal')).toThrow(RangeError);
    expect(() => distributeTarget(-1, 4, 'equal')).toThrow(RangeError);
  });

  it('calcule le nombre de semaines et l’effort jusqu’à une date', () => {
    expect(weeksUntil('2027-01-04', '2027-01-10')).toBe(1);
    expect(weeksUntil('2027-01-04', '2027-01-11')).toBe(2);
    expect(weeksUntil('2027-01-04', '2027-01-01')).toBe(1);
    expect(requiredWeeklyCents(100_000, 3)).toBe(33_334); // jamais sous-estimé
  });
});

describe('calendrier', () => {
  it('donne la semaine en cours', () => {
    expect(currentWeekIndex('2027-01-04', '2027-01-03', 52)).toBe(0);
    expect(currentWeekIndex('2027-01-04', '2027-01-04', 52)).toBe(1);
    expect(currentWeekIndex('2027-01-04', '2027-01-10', 52)).toBe(1);
    expect(currentWeekIndex('2027-01-04', '2027-01-11', 52)).toBe(2);
    expect(currentWeekIndex('2027-01-04', '2028-06-01', 52)).toBe(53);
  });

  it('traverse les changements d’heure sans décalage', () => {
    // Passage à l'heure d'été en France le 28 mars 2027.
    expect(weekStartDate('2027-03-22', 2)).toBe('2027-03-29');
    expect(weekStartDate('2027-10-25', 2)).toBe('2027-11-01');
  });
});
