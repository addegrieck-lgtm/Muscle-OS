import type { ActivityLevel, GoalId, Level, Macros, NutritionPlan, Sex } from '../types/models';
import { ENGINE_CONFIG, type EngineConfig } from './config';
import { round } from '../utils';

/**
 * NutritionCalculator
 *  - Métabolisme de base : Mifflin-St Jeor (mifflin-1990), jugée la plus fiable (frankenfield-2005) ;
 *  - Dépense totale = métabolisme × facteur d'activité (PAL) ;
 *  - Ajustement selon l'objectif (iraki-2019, helms-2014, barakat-2020) ;
 *  - Protéines : 1,6 g/kg (morton-2018), jusqu'à ~2,2 g/kg, plus en déficit (helms-2014, jager-2017) ;
 *  - Lipides ≈ 27 % des calories (min 0,6 g/kg), glucides = reste (kerksick-2018) ;
 *  - Eau : références EFSA (efsa-2010-water) + supplément lié à l'entraînement.
 * TOUTES ces valeurs sont des estimations (≈ ±10 %) à ajuster selon l'évolution du poids.
 */

export interface NutritionInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: GoalId;
  level: Level;
  trainingDaysPerWeek: number;
  sessionMinutes: number;
}

export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Facteur d'activité : on part du niveau d'activité quotidien déclaré, et on l'augmente
 * légèrement si le volume d'entraînement déclaré est plus élevé que ce que le niveau suppose.
 */
