import type {
  Equipment,
  Exercise,
  ExerciseProgress,
  GoalId,
  Level,
  MuscleGroupId,
  MusclePriorities,
  MuscleVolume,
  PlannedExercise,
  SessionKind,
  Workout,
} from '../types/models';
import { EXERCISES, getExercise } from '../data/exercises';
import { MUSCLE_IDS, muscleLabel } from '../data/reference';
import { ENGINE_CONFIG, type EngineConfig } from './config';
import { sessionSetCapacity } from './musclePriorityEngine';

/**
 * WorkoutGenerator
 * Construit les séances de la semaine à partir du volume par muscle, du matériel,
 * du niveau et de l'historique de progression.
 */

export const SPLITS: Record<number, { name: string; kinds: SessionKind[]; weekdays: number[] }> = {
  1: { name: 'Full body', kinds: ['full'], weekdays: [2] },
  2: { name: 'Full body A/B', kinds: ['full', 'full'], weekdays: [0, 3] },
  3: { name: 'Full body A/B/C', kinds: ['full', 'full', 'full'], weekdays: [0, 2, 4] },
  4: { name: 'Haut / Bas', kinds: ['upper', 'lower', 'upper', 'lower'], weekdays: [0, 1, 3, 4] },
  5: { name: 'Haut / Bas / Push / Pull / Jambes', kinds: ['upper', 'lower', 'push', 'pull', 'legs'], weekdays: [0, 1, 2, 4, 5] },
  6: { name: 'Push / Pull / Jambes ×2', kinds: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], weekdays: [0, 1, 2, 3, 4, 5] },
};

const CORE: MuscleGroupId[] = ['abs', 'obliques', 'lower_back'];

export const SESSION_MUSCLES: Record<SessionKind, MuscleGroupId[]> = {
  full: MUSCLE_IDS,
  upper: ['chest', 'shoulders', 'traps', 'lats', 'biceps', 'triceps', 'forearms', 'abs', 'obliques'],
  lower: ['glutes', 'quads', 'hamstrings', 'adductors', 'calves', 'lower_back', 'abs', 'obliques'],
  push: ['chest', 'shoulders', 'triceps', 'abs', 'obliques'],
  pull: ['lats', 'traps', 'biceps', 'forearms', 'lower_back', 'abs'],
  legs: ['quads', 'glutes', 'hamstrings', 'adductors', 'calves', 'lower_back', 'obliques', 'abs'],
  core: CORE,
};

const KIND_LABEL: Record<SessionKind, string> = {
  full: 'Full body',
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  push: 'Push',
  pull: 'Pull',
  legs: 'Jambes',
  core: 'Gainage',
};

export interface GeneratorInput {
  level: Level;
  goal: GoalId;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
  priorities: MusclePriorities;
  volumes: MuscleVolume[];
  progress?: Record<string, ExerciseProgress>;
  week?: number;
  deload?: boolean;
}

// ---------- Sélection d'exercices ----------

export function hasEquipment(ex: Exercise, owned: Equipment[]): boolean {
  return ex.equipment.every((e) => owned.includes(e));
}

const DIFFICULTY_TARGET: Record<Level, number> = { beginner: 1.6, intermediate: 2.8, advanced: 3.8 };
const DIFFICULTY_MAX: Record<Level, number> = { beginner: 3, intermediate: 4, advanced: 5 };

export function availableExercises(owned: Equipment[], level: Level): Exercise[] {
  return EXERCISES.filter((e) => hasEquipment(e, owned) && e.difficulty <= DIFFICULTY_MAX[level]);
}

