import { computeAchievements } from '../../src/domain/achievements';
import { buildPlan } from '../../src/domain/plan';
import {
  computeProgress,
  cumulativeSeries,
  projectFinalCents,
  regularityBp,
  weekStreaks,
} from '../../src/domain/progress';
import { mergeRows } from '../../src/domain/sync';
import type { Challenge, ChallengeType, ChallengeWeek, Deposit } from '../../src/domain/types';

function makeChallenge(type: ChallengeType, targetCents = 137_800): { challenge: Challenge; weeks: ChallengeWeek[] } {
  const challenge: Challenge = {
    id: 'c1', ownerId: null, name: 'Test', type, currency: 'EUR', targetCents, unitCents: 100, weekCount: 52,
    startDate: '2027-01-04', strategy: type === 'custom' ? 'equal' : null, icon: 'target', color: '#D9F99D',
    status: 'active', createdAt: '', updatedAt: '',
  };
  const plan = buildPlan(challenge);
  const weeks = plan.map((plannedCents, i) => ({
    challengeId: 'c1', index: i + 1, plannedCents, skipped: false, updatedAt: '',
  }));
  return { challenge, weeks };
}

let seq = 0;
function dep(weekIndex: number, amountCents: number, depositedOn = '2027-01-05', status: Deposit['status'] = 'active'): Deposit {
  return {
    id: `d${++seq}`, challengeId: 'c1', weekIndex, amountCents, depositedOn, status,
    createdAt: '2027-01-05T00:00:00Z', updatedAt: '2027-01-05T00:00:00Z',
  };
}

describe('progression', () => {
  it('challenge vide', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const p = computeProgress(challenge, weeks, [], '2027-01-04');
    expect(p.totalSavedCents).toBe(0);
    expect(p.progressBp).toBe(0);
    expect(p.remainingCents).toBe(137_800);
    expect(p.nextWeek?.index).toBe(1);
    expect(p.nextWeek?.state).toBe('current');
    expect(p.expectedToDateCents).toBe(100);
    expect(p.averageDepositCents).toBe(0);
  });

  it('cumule les versements et met à jour les statuts', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const deposits = [dep(1, 100), dep(2, 150), dep(3, 300)];
    const p = computeProgress(challenge, weeks, deposits, '2027-01-25'); // semaine 4
    expect(p.totalSavedCents).toBe(550);
    expect(p.weeks[0].state).toBe('completed');
    expect(p.weeks[1].state).toBe('partial');
    expect(p.weeks[1].missingCents).toBe(50);
    expect(p.weeks[2].state).toBe('completed');
    expect(p.weeks[3].state).toBe('current');
    expect(p.completedWeeks).toBe(2);
    expect(p.expectedToDateCents).toBe(1_000);
    expect(p.averageDepositCents).toBe(183);
  });

  it('ignore les versements annulés (annulation de validation)', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const p = computeProgress(challenge, weeks, [dep(1, 100, '2027-01-05', 'cancelled')], '2027-01-04');
    expect(p.totalSavedCents).toBe(0);
    expect(p.weeks[0].state).toBe('current');
  });

  it('distingue semaine ignorée et semaine en retard', () => {
    const { challenge, weeks } = makeChallenge('reverse');
    weeks[0].skipped = true;
    const p = computeProgress(challenge, weeks, [], '2027-01-20'); // semaine 3
    expect(p.weeks[0].state).toBe('skipped');
    expect(p.weeks[1].state).toBe('late');
    expect(p.lateWeeks).toBe(1);
    expect(p.skippedWeeks).toBe(1);
    expect(p.nextWeek?.index).toBe(3);
  });

  it('mode libre : un versement suffit à compléter une semaine, sans double comptage', () => {
    const { challenge, weeks } = makeChallenge('free', 50_000);
    const deposits = [dep(10, 2_000), dep(10, 500), dep(1, 1_000)];
    const p = computeProgress(challenge, weeks, deposits, '2027-01-04');
    expect(p.totalSavedCents).toBe(3_500);
    expect(p.weeks[9].depositedCents).toBe(2_500);
    expect(p.weeks[9].state).toBe('completed');
    expect(p.completedWeeks).toBe(2);
    expect(p.expectedToDateCents).toBeNull();
    expect(p.progressBp).toBe(700);
  });

  it('montant très élevé : objectif atteint, progression plafonnée', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const p = computeProgress(challenge, weeks, [dep(1, 10_000_000)], '2027-01-04');
    expect(p.progressBp).toBe(10_000);
    expect(p.remainingCents).toBe(0);
    expect(p.isGoalReached).toBe(true);
  });

  it('challenge entièrement réalisé', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const deposits = weeks.map((w) => dep(w.index, w.plannedCents!));
    const p = computeProgress(challenge, weeks, deposits, '2028-01-10');
    expect(p.totalSavedCents).toBe(137_800);
    expect(p.completedWeeks).toBe(52);
    expect(p.nextWeek).toBeNull();
    expect(computeAchievements(p).every((a) => a.unlocked)).toBe(true);
  });
});

