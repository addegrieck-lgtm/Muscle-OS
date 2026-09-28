import type { ActivityLevel, GoalId, Level, MuscleGroupId, PriorityLevel } from '../types/models';

/**
 * Paramètres centraux des moteurs. Modifiables sans toucher aux algorithmes.
 * Ces valeurs sont des choix de programmation raisonnables dérivés de la littérature
 * (voir `sourceIds`) — ce ne sont PAS des valeurs médicales définitives.
 */
export const ENGINE_CONFIG = {
  /** Multiplicateurs de volume selon la priorité (schoenfeld-2017-volume). */
  priorityMultiplier: { normal: 1.0, important: 1.2, priority: 1.4 } as Record<PriorityLevel, number>,

  /** Séries hebdomadaires de base par muscle « large » selon le niveau (schoenfeld-2017-volume, acsm-2009). */
  baseWeeklySets: { beginner: 8, intermediate: 11, advanced: 13 } as Record<Level, number>,

  /** Plafond de séries directes hebdomadaires par muscle (limite de récupération raisonnable). */
  maxWeeklySets: { beginner: 12, intermediate: 18, advanced: 22 } as Record<Level, number>,

  /** Plancher d'entretien (spiering-2021) : fraction du volume de base conservée au minimum. */
  maintenanceFraction: 0.4,

  /**
   * Les petits muscles reçoivent déjà un travail indirect important via les polyarticulaires
   * (ex. triceps dans les pompes) : leur volume direct est pondéré.
   */
  muscleVolumeFactor: {
    chest: 1,
    shoulders: 0.9,
    lats: 1,
    quads: 1,
    glutes: 0.8,
    hamstrings: 0.8,
    traps: 0.4,
    biceps: 0.6,
    triceps: 0.6,
    forearms: 0.3,
    abs: 0.7,
    obliques: 0.4,
    lower_back: 0.3,
    adductors: 0.3,
    calves: 0.6,
  } as Record<MuscleGroupId, number>,

  /** Minutes estimées par série (effort + repos) pour le calcul de capacité de séance. */
  minutesPerSet: { compound: 2.6, isolation: 1.9, core: 1.4 },
  warmupMinutes: 5,

  /** Séries par exercice : bornes. */
  setsPerExercise: { min: 2, max: 4 },

  /** RIR visé (refalo-2023). */
  targetRir: { beginner: 3, intermediate: 2, advanced: 1 } as Record<Level, number>,

  /** Décharge programmée (bell-2023) : toutes les N semaines. */
  deloadEveryWeeks: { beginner: 8, intermediate: 6, advanced: 5 } as Record<Level, number>,
  deloadVolumeFactor: 0.6,

  /** Progression hebdomadaire du volume des muscles prioritaires (séries ajoutées / 2 semaines). */
  priorityVolumeRampPer2Weeks: 1,
  priorityVolumeRampMax: 3,

  /** Progression des charges (acsm-2009 : +2-10 %). */
  loadIncrementPct: 0.05,
  minLoadIncrementKg: 1,
  repCapBodyweight: 20,
  timeCapSeconds: 60,

  /** Nutrition */
  activityFactors: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  } as Record<ActivityLevel, number>,
  calorieAdjustment: {
    muscle_gain: 0.1,
    recomp: -0.05,
    fat_loss: -0.2,
    cardio: 0,
    strength: 0.05,
    general: 0,
  } as Record<GoalId, number>,
  proteinPerKg: {
    muscle_gain: 1.8,
    recomp: 2.0,
    fat_loss: 2.1,
    cardio: 1.4,
    strength: 1.8,
    general: 1.6,
  } as Record<GoalId, number>,
  proteinRangePerKg: [1.6, 2.2] as [number, number],
  fatPctOfKcal: 0.27,
  minFatPerKg: 0.6,

  /** Cardio hebdomadaire cible (min) selon l'objectif (who-2020, wilson-2012). */
  weeklyCardioMinutes: {
    muscle_gain: 60,
    recomp: 100,
    fat_loss: 150,
    cardio: 180,
    strength: 45,
    general: 150,
  } as Record<GoalId, number>,
  maxWeeklyCardioIncrease: 0.1, // nielsen-2014
  cardioDeloadEveryWeeks: 4,
};

export type EngineConfig = typeof ENGINE_CONFIG;
