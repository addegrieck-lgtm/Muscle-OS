import { describe, expect, it } from 'vitest';
import { applySession, evaluateExercise, nextLoad, readinessScore, shouldDeload } from '../src/engines/progressionEngine';
import { planCardio, weeklyCardioMinutes, runWalkBlocks, type CardioInput } from '../src/engines/cardioPlanner';
import { computeAdjustment, adjustWorkout } from '../src/engines/recoveryAdjuster';
import { buildProgram } from '../src/engines/programService';
import { makeUser } from './fixtures';
import type { ExerciseLog, Feedback, WorkoutSession } from '../src/types/models';

const log = (exerciseId: string, reps: number[], feedback: Feedback, repMin: number, repMax: number, load?: number): ExerciseLog => ({
  exerciseId,
  planned: { exerciseId, sets: reps.length, repMin, repMax, restSec: 90, rir: 2, load },
  sets: reps.map((r) => ({ reps: r, load, done: true })),
  feedback,
});

describe('ProgressionEngine', () => {
  it('augmente les répétitions quand le haut de fourchette est atteint (poids du corps)', () => {
    const r = evaluateExercise(log('pushup', [15, 15, 15], 'ok', 8, 15), undefined, '2026-01-10');
    expect(r.change).toBe('reps');
    expect(r.progress.repMax).toBe(17);
    expect(r.progress.repMax - 15).toBeLessThanOrEqual(2); // jamais brutal
  });

  it('augmente la charge de ≈5 % max quand l’exercice est chargé', () => {
    const r = evaluateExercise(log('db_floor_press', [12, 12, 12], 'easy', 8, 12, 20), undefined, '2026-01-10');
    expect(r.change).toBe('load');
    expect(r.progress.load).toBe(21);
    expect(nextLoad(10)).toBe(11); // incrément minimum 1 kg
    expect(nextLoad(60)).toBe(63);
  });

  it('propose une variante plus difficile au plafond', () => {
    const r = evaluateExercise(log('pushup', [20, 20, 20], 'easy', 18, 20), { exerciseId: 'pushup', baseExerciseId: 'pushup', repMin: 18, repMax: 20, sets: 3, topStreak: 0, failStreak: 0 }, '2026-01-10');
    expect(r.change).toBe('variant');
    expect(r.progress.exerciseId).toBe('decline_pushup');
  });

  it('ne progresse pas si la séance est jugée difficile', () => {
    const r = evaluateExercise(log('pushup', [15, 15, 15], 'hard', 8, 15), undefined, '2026-01-10');
    expect(r.change).toBe('hold');
  });

  it('réduit après deux échecs consécutifs', () => {
    const first = evaluateExercise(log('db_row', [5, 5, 4], 'very_hard', 8, 12, 20), undefined, '2026-01-10');
    expect(first.change).toBe('hold');
    const second = evaluateExercise(log('db_row', [5, 4, 4], 'very_hard', 8, 12, 20), first.progress, '2026-01-12');
    expect(second.change).toBe('reduce');
    expect(second.progress.load).toBe(18);
  });

  it('régresse vers une variante plus douce en cas de douleur', () => {
    const l = log('pushup', [10, 10], 'ok', 8, 15);
    l.pain = true;
    const r = evaluateExercise(l, undefined, '2026-01-10');
    expect(r.change).toBe('regress');
    expect(r.progress.exerciseId).toBe('incline_pushup');
  });

  it('applySession conserve la clé de l’exercice d’origine', () => {
    const session: WorkoutSession = { id: 's', date: '2026-01-10', workoutId: 'w-A', title: 'A', startedAt: '', exercises: [log('pushup', [20, 20, 20], 'easy', 18, 20)] };
    const { progress } = applySession(session, { pushup: { exerciseId: 'pushup', baseExerciseId: 'pushup', repMin: 18, repMax: 20, sets: 3, topStreak: 0, failStreak: 0 } });
    expect(progress.pushup.exerciseId).toBe('decline_pushup');
    // le programme suivant utilise la variante débloquée
    const p = buildProgram(makeUser({ equipment: ['chair'] }, { chest: 'priority' }), { week: 2, progress });
    const ids = p.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId));
    expect(ids).not.toContain('pushup');
  });

  it('déclenche une décharge programmée et en cas de fatigue', () => {
    expect(shouldDeload({ week: 6, level: 'intermediate', recovery: [], sessions: [], today: '2026-02-01' }).deload).toBe(true);
    expect(shouldDeload({ week: 3, level: 'intermediate', recovery: [], sessions: [], today: '2026-02-01' }).deload).toBe(false);
    const tired = ['2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31'].map((date) => ({ date, energy: 1, sleep: 2, soreness: 5, motivation: 2 }));
    expect(shouldDeload({ week: 3, level: 'intermediate', recovery: tired, sessions: [], today: '2026-02-01' }).deload).toBe(true);
  });
});

