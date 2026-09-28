import { describe, expect, it } from 'vitest';
import { makeUser } from './fixtures';
import { buildProgram } from '../src/engines/programService';
import { computeWeeklyVolumes, sessionSetCapacity } from '../src/engines/musclePriorityEngine';
import { generateQuickWorkout, hasEquipment } from '../src/engines/workoutGenerator';
import { EXERCISES, getExercise } from '../src/data/exercises';
import { MUSCLE_IDS } from '../src/data/reference';
import type { MuscleGroupId, Program, User } from '../src/types/models';

const setsFor = (p: Program, m: MuscleGroupId) => p.volumes.find((v) => v.muscle === m)!.weeklySets;
const allExercises = (p: Program) => p.workouts.flatMap((w) => w.exercises.map((e) => getExercise(e.exerciseId)));

describe('Bibliothèque d’exercices', () => {
  it('a des références de progression/régression valides', () => {
    for (const e of EXERCISES) {
      if (e.progression) expect(() => getExercise(e.progression!), `${e.id} → ${e.progression}`).not.toThrow();
      if (e.regression) expect(() => getExercise(e.regression!), `${e.id} → ${e.regression}`).not.toThrow();
    }
  });
  it('propose au moins un exercice sans matériel pour chaque muscle', () => {
    for (const m of MUSCLE_IDS) {
      expect(EXERCISES.some((e) => e.primary === m && e.equipment.length === 0), m).toBe(true);
    }
  });
  it('a des identifiants uniques et assez d’exercices', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(80);
  });
});

describe('MusclePriorityEngine', () => {
  const base = { level: 'intermediate' as const, goal: 'muscle_gain' as const, daysPerWeek: 4, sessionMinutes: 60 };

  it('donne plus de volume aux muscles prioritaires sans supprimer les autres', () => {
    const normal = computeWeeklyVolumes({ ...base, priorities: makeUser().musclePriorities });
    const prio = computeWeeklyVolumes({ ...base, priorities: makeUser({}, { chest: 'priority' }).musclePriorities });
    const c0 = normal.find((v) => v.muscle === 'chest')!.weeklySets;
    const c1 = prio.find((v) => v.muscle === 'chest')!.weeklySets;
    expect(c1).toBeGreaterThan(c0);
    for (const v of prio) expect(v.weeklySets).toBeGreaterThanOrEqual(1);
  });

  it('respecte l’ordre normal < important < prioritaire', () => {
    const v = computeWeeklyVolumes({ ...base, priorities: makeUser({}, { chest: 'priority', lats: 'important' }).musclePriorities });
    const chest = v.find((x) => x.muscle === 'chest')!.weeklySets;
    const lats = v.find((x) => x.muscle === 'lats')!.weeklySets;
    const quads = v.find((x) => x.muscle === 'quads')!.weeklySets;
    expect(chest).toBeGreaterThan(lats);
    expect(lats).toBeGreaterThan(quads);
  });

  it('ne dépasse jamais la capacité hebdomadaire disponible (hors plancher 1 série)', () => {
    const v = computeWeeklyVolumes({ ...base, daysPerWeek: 2, sessionMinutes: 20, priorities: makeUser({}, { chest: 'priority', abs: 'priority' }).musclePriorities });
    const total = v.reduce((a, x) => a + x.weeklySets, 0);
    expect(total).toBeLessThanOrEqual(Math.max(2 * sessionSetCapacity(20), MUSCLE_IDS.length));
  });

  it('plafonne le volume des muscles prioritaires', () => {
    const v = computeWeeklyVolumes({ ...base, level: 'beginner', week: 20, priorities: makeUser({}, { chest: 'priority' }).musclePriorities });
    expect(v.find((x) => x.muscle === 'chest')!.weeklySets).toBeLessThanOrEqual(12);
  });

  it('réduit le volume en décharge', () => {
    const p = makeUser().musclePriorities;
    const a = computeWeeklyVolumes({ ...base, priorities: p });
    const b = computeWeeklyVolumes({ ...base, priorities: p, deload: true });
    expect(b.reduce((s, x) => s + x.weeklySets, 0)).toBeLessThan(a.reduce((s, x) => s + x.weeklySets, 0));
  });
});