/** Score de pertinence d'un exercice pour un muscle donné. Plus haut = meilleur. */
export function scoreExercise(ex: Exercise, level: Level, goal: GoalId, owned: Equipment[]): number {
  let score = 10 - Math.abs(ex.difficulty - DIFFICULTY_TARGET[level]) * 2;
  if (ex.loadable && ex.equipment.length > 0) score += goal === 'strength' || goal === 'muscle_gain' ? 3 : 2; // charge externe = progression simple
  if (ex.compound) score += 1.5;
  if (ex.equipment.includes('backpack') && (owned.includes('dumbbells') || owned.includes('kettlebell'))) score -= 1.5;
  if (ex.pattern === 'squat' && ex.id === 'jump_squat' && goal !== 'cardio' && goal !== 'fat_loss') score -= 3;
  if (ex.mode === 'time' && ex.primary !== 'abs' && ex.primary !== 'obliques' && ex.primary !== 'forearms') score -= 2;
  if (ex.id === 'wall_hspu') score -= 2; // réservé aux pratiquants très à l'aise
  if (ex.id === 'mountain_climber') score -= 1.5; // plutôt conditionnement que renforcement
  return score;
}

export function rankExercisesFor(
  muscle: MuscleGroupId,
  owned: Equipment[],
  level: Level,
  goal: GoalId,
): Exercise[] {
  let pool = availableExercises(owned, level).filter((e) => e.primary === muscle);
  if (!pool.length) {
    // Repli : exercice accessible le plus proche en difficulté, quel que soit le niveau.
    pool = EXERCISES.filter((e) => e.primary === muscle && hasEquipment(e, owned));
  }
  return pool
    .map((e) => ({ e, s: scoreExercise(e, level, goal, owned) }))
    .sort((a, b) => b.s - a.s || a.e.id.localeCompare(b.e.id))
    .map((x) => x.e);
}

// ---------- Prescription ----------

export function prescribe(
  ex: Exercise,
  sets: number,
  level: Level,
  goal: GoalId,
  progress?: ExerciseProgress,
  config: EngineConfig = ENGINE_CONFIG,
): PlannedExercise {
  let [repMin, repMax] = ex.defaultRange;
  let rest = ex.restSec;
  if (goal === 'strength' && ex.loadable && ex.mode === 'reps') {
    repMin = Math.max(4, repMin - 4);
    repMax = Math.max(repMin + 2, repMax - 5);
    rest = ex.compound ? 150 : 90; // grgic-2018-rest
  }
  if ((goal === 'fat_loss' || goal === 'cardio' || goal === 'general') && !ex.compound) rest = Math.min(rest, 60);
  if (level === 'beginner' && ex.mode === 'time') repMax = Math.min(repMax, 40);

  const planned: PlannedExercise = {
    exerciseId: ex.id,
    sets,
    repMin,
    repMax,
    restSec: rest,
    rir: config.targetRir[level],
  };
  if (progress && progress.exerciseId === ex.id) {
    planned.repMin = progress.repMin;
    planned.repMax = progress.repMax;
    if (progress.load != null) planned.load = progress.load;
    if (progress.tempo) planned.tempo = progress.tempo;
    if (progress.lastMessage) planned.note = progress.lastMessage;
  }
  return planned;
}

/** Durée estimée d'un exercice planifié (min) : effort + repos. */
export function estimateExerciseMinutes(p: PlannedExercise): number {
  const ex = getExercise(p.exerciseId);
  const mid = (p.repMin + p.repMax) / 2;
  let workSec = ex.mode === 'time' ? mid : mid * 3.2;
  if (ex.unilateral) workSec *= 2;
  const perSet = workSec + p.restSec + 10; // + mise en place
  return (p.sets * perSet) / 60;
}

export function estimateWorkoutMinutes(exs: PlannedExercise[], config: EngineConfig = ENGINE_CONFIG): number {
  return Math.round(config.warmupMinutes + exs.reduce((a, p) => a + estimateExerciseMinutes(p), 0));
}

// ---------- Répartition des séries dans la semaine ----------

/**
 * Répartit les séries hebdomadaires de chaque muscle dans les séances éligibles.
 * Retourne une matrice allocation[sessionIndex][muscle] = séries.
 */