describe('RecoveryAdjuster', () => {
  it('score de forme borné et cohérent', () => {
    expect(readinessScore({ energy: 5, sleep: 5, soreness: 1, motivation: 5 })).toBe(100);
    expect(readinessScore({ energy: 1, sleep: 1, soreness: 5, motivation: 1 })).toBe(0);
  });
  it('allège la séance quand la forme est basse', () => {
    const adj = computeAdjustment({ date: 'x', energy: 1, sleep: 1, soreness: 4, motivation: 2 });
    expect(adj.band).toBe('low');
    const p = buildProgram(makeUser(), { week: 1 });
    const w = p.workouts[0];
    const a = adjustWorkout(w, adj);
    expect(a.exercises.reduce((s, e) => s + e.sets, 0)).toBeLessThan(w.exercises.reduce((s, e) => s + e.sets, 0));
  });
});

describe('CardioPlanner', () => {
  const base: CardioInput = {
    goal: 'cardio',
    level: 'beginner',
    runningExperience: 'none',
    cardioEquipment: ['outdoor_run'],
    strengthWeekdays: [0, 2, 4],
    strengthKinds: ['full', 'full', 'full'],
    week: 1,
  };

  it('progression hebdomadaire ≤ 10 % et semaine allégée toutes les 4 semaines', () => {
    const mins = Array.from({ length: 12 }, (_, i) => weeklyCardioMinutes({ ...base, week: i + 1 }));
    for (let i = 1; i < mins.length; i++) {
      if ((i + 1) % 4 === 0) expect(mins[i]).toBeLessThan(mins[i - 1]);
      else if (i % 4 !== 0) expect(mins[i]).toBeLessThanOrEqual(Math.ceil(mins[i - 1] * 1.1 / 5) * 5 + 5);
    }
  });

  it('débutant complet : alternance course/marche progressive', () => {
    const w1 = runWalkBlocks(1);
    const w5 = runWalkBlocks(5);
    expect(w1.find((b) => b.label.startsWith('Course'))!.minutes).toBeLessThan(w5.find((b) => b.label.startsWith('Course'))!.minutes);
  });

  it('pas de séance intense la veille ou le jour d’une séance jambes', () => {
    const plan = planCardio({ ...base, level: 'intermediate', runningExperience: 'regular', week: 3 });
    for (const s of plan.sessions.filter((x) => x.workout.hard)) {
      expect(base.strengthWeekdays).not.toContain(s.weekday);
      expect(base.strengthWeekdays).not.toContain((s.weekday + 1) % 7);
    }
  });

  it('volume de cardio limité en forte charge musculaire (objectif muscle)', () => {
    const heavy = weeklyCardioMinutes({ ...base, goal: 'muscle_gain', level: 'advanced', runningExperience: 'regular', strengthWeekdays: [0, 1, 2, 3, 4, 5], strengthKinds: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], week: 10 });
    expect(heavy).toBeLessThanOrEqual(90);
  });

  it('aucune séance intense pour un débutant en semaine 1 et en décharge', () => {
    expect(planCardio({ ...base, goal: 'fat_loss' }).sessions.some((s) => s.workout.hard)).toBe(false);
    expect(planCardio({ ...base, level: 'advanced', deload: true, week: 5 }).sessions.some((s) => s.workout.hard)).toBe(false);
  });

  it('sans équipement de course : marche ou vélo', () => {
    const plan = planCardio({ ...base, cardioEquipment: ['none'], goal: 'fat_loss' });
    for (const s of plan.sessions) expect(['walk', 'bodyweight']).toContain(s.workout.modality);
  });

  it('gèle la progression si le cardio récent a été trop dur', () => {
    const normal = weeklyCardioMinutes({ ...base, week: 3 });
    const frozen = weeklyCardioMinutes({ ...base, week: 3, recentFeedback: ['very_hard', 'hard', 'very_hard'] });
    expect(frozen).toBeLessThanOrEqual(normal);
  });
});

describe('ProgressionEngine — cas particuliers', () => {
  it('demande la charge au lieu de progresser si un exercice à haltères est fait sans charge saisie', () => {
    const r = evaluateExercise(log('db_curl', [15, 15, 15], 'easy', 10, 15), undefined, '2026-01-10');
    expect(r.change).toBe('hold');
    expect(r.message).toMatch(/charge/);
  });
  it('les exercices en secondes progressent par paliers de 5 s', () => {
    const r = evaluateExercise(log('plank', [45, 45, 45], 'ok', 20, 45), undefined, '2026-01-10');
    expect(r.change).toBe('reps');
    expect(r.progress.repMax).toBe(50);
  });
});