export function activityFactor(activity: ActivityLevel, trainingDays: number, sessionMinutes: number, config: EngineConfig = ENGINE_CONFIG): number {
  const base = config.activityFactors[activity];
  const weeklyTrainingHours = (trainingDays * sessionMinutes) / 60;
  const trainingBump = Math.min(0.15, Math.max(0, weeklyTrainingHours - 2) * 0.025);
  const implied = activity === 'sedentary' ? 0 : activity === 'light' ? 0.05 : 0.1;
  return Math.round((base + Math.max(0, trainingBump - implied)) * 1000) / 1000;
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

/**
 * Poids de référence pour les protéines : en cas d'IMC élevé (> 30), on utilise le poids
 * correspondant à un IMC de 27 afin de ne pas surestimer les besoins (heuristique courante).
 */
export function proteinReferenceWeight(weightKg: number, heightCm: number): number {
  if (bmi(weightKg, heightCm) <= 30) return weightKg;
  const h = heightCm / 100;
  return round(27 * h * h, 0.5);
}

export function goalAdjustment(goal: GoalId, level: Level, config: EngineConfig = ENGINE_CONFIG): number {
  let adj = config.calorieAdjustment[goal];
  // Surplus plus faible pour les pratiquants avancés (iraki-2019).
  if (goal === 'muscle_gain') adj = level === 'beginner' ? 0.1 : level === 'intermediate' ? 0.08 : 0.05;
  return adj;
}

export function waterTarget(sex: Sex, trainingDays: number, sessionMinutes: number): number {
  // EFSA : 2,5 L (H) / 2,0 L (F) d'eau totale, dont ~20 % via l'alimentation → boissons ≈ 80 %.
  const base = (sex === 'male' ? 2.5 : 2.0) * 0.8;
  const training = ((trainingDays * sessionMinutes) / 60 / 7) * 0.6; // ≈ 0,5-0,7 L par heure d'effort, moyenné sur la semaine
  return round(base + training, 0.1);
}

export function calculateNutrition(input: NutritionInput, config: EngineConfig = ENGINE_CONFIG): NutritionPlan {
  const bmr = Math.round(mifflinStJeor(input.sex, input.weightKg, input.heightCm, input.age));
  const factor = activityFactor(input.activityLevel, input.trainingDaysPerWeek, input.sessionMinutes, config);
  const tdee = Math.round(bmr * factor);
  const adj = goalAdjustment(input.goal, input.level, config);
  let target = tdee * (1 + adj);

  // Garde-fous : jamais sous le métabolisme de base ni sous un plancher absolu.
  const floor = Math.max(bmr, input.sex === 'male' ? 1500 : 1200);
  const floored = target < floor;
  target = Math.round(Math.max(target, floor) / 10) * 10;

  const refWeight = proteinReferenceWeight(input.weightKg, input.heightCm);
  const protein = Math.round(refWeight * config.proteinPerKg[input.goal]);
  const proteinRange: [number, number] = [
    Math.round(refWeight * config.proteinRangePerKg[0]),
    Math.round(refWeight * (input.goal === 'fat_loss' ? 2.4 : config.proteinRangePerKg[1])),
  ];
  const fat = Math.round(Math.max((target * config.fatPctOfKcal) / 9, input.weightKg * config.minFatPerKg));
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

  const explanation = [
    `Métabolisme de base estimé (Mifflin-St Jeor) : ${bmr} kcal.`,
    `Dépense totale estimée : ${bmr} × ${factor.toFixed(2)} (activité) ≈ ${tdee} kcal.`,
    adj === 0
      ? 'Objectif : maintenance calorique.'
      : `Objectif : ${adj > 0 ? '+' : ''}${Math.round(adj * 100)} % → ${target} kcal.`,
    `Protéines : ${protein} g (≈ ${(protein / input.weightKg).toFixed(1)} g/kg). Plage documentée : ${proteinRange[0]}-${proteinRange[1]} g/j.`,
    `Lipides ≈ ${Math.round(((fat * 9) / target) * 100)} % des calories, glucides = le reste.`,
    'Ces chiffres sont des estimations (marge d’erreur ≈ 10 %). Ajuste de ±100-200 kcal selon l’évolution de ta moyenne de poids sur 2-3 semaines.',
  ];
  if (refWeight !== input.weightKg) explanation.push(`Protéines calculées sur un poids de référence de ${refWeight} kg (IMC > 30).`);
  if (floored) explanation.push('Cible relevée au niveau minimum de sécurité : un déficit plus important nécessite un suivi professionnel.');

  return {
    bmr,
    tdee,
    targetKcal: target,
    protein,
    proteinRange,
    carbs,
    fat,
    waterL: waterTarget(input.sex, input.trainingDaysPerWeek, input.sessionMinutes),
    activityFactor: factor,
    adjustmentPct: adj,
    explanation,
    sourceIds: ['mifflin-1990', 'frankenfield-2005', 'morton-2018', 'jager-2017', 'helms-2014', 'iraki-2019', 'barakat-2020', 'kerksick-2018', 'efsa-2010-water'],
  };
}

/**
 * Suggestion d'ajustement calorique à partir de la tendance de poids (moyenne glissante).
 * Retourne un delta kcal/j raisonnable (±100-200) ou 0.
 */
export function suggestCalorieAdjustment(goal: GoalId, weeklyChangePct: number | null): { delta: number; message: string } {
  if (weeklyChangePct == null) return { delta: 0, message: 'Pas encore assez de pesées (2 semaines minimum) pour ajuster.' };
  const w = weeklyChangePct;
  if (goal === 'fat_loss') {
    if (w > -0.25) return { delta: -150, message: 'Perte plus lente que prévu (< 0,25 %/sem.) : −150 kcal/j suggérés.' };
    if (w < -1.0) return { delta: +150, message: 'Perte rapide (> 1 %/sem.) : +150 kcal/j pour préserver le muscle.' };
    return { delta: 0, message: 'Rythme de perte idéal (0,25-1 %/sem.).' };
  }
  if (goal === 'muscle_gain') {
    if (w < 0.1) return { delta: +150, message: 'Poids stable : +150 kcal/j pour soutenir la prise de muscle.' };
    if (w > 0.5) return { delta: -150, message: 'Prise rapide (> 0,5 %/sem.) : −150 kcal/j pour limiter le gras.' };
    return { delta: 0, message: 'Rythme de prise idéal (≈0,1-0,5 %/sem.).' };
  }
  if (Math.abs(w) > 0.4) return { delta: w > 0 ? -100 : +100, message: 'Le poids dérive : petit ajustement de 100 kcal/j.' };
  return { delta: 0, message: 'Poids stable : cible adaptée.' };
}

export const emptyMacros = (): Macros => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

export const addMacros = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
});
