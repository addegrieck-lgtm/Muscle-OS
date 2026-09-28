import type { DayPlan, ExerciseProgress, Feedback, ISODate, Program, User } from '../types/models';
import { computeWeeklyVolumes } from './musclePriorityEngine';
import { generateCoreWorkout, generateWorkouts, SPLITS } from './workoutGenerator';
import { planCardio } from './cardioPlanner';
import { ENGINE_CONFIG, type EngineConfig } from './config';
import { daysBetween, weekdayIndex } from '../utils';
import { getExercise } from '../data/exercises';

/**
 * Orchestrateur : profil + historique → programme hebdomadaire complet
 * (musculation + cardio + gainage + planning).
 */

export function programWeek(startDate: ISODate, today: ISODate): number {
  return Math.max(1, Math.floor(daysBetween(startDate, today) / 7) + 1);
}

export interface BuildOptions {
  week: number;
  deload?: boolean;
  deloadReason?: string;
  progress?: Record<string, ExerciseProgress>;
  recentCardioFeedback?: Feedback[];
  now?: string;
}

export function buildProgram(user: User, opts: BuildOptions, config: EngineConfig = ENGINE_CONFIG): Program {
  const days = Math.min(6, Math.max(1, user.daysPerWeek));
  const volumes = computeWeeklyVolumes(
    {
      level: user.level,
      goal: user.goal,
      daysPerWeek: days,
      sessionMinutes: user.sessionMinutes,
      priorities: user.musclePriorities,
      week: opts.week,
      deload: opts.deload,
    },
    config,
  );

  // Gainage supplémentaire si abdos/obliques prioritaires : 1-2 mini-séances les jours sans musculation.
  // Leur volume est DÉDUIT du volume abdos/obliques des séances pour ne pas dépasser la cible.
  const corePriority = (['abs', 'obliques'] as const).some((m) => user.musclePriorities[m] === 'priority');
  const coreImportant = (['abs', 'obliques'] as const).some((m) => user.musclePriorities[m] === 'important');
  const strengthDays = SPLITS[days].weekdays;
  const coreDays: number[] = [];
  if ((corePriority || coreImportant) && !opts.deload) {
    const wanted = corePriority ? 2 : 1;
    for (const d of [0, 1, 2, 3, 4, 5, 6].filter((x) => !strengthDays.includes(x))) {
      if (coreDays.length >= wanted) break;
      if (coreDays.some((p) => Math.abs(p - d) < 2)) continue;
      coreDays.push(d);
    }
  }
  const coreWorkout = coreDays.length
    ? generateCoreWorkout({ level: user.level, goal: user.goal, equipment: user.equipment, priorities: user.musclePriorities, progress: opts.progress }, config)
    : undefined;
  const sessionVolumes = volumes.map((v) => {
    if (!coreWorkout) return v;
    const coreSets = coreWorkout.exercises.filter((p) => getExercise(p.exerciseId).primary === v.muscle).reduce((a, p) => a + p.sets, 0) * coreDays.length;
    return coreSets ? { ...v, weeklySets: Math.max(1, v.weeklySets - coreSets), frequency: Math.max(1, v.frequency - coreDays.length) } : v;
  });

  const genInput = {
    level: user.level,
    goal: user.goal,
    daysPerWeek: days,
    sessionMinutes: user.sessionMinutes,
    equipment: user.equipment,
    priorities: user.musclePriorities,
    volumes: sessionVolumes,
    progress: opts.progress,
    week: opts.week,
    deload: opts.deload,
  };
  const { splitName, workouts, weekdays } = generateWorkouts(genInput, config);

  const cardio = planCardio(
    {
      goal: user.goal,
      level: user.level,
      runningExperience: user.runningExperience,
      cardioEquipment: user.cardioEquipment,
      strengthWeekdays: weekdays,
      strengthKinds: workouts.map((w) => w.kind),
      week: opts.week,
      deload: opts.deload,
      recentFeedback: opts.recentCardioFeedback,
    },
    config,
  );

  const schedule: DayPlan[] = Array.from({ length: 7 }, (_, d) => ({ weekday: d, rest: true }));
  weekdays.forEach((d, i) => {
    schedule[d].workoutId = workouts[i].id;
    schedule[d].rest = false;
  });
  for (const s of cardio.sessions) {
    schedule[s.weekday].cardio = s.workout;
    schedule[s.weekday].rest = false;
  }

  const allWorkouts = [...workouts];
  if (coreWorkout) {
    allWorkouts.push(coreWorkout);
    for (const d of coreDays) {
      schedule[d].core = true;
      schedule[d].rest = false;
    }
  }

  const notes: string[] = [];
  if (opts.deload) notes.push(opts.deloadReason ?? 'Semaine de décharge : volume réduit pour mieux récupérer.');
  const prio = volumes.filter((v) => v.multiplier > 1).sort((a, b) => b.multiplier - a.multiplier);
  if (prio.length) notes.push('Muscles prioritaires : davantage de séries et placés en début de séance.');
  notes.push(...cardio.notes);
  if (user.level === 'beginner') notes.push('Débutant : garde 2-3 répétitions en réserve, la technique avant tout.');

  const actualVolumes = volumes.map((v) => {
    const sets = allWorkouts
      .filter((w) => w.kind !== 'core')
      .flatMap((w) => w.exercises)
      .filter((p) => getExercise(p.exerciseId).primary === v.muscle)
      .reduce((a, p) => a + p.sets, 0);
    const coreSets = allWorkouts
      .filter((w) => w.kind === 'core')
      .flatMap((w) => w.exercises)
      .filter((p) => getExercise(p.exerciseId).primary === v.muscle)
      .reduce((a, p) => a + p.sets, 0);
    const nCore = coreDays.length;
    const frequency = allWorkouts.filter((w) => w.kind !== 'core' && w.exercises.some((p) => getExercise(p.exerciseId).primary === v.muscle)).length + (coreSets ? nCore : 0);
    return { ...v, weeklySets: sets + coreSets * nCore, frequency };
  });

  return {
    id: `prog_w${opts.week}_${Date.now().toString(36)}`,
    generatedAt: opts.now ?? new Date().toISOString(),
    week: opts.week,
    deload: !!opts.deload,
    splitName,
    workouts: allWorkouts,
    schedule,
    volumes: actualVolumes,
    weeklyCardioMinutes: cardio.weeklyMinutes,
    notes,
  };
}

export function todayPlan(program: Program, date: ISODate): DayPlan {
  return program.schedule[weekdayIndex(date)];
}