describe('WorkoutGenerator — profils types', () => {
  const check = (u: User) => {
    const p = buildProgram(u, { week: 1 });
    // nombre de séances de musculation = jours choisis
    expect(p.workouts.filter((w) => w.kind !== 'core').length).toBe(u.daysPerWeek);
    // matériel respecté
    for (const e of allExercises(p)) expect(hasEquipment(e, u.equipment), `${e.id} requiert ${e.equipment}`).toBe(true);
    // durée respectée (tolérance 15 %)
    for (const w of p.workouts) expect(w.estimatedMinutes).toBeLessThanOrEqual(Math.round(u.sessionMinutes * 1.15) + 1);
    // pas d'exercice en double dans une séance
    for (const w of p.workouts) expect(new Set(w.exercises.map((e) => e.exerciseId)).size).toBe(w.exercises.length);
    return p;
  };

  it('débutant sans matériel', () => {
    const u = makeUser({ level: 'beginner', equipment: ['bodyweight'] });
    const p = check(u);
    for (const e of allExercises(p)) expect(e.equipment).toEqual([]);
    for (const e of allExercises(p)) expect(e.difficulty).toBeLessThanOrEqual(3);
  });

  it('intermédiaire avec haltères utilise des exercices chargés', () => {
    const u = makeUser({ level: 'intermediate', equipment: ['dumbbells', 'bench', 'chair'], daysPerWeek: 4, sessionMinutes: 60 });
    const p = check(u);
    expect(allExercises(p).some((e) => e.equipment.includes('dumbbells'))).toBe(true);
    expect(p.splitName).toContain('Haut');
  });

  it('priorité pectoraux : plus de séries de pecs, placés en premier', () => {
    const u0 = makeUser({ level: 'intermediate', equipment: ['dumbbells'] });
    const u1 = makeUser({ level: 'intermediate', equipment: ['dumbbells'] }, { chest: 'priority' });
    const p0 = check(u0);
    const p1 = check(u1);
    expect(setsFor(p1, 'chest')).toBeGreaterThan(setsFor(p0, 'chest'));
    const first = p1.workouts.filter((w) => w.exercises.some((e) => getExercise(e.exerciseId).primary === 'chest'));
    for (const w of first) expect(getExercise(w.exercises[0].exerciseId).primary).toBe('chest');
    expect(setsFor(p1, 'chest')).toBeGreaterThanOrEqual(8);
  });

  it('priorité abdominaux : gainage supplémentaire planifié', () => {
    const u = makeUser({}, { abs: 'priority' });
    const p = check(u);
    expect(p.workouts.some((w) => w.kind === 'core')).toBe(true);
    expect(p.schedule.filter((d) => d.core).length).toBe(2);
    const base = buildProgram(makeUser(), { week: 1 });
    expect(setsFor(p, 'abs')).toBeGreaterThan(setsFor(base, 'abs'));
  });

  it('priorité jambes : quadriceps/fessiers/ischios augmentés', () => {
    const u = makeUser({ level: 'intermediate', daysPerWeek: 4, sessionMinutes: 60 }, { quads: 'priority', glutes: 'priority', hamstrings: 'priority' });
    const base = buildProgram(makeUser({ level: 'intermediate', daysPerWeek: 4, sessionMinutes: 60 }), { week: 1 });
    const p = check(u);
    for (const m of ['quads', 'glutes', 'hamstrings'] as MuscleGroupId[]) expect(setsFor(p, m)).toBeGreaterThan(setsFor(base, m));
  });

  it('priorités multiples : tous les prioritaires progressent, le reste est maintenu', () => {
    const u = makeUser({ level: 'intermediate', equipment: ['dumbbells', 'pullup_bar'], daysPerWeek: 5, sessionMinutes: 60 }, { chest: 'priority', abs: 'priority', shoulders: 'important' });
    const base = buildProgram(makeUser({ level: 'intermediate', equipment: ['dumbbells', 'pullup_bar'], daysPerWeek: 5, sessionMinutes: 60 }), { week: 1 });
    const p = check(u);
    expect(setsFor(p, 'chest')).toBeGreaterThan(setsFor(base, 'chest'));
    expect(setsFor(p, 'abs')).toBeGreaterThan(setsFor(base, 'abs'));
    expect(setsFor(p, 'shoulders')).toBeGreaterThanOrEqual(setsFor(base, 'shoulders'));
    for (const m of ['lats', 'quads', 'glutes'] as MuscleGroupId[]) expect(setsFor(p, m)).toBeGreaterThanOrEqual(2);
  });

  it('fonctionne pour 1 à 6 jours et des durées courtes', () => {
    for (let d = 1; d <= 6; d++) for (const min of [15, 30, 90]) check(makeUser({ daysPerWeek: d, sessionMinutes: min }));
  });

  it('séance express respecte la durée', () => {
    const u = makeUser({}, { chest: 'priority' });
    const w = generateQuickWorkout(20, { level: u.level, goal: u.goal, equipment: u.equipment, priorities: u.musclePriorities });
    expect(w.estimatedMinutes).toBeLessThanOrEqual(20);
    expect(getExercise(w.exercises[0].exerciseId).primary).toBe('chest');
  });
});

describe('Équilibre du programme', () => {
  it('les grands muscles non prioritaires gardent un volume significatif', () => {
    const u = makeUser({ level: 'intermediate', goal: 'recomp', daysPerWeek: 4, sessionMinutes: 45, equipment: ['chair', 'dumbbells', 'pullup_bar', 'bench'] }, { chest: 'priority', abs: 'priority', shoulders: 'important', glutes: 'important' });
    const p = buildProgram(u, { week: 1 });
    const chest = setsFor(p, 'chest');
    for (const m of ['lats', 'quads', 'hamstrings'] as MuscleGroupId[]) {
      expect(setsFor(p, m), m).toBeGreaterThanOrEqual(5);
      expect(chest / setsFor(p, m), m).toBeLessThanOrEqual(2.5);
    }
  });
});