export function distributeVolume(
  kinds: SessionKind[],
  volumes: MuscleVolume[],
  perSessionCap: number,
): Record<MuscleGroupId, number>[] {
  const alloc = kinds.map(() => ({}) as Record<MuscleGroupId, number>);
  const load = kinds.map(() => 0);
  // muscles les plus prioritaires et volumineux d'abord
  const ordered = [...volumes].sort((a, b) => b.multiplier - a.multiplier || b.weeklySets - a.weeklySets);

  for (const v of ordered) {
    const eligible = kinds.map((k, i) => (SESSION_MUSCLES[k].includes(v.muscle) ? i : -1)).filter((i) => i >= 0);
    if (!eligible.length) continue;
    const freq = Math.min(v.frequency, eligible.length, v.weeklySets);
    // choisit les séances les moins chargées en gardant un espacement (ordre initial conservé)
    const chosen = [...eligible]
      .sort((a, b) => load[a] - load[b] || a - b)
      .slice(0, freq)
      .sort((a, b) => a - b);
    const base = Math.floor(v.weeklySets / chosen.length);
    let rem = v.weeklySets % chosen.length;
    for (const i of chosen) {
      const s = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      if (s <= 0) continue;
      alloc[i][v.muscle] = s;
      load[i] += s;
    }
  }

  // Respect de la capacité par séance : retrait des muscles les moins prioritaires.
  alloc.forEach((a, i) => {
    let over = load[i] - perSessionCap;
    if (over <= 0) return;
    const byLowPriority = (Object.keys(a) as MuscleGroupId[]).sort((m1, m2) => {
      const v1 = volumes.find((v) => v.muscle === m1)!;
      const v2 = volumes.find((v) => v.muscle === m2)!;
      return v1.multiplier - v2.multiplier || a[m2] - a[m1];
    });
    let guard = 200;
    while (over > 0 && guard-- > 0) {
      let reduced = false;
      for (const m of byLowPriority) {
        if (over <= 0) break;
        if (a[m] > 1) {
          a[m] -= 1;
          over -= 1;
          reduced = true;
        }
      }
      if (!reduced) {
        // tout est à 1 série : on retire des muscles normaux secondaires
        const drop = byLowPriority.find((m) => a[m] === 1 && volumes.find((v) => v.muscle === m)!.multiplier === 1);
        if (!drop) break;
        delete a[drop];
        over -= 1;
      }
    }
    load[i] = Object.values(a).reduce((x, y) => x + y, 0);
  });
  return alloc;
}

// ---------- Génération ----------

function splitSets(total: number): number[] {
  if (total <= 4) return [total];
  if (total <= 8) return [Math.ceil(total / 2), Math.floor(total / 2)];
  const a = Math.ceil(total / 3);
  const b = Math.ceil((total - a) / 2);
  return [a, b, total - a - b];
}

export function orderExercises(list: PlannedExercise[], priorities: MusclePriorities): PlannedExercise[] {
  const weight = (p: PlannedExercise) => {
    const ex = getExercise(p.exerciseId);
    const prio = priorities[ex.primary];
    const prioScore = prio === 'priority' ? 2 : prio === 'important' ? 1 : 0;
    const isCore = CORE.includes(ex.primary) || ex.pattern === 'core_anti' || ex.pattern === 'core_flex';
    // simao-2012 : polyarticulaires et muscles prioritaires en début de séance ; gainage en fin.
    return (isCore ? -100 : 0) + prioScore * 25 + (ex.compound ? 20 : 0);
  };
  return [...list].sort((a, b) => weight(b) - weight(a));
}

