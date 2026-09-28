import type { GoalId, Level, MuscleGroupId, MusclePriorities, MuscleVolume } from '../types/models';
import { MUSCLE_IDS } from '../data/reference';
import { ENGINE_CONFIG, type EngineConfig } from './config';

/**
 * MusclePriorityEngine
 * Transforme les priorités musculaires en volume hebdomadaire (séries directes) par muscle.
 *
 * Principes (voir sources) :
 *  - volume de base selon le niveau (schoenfeld-2017-volume, acsm-2009) ;
 *  - bonus multiplicatif pour les muscles Importants / Prioritaires ;
 *  - aucun muscle n'est supprimé : plancher d'entretien (spiering-2021) ;
 *  - plafond par muscle pour préserver la récupération ;
 *  - si le temps disponible ne permet pas tout, on réduit d'abord les muscles « normaux ».
 */

export interface VolumeInput {
  level: Level;
  goal: GoalId;
  daysPerWeek: number;
  sessionMinutes: number;
  priorities: MusclePriorities;
  week?: number;
  deload?: boolean;
}

export const GOAL_VOLUME_FACTOR: Record<GoalId, number> = {
  muscle_gain: 1,
  recomp: 1,
  strength: 0.9,
  fat_loss: 0.9,
  general: 0.8,
  cardio: 0.65,
};

/** Nombre de séries réalisables dans une séance de `minutes` minutes. */
export function sessionSetCapacity(minutes: number, config: EngineConfig = ENGINE_CONFIG): number {
  const usable = Math.max(8, minutes - config.warmupMinutes);
  // mix typique d'une séance : ~60 % polyarticulaires, 25 % isolation, 15 % gainage
  const avgPerSet = 0.6 * config.minutesPerSet.compound + 0.25 * config.minutesPerSet.isolation + 0.15 * config.minutesPerSet.core;
  return Math.max(4, Math.floor(usable / avgPerSet));
}

export function weeklySetCapacity(days: number, minutes: number, config: EngineConfig = ENGINE_CONFIG): number {
  return Math.max(1, days) * sessionSetCapacity(minutes, config);
}

export function baseSetsFor(muscle: MuscleGroupId, level: Level, goal: GoalId, config: EngineConfig = ENGINE_CONFIG): number {
  return config.baseWeeklySets[level] * config.muscleVolumeFactor[muscle] * GOAL_VOLUME_FACTOR[goal];
}

export function maintenanceFloor(muscle: MuscleGroupId, level: Level, goal: GoalId, config: EngineConfig = ENGINE_CONFIG): number {
  // grands muscles : plancher un peu plus haut pour garder un physique et une posture équilibrés
  const large = ['chest', 'lats', 'quads', 'glutes', 'hamstrings', 'shoulders'].includes(muscle);
  return Math.max(1, Math.round(baseSetsFor(muscle, level, goal, config) * config.maintenanceFraction * (large ? 1.3 : 1)));
}

/** Fréquence hebdomadaire conseillée (schoenfeld-2016-freq : ≥ 2×/semaine). */
export function recommendedFrequency(sets: number, days: number, isPriority: boolean): number {
  let f = sets <= 3 ? 1 : sets <= 9 ? 2 : 3;
  if (isPriority && sets >= 4) f = Math.max(f, 2) + (sets >= 7 ? 1 : 0);
  return Math.max(1, Math.min(f, days));
}

export function computeWeeklyVolumes(input: VolumeInput, config: EngineConfig = ENGINE_CONFIG): MuscleVolume[] {
  const { level, goal, daysPerWeek, sessionMinutes, priorities } = input;
  const week = input.week ?? 1;
  const cap = config.maxWeeklySets[level];

  const vols = MUSCLE_IDS.map((m) => {
    const prio = priorities[m] ?? 'normal';
    const multiplier = config.priorityMultiplier[prio];
    let sets = baseSetsFor(m, level, goal, config) * multiplier;
    // Progression douce du volume des muscles prioritaires au fil du cycle (≠ en décharge).
    if (prio === 'priority' && !input.deload) {
      const ramp = Math.min(Math.floor((week - 1) / 2) * config.priorityVolumeRampPer2Weeks, config.priorityVolumeRampMax);
      sets += ramp;
    }
    const muscleCap = Math.max(4, Math.round(cap * Math.max(0.5, config.muscleVolumeFactor[m]) * (prio === 'normal' ? 0.85 : 1)));
    sets = Math.min(Math.round(sets), muscleCap);
    return { muscle: m, weeklySets: Math.max(1, sets), frequency: 1, multiplier };
  });

  // Ajustement à la capacité réelle (jours × durée).
  const capacity = weeklySetCapacity(daysPerWeek, sessionMinutes, config);
  let total = vols.reduce((a, v) => a + v.weeklySets, 0);
  const ideal = new Map(vols.map((v) => [v.muscle, v.weeklySets]));

  /**
   * Réduction PROPORTIONNELLE et pondérée : on retire une série au muscle dont le ratio
   * (séries actuelles / séries idéales) est le plus élevé, pondéré par la priorité.
   * Résultat : tous les muscles baissent ensemble (programme équilibré), les prioritaires moins vite.
   */
  const protect = (mult: number) => Math.pow(config.priorityMultiplier.normal / mult, 1.5);
  const reduceOne = (floorFn: (m: MuscleGroupId) => number): boolean => {
    let best: MuscleVolume | undefined;
    let bestScore = -Infinity;
    for (const v of vols) {
      if (v.weeklySets <= floorFn(v.muscle)) continue;
      const score = (v.weeklySets / ideal.get(v.muscle)!) * protect(v.multiplier);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    if (!best) return false;
    best.weeklySets -= 1;
    total -= 1;
    return true;
  };

  const floor = (m: MuscleGroupId) => maintenanceFloor(m, level, goal, config);
  // Plancher « priorité » : un muscle prioritaire garde ≥ 60 % de son volume idéal (50 % si important).
  const prioFloor = (m: MuscleGroupId) => {
    const p = priorities[m] ?? 'normal';
    if (p === 'normal') return floor(m);
    return Math.max(floor(m), Math.round(ideal.get(m)! * (p === 'priority' ? 0.6 : 0.5)));
  };
  while (total > capacity && reduceOne(prioFloor)) {
    /* A. réduction proportionnelle jusqu'aux planchers */
  }
  // B. temps très limité : les muscles normaux passent sous l'entretien (jamais sous 1 série)
  //    avant de sacrifier les priorités choisies par l'utilisateur.
  while (total > capacity && reduceOne((m) => ((priorities[m] ?? 'normal') === 'normal' ? 1 : prioFloor(m)))) {
    /* B */
  }
  // Dernier recours : on descend jusqu'à 1 série (muscle toujours présent).
  while (total > capacity && reduceOne(() => 1)) {
    /* réduction ultime */
  }

  for (const v of vols) {
    if (input.deload) v.weeklySets = Math.max(1, Math.round(v.weeklySets * config.deloadVolumeFactor));
    v.frequency = recommendedFrequency(v.weeklySets, daysPerWeek, priorities[v.muscle] === 'priority');
  }
  return vols;
}

export const prioritizedMuscles = (p: MusclePriorities): MuscleGroupId[] =>
  MUSCLE_IDS.filter((m) => p[m] === 'priority').concat(MUSCLE_IDS.filter((m) => p[m] === 'important'));
