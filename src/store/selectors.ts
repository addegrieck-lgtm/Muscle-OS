import type { AppState } from './store';
import type { DayPlan, IntakeLog, ISODate, Macros, NutritionPlan, Workout } from '../types/models';
import { calculateNutrition } from '../engines/nutritionCalculator';
import { latestWeight } from '../engines/analytics';
import { weekdayIndex } from '../utils';

let cache: { key: string; plan: NutritionPlan } | undefined;

/** Plan nutritionnel dérivé du profil + dernière pesée + ajustement manuel (mémoïsé). */
export function nutritionPlan(s: AppState): NutritionPlan | undefined {
  const u = s.user;
  if (!u) return undefined;
  const weight = latestWeight(s.weights) ?? u.weightKg;
  const key = JSON.stringify([u.sex, u.age, u.heightCm, weight, u.activityLevel, u.goal, u.level, u.daysPerWeek, u.sessionMinutes, s.calorieOffset]);
  if (cache?.key === key) return cache.plan;
  const base = calculateNutrition({
    sex: u.sex,
    age: u.age,
    heightCm: u.heightCm,
    weightKg: weight,
    activityLevel: u.activityLevel,
    goal: u.goal,
    level: u.level,
    trainingDaysPerWeek: u.daysPerWeek,
    sessionMinutes: u.sessionMinutes,
  });
  let plan = base;
  if (s.calorieOffset) {
    const target = Math.max(base.bmr, base.targetKcal + s.calorieOffset);
    const carbs = Math.max(0, Math.round((target - base.protein * 4 - base.fat * 9) / 4));
    plan = {
      ...base,
      targetKcal: target,
      carbs,
      explanation: [...base.explanation, `Ajustement manuel selon ta tendance de poids : ${s.calorieOffset > 0 ? '+' : ''}${s.calorieOffset} kcal/j.`],
    };
  }
  cache = { key, plan };
  return plan;
}

export function dayPlan(s: AppState, date: ISODate): DayPlan | undefined {
  return s.program?.schedule[weekdayIndex(date)];
}

export function workoutById(s: AppState, id?: string): Workout | undefined {
  return id ? s.program?.workouts.find((w) => w.id === id) : undefined;
}

export const emptyIntake = (date: ISODate): IntakeLog => ({ date, eatenMealIds: [], extra: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, waterMl: 0 });

export function intakeTotals(s: AppState, date: ISODate): Macros {
  const log = s.intake[date] ?? emptyIntake(date);
  const day = s.mealPlan?.days.find((d) => d.date === date);
  const eaten = day?.meals.filter((m) => log.eatenMealIds.includes(m.id)) ?? [];
  return eaten.reduce(
    (a, m) => ({ kcal: a.kcal + m.macros.kcal, protein: a.protein + m.macros.protein, carbs: a.carbs + m.macros.carbs, fat: a.fat + m.macros.fat }),
    { ...log.extra },
  );
}