export function buildWorkout(
  kind: SessionKind,
  index: number,
  allocation: Record<MuscleGroupId, number>,
  input: GeneratorInput,
  usedInWeek: Map<string, number>,
  config: EngineConfig = ENGINE_CONFIG,
): Workout {
  const { level, goal, equipment, priorities, progress } = input;
  const used = new Set<string>();
  const planned: PlannedExercise[] = [];

  const muscles = (Object.keys(allocation) as MuscleGroupId[]).sort((a, b) => allocation[b] - allocation[a]);
  for (const m of muscles) {
    const chunks = splitSets(allocation[m]);
    const ranked = rankExercisesFor(m, equipment, level, goal);
    // rotation : on privilégie les exercices les moins utilisés cette semaine (variété entre séances A/B/C)
    const rotated = [...ranked].sort((a, b) => (usedInWeek.get(a.id) ?? 0) - (usedInWeek.get(b.id) ?? 0));
    const top = rotated.slice(0, Math.max(chunks.length + 1, 3));
    const candidates = [...top, ...rotated.filter((e) => !top.includes(e))];
    let ci = 0;
    for (const sets of chunks) {
      while (ci < candidates.length && used.has(candidates[ci].id)) ci++;
      if (ci >= candidates.length) {
        // pas d'autre exercice : on ajoute les séries au précédent
        const prev = planned.find((p) => getExercise(p.exerciseId).primary === m);
        if (prev) prev.sets = Math.min(prev.sets + sets, 5);
        continue;
      }
      let ex = candidates[ci];
      // Substitution par la variante acquise (progression)
      const prog = progress?.[ex.id];
      if (prog && prog.exerciseId !== ex.id) {
        const variant = getExercise(prog.exerciseId);
        if (hasEquipment(variant, equipment) && !used.has(variant.id)) ex = variant;
      }
      used.add(ex.id);
      used.add(candidates[ci].id);
      usedInWeek.set(candidates[ci].id, (usedInWeek.get(candidates[ci].id) ?? 0) + 1);
      const s = Math.max(config.setsPerExercise.min, Math.min(config.setsPerExercise.max, sets));
      planned.push(prescribe(ex, sets < config.setsPerExercise.min ? sets : s, level, goal, progress?.[ex.id] ?? progress?.[candidates[ci].id], config));
      ci++;
    }
  }

  let ordered = orderExercises(planned, priorities);

  // Ajustement au temps disponible : on retire des séries des exercices les moins prioritaires.
  let guard = 60;
  while (estimateWorkoutMinutes(ordered, config) > input.sessionMinutes * 1.1 && guard-- > 0) {
    const victim = [...ordered].reverse().find((p) => {
      const ex = getExercise(p.exerciseId);
      return priorities[ex.primary] === 'normal' && p.sets > 1;
    }) ?? [...ordered].reverse().find((p) => p.sets > 1);
    if (!victim) {
      // dernier recours : retirer l'exercice normal le moins important
      const drop = [...ordered].reverse().find((p) => priorities[getExercise(p.exerciseId).primary] === 'normal');
      if (!drop || ordered.length <= 2) break;
      ordered = ordered.filter((p) => p !== drop);
    } else {
      victim.sets -= 1;
    }
  }

  const setsByMuscle = new Map<MuscleGroupId, number>();
  for (const p of ordered) {
    const m = getExercise(p.exerciseId).primary;
    setsByMuscle.set(m, (setsByMuscle.get(m) ?? 0) + p.sets);
  }
  const focus = [...setsByMuscle.entries()]
    .filter(([m]) => !CORE.includes(m) || priorities[m] !== 'normal')
    .sort((a, b) => {
      const pa = priorities[a[0]] === 'priority' ? 2 : priorities[a[0]] === 'important' ? 1 : 0;
      const pb = priorities[b[0]] === 'priority' ? 2 : priorities[b[0]] === 'important' ? 1 : 0;
      return pb - pa || b[1] - a[1];
    })
    .map(([m]) => m);
  const hasCore = ordered.some((p) => CORE.includes(getExercise(p.exerciseId).primary));
  const letter = String.fromCharCode(65 + index);

  return {
    id: `w-${letter}`,
    kind,
    title: `${KIND_LABEL[kind]} ${letter}`,
    focus: focus.slice(0, 4),
    exercises: ordered,
    estimatedMinutes: estimateWorkoutMinutes(ordered, config),
    coreFinisher: hasCore,
  };
}

export function generateWorkouts(input: GeneratorInput, config: EngineConfig = ENGINE_CONFIG): { splitName: string; workouts: Workout[]; weekdays: number[] } {
  const days = Math.min(6, Math.max(1, input.daysPerWeek));
  const split = SPLITS[days];
  const cap = sessionSetCapacity(input.sessionMinutes, config);
  const allocation = distributeVolume(split.kinds, input.volumes, cap);
  const usedInWeek = new Map<string, number>();
  const workouts = split.kinds.map((k, i) => buildWorkout(k, i, allocation[i], input, usedInWeek, config));
  return { splitName: split.name, workouts, weekdays: split.weekdays };
}