describe('statistiques', () => {
  it('cumul par date', () => {
    const series = cumulativeSeries([dep(1, 100, '2027-01-05'), dep(2, 200, '2027-01-12'), dep(3, 50, '2027-01-05')]);
    expect(series).toEqual([
      { date: '2027-01-05', cumulativeCents: 150 },
      { date: '2027-01-12', cumulativeCents: 350 },
    ]);
  });

  it('séries et régularité', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const deposits = [dep(1, 100), dep(2, 200), dep(4, 400), dep(5, 500)];
    const p = computeProgress(challenge, weeks, deposits, '2027-02-08'); // semaine 6
    expect(weekStreaks(p.weeks, p.currentWeek)).toEqual({ current: 2, best: 2 });
    expect(regularityBp(p.weeks, p.currentWeek)).toBe(8_000); // 4 sur 5
  });

  it('projection indicative', () => {
    expect(projectFinalCents(0, '2027-01-04', '2027-03-01', 52)).toBeNull();
    expect(projectFinalCents(1_000, '2027-01-04', '2027-01-05', 52)).toBeNull();
    expect(projectFinalCents(14_000, '2027-01-04', '2027-01-17', 2)).toBe(14_000);
    expect(projectFinalCents(7_000, '2027-01-04', '2027-01-10', 52)).toBe(364_000);
  });

  it('les badges ne dépendent pas du montant', () => {
    const { challenge, weeks } = makeChallenge('classic');
    const p = computeProgress(challenge, weeks, [dep(1, 100)], '2027-01-04');
    const unlocked = computeAchievements(p).filter((a) => a.unlocked).map((a) => a.id);
    expect(unlocked).toEqual(['first_week']);
  });
});

describe('fusion pour la synchronisation', () => {
  it('garde la version la plus récente et ne perd aucune ligne', () => {
    type Row = { id: string; value: number; updatedAt: string };
    const local: Row[] = [
      { id: 'a', value: 1, updatedAt: '2027-01-02T00:00:00Z' },
      { id: 'b', value: 1, updatedAt: '2027-01-01T00:00:00Z' },
      { id: 'c', value: 1, updatedAt: '2027-01-01T00:00:00Z' },
    ];
    const remote: Row[] = [
      { id: 'a', value: 2, updatedAt: '2027-01-01T00:00:00Z' },
      { id: 'b', value: 2, updatedAt: '2027-01-03T00:00:00Z' },
      { id: 'd', value: 2, updatedAt: '2027-01-01T00:00:00Z' },
    ];
    const { merged, toPush, toApplyLocally } = mergeRows(local, remote, (r) => r.id);
    expect(merged.map((r) => `${r.id}${r.value}`).sort()).toEqual(['a1', 'b2', 'c1', 'd2']);
    expect(toPush.map((r) => r.id).sort()).toEqual(['a', 'c']);
    expect(toApplyLocally.map((r) => r.id).sort()).toEqual(['b', 'd']);
  });
});