/** Séances de secours (« je n'ai que 20 minutes ») : circuit full body qui respecte les priorités. */
export function generateQuickWorkout(
  minutes: number,
  input: Omit<GeneratorInput, 'volumes' | 'daysPerWeek' | 'sessionMinutes'>,
  config: EngineConfig = ENGINE_CONFIG,
): Workout {
  const { priorities, equipment, level, goal } = input;
  const prio = MUSCLE_IDS.filter((m) => priorities[m] === 'priority');
  const important = MUSCLE_IDS.filter((m) => priorities[m] === 'important');
  const base: MuscleGroupId[] = ['chest', 'lats', 'quads', 'glutes', 'shoulders', 'abs'];
  const muscles = [...new Set([...prio, ...important, ...base])];
  const setsBudget = Math.max(4, Math.floor((minutes - 3) / 2));
  const perMuscle = new Map<MuscleGroupId, number>();
  let remaining = setsBudget;
  // 3 séries pour les prioritaires, 2 pour le reste, dans la limite du budget
  for (const m of muscles) {
    if (remaining <= 0) break;
    const s = Math.min(remaining, priorities[m] === 'priority' ? 3 : 2);
    perMuscle.set(m, s);
    remaining -= s;
  }
  const exercises: PlannedExercise[] = [];
  const used = new Set<string>();
  for (const [m, s] of perMuscle) {
    const ex = rankExercisesFor(m, equipment, level, goal).find((e) => !used.has(e.id));
    if (!ex) continue;
    used.add(ex.id);
    const p = prescribe(ex, s, level, goal, input.progress?.[ex.id], config);
    p.restSec = Math.min(p.restSec, 45); // format circuit
    exercises.push(p);
  }
  const ordered = orderExercises(exercises, priorities);
  const cfg = { ...config, warmupMinutes: 3 };
  while (estimateWorkoutMinutes(ordered, cfg) > minutes && ordered.length > 2) {
    const victim = [...ordered].reverse().find((p) => p.sets > 1);
    if (victim) victim.sets -= 1;
    else ordered.pop();
  }
  return {
    id: `quick-${minutes}`,
    kind: 'full',
    title: `Express ${minutes} min`,
    focus: [...perMuscle.keys()].slice(0, 4),
    exercises: ordered,
    estimatedMinutes: estimateWorkoutMinutes(ordered, cfg),
    coreFinisher: true,
  };
}

export const describeFocus = (w: Workout): string => w.focus.map(muscleLabel).join(' · ');

/** Mini-séance de gainage (10-15 min) ajoutée les jours sans musculation si les abdos sont prioritaires. */
export function generateCoreWorkout(
  input: Pick<GeneratorInput, 'level' | 'goal' | 'equipment' | 'priorities' | 'progress'>,
  config: EngineConfig = ENGINE_CONFIG,
): Workout {
  const { level, goal, equipment, priorities, progress } = input;
  // 2 séries par exercice : la mini-séance s'ajoute au travail des séances (volume déduit en amont)
  const plan: [MuscleGroupId, number][] = [
    ['abs', 2],
    ['obliques', priorities.obliques === 'priority' ? 3 : 2],
    ['lower_back', 2],
  ];
  const used = new Set<string>();
  const exercises: PlannedExercise[] = [];
  for (const [m, sets] of plan) {
    const ranked = rankExercisesFor(m, equipment, level, goal);
    // alterner : une variante « anti-mouvement » (gainage) et une en flexion pour les abdos
    const picks = m === 'abs' ? [ranked.find((e) => e.pattern === 'core_anti'), ranked.find((e) => e.pattern === 'core_flex')] : [ranked[0]];
    for (const ex of picks) {
      if (!ex || used.has(ex.id)) continue;
      used.add(ex.id);
      const p = prescribe(ex, sets, level, goal, progress?.[ex.id], config);
      p.restSec = Math.min(p.restSec, 40);
      exercises.push(p);
    }
  }
  return {
    id: 'w-core',
    kind: 'core',
    title: 'Gainage & abdos',
    focus: ['abs', 'obliques', 'lower_back'],
    exercises,
    estimatedMinutes: estimateWorkoutMinutes(exercises, { ...config, warmupMinutes: 2 }),
    coreFinisher: true,
  };
}
