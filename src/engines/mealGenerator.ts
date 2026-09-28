import type {
  DayMeals,
  Food,
  Macros,
  Meal,
  MealItem,
  MealType,
  NutritionPlan,
  NutritionPreferences,
  Recipe,
  RecipeIngredient,
} from '../types/models';
import { FOODS, getFood } from '../data/foods';
import { RECIPES } from '../data/recipes';
import { addDays, clamp, hashString, round, seededRandom } from '../utils';
import { emptyMacros } from './nutritionCalculator';

/**
 * MealGenerator
 * Génère des repas à partir de recettes modèles, en recalculant les quantités pour atteindre
 * la cible calorique et protéique de chaque repas. Respecte régime, allergies, aliments détestés,
 * budget et temps de cuisine. Mode « J'ai ces aliments » : n'utilise que les aliments disponibles.
 * Protéines réparties sur les repas (schoenfeld-aragon-2018).
 */

export interface MealContext {
  prefs: NutritionPreferences;
  availableFoods?: string[]; // mode « j'ai ces aliments »
  seed?: number;
  usedRecipes?: Map<string, number>;
  excludeRecipeIds?: string[];
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Collation',
  dinner: 'Dîner',
};

export function mealSlots(mealsPerDay: 3 | 4 | 5): { type: MealType; share: number; proteinShare: number }[] {
  if (mealsPerDay === 3)
    return [
      { type: 'breakfast', share: 0.28, proteinShare: 0.3 },
      { type: 'lunch', share: 0.38, proteinShare: 0.35 },
      { type: 'dinner', share: 0.34, proteinShare: 0.35 },
    ];
  if (mealsPerDay === 4)
    return [
      { type: 'breakfast', share: 0.25, proteinShare: 0.25 },
      { type: 'lunch', share: 0.33, proteinShare: 0.3 },
      { type: 'snack', share: 0.12, proteinShare: 0.15 },
      { type: 'dinner', share: 0.3, proteinShare: 0.3 },
    ];
  return [
    { type: 'breakfast', share: 0.22, proteinShare: 0.22 },
    { type: 'snack', share: 0.1, proteinShare: 0.12 },
    { type: 'lunch', share: 0.3, proteinShare: 0.26 },
    { type: 'snack', share: 0.1, proteinShare: 0.12 },
    { type: 'dinner', share: 0.28, proteinShare: 0.28 },
  ];
}

export function macrosOf(items: MealItem[]): Macros {
  return items.reduce((acc, it) => {
    const f = getFood(it.foodId);
    const k = it.grams / 100;
    return {
      kcal: acc.kcal + f.kcal * k,
      protein: acc.protein + f.protein * k,
      carbs: acc.carbs + f.carbs * k,
      fat: acc.fat + f.fat * k,
    };
  }, emptyMacros());
}

export const roundMacros = (m: Macros): Macros => ({
  kcal: Math.round(m.kcal),
  protein: Math.round(m.protein),
  carbs: Math.round(m.carbs),
  fat: Math.round(m.fat),
});

export function costOf(items: MealItem[]): number {
  return items.reduce((a, it) => a + (it.grams / 1000) * getFood(it.foodId).pricePerKg, 0);
}

export function isFoodAllowed(food: Food, prefs: NutritionPreferences): boolean {
  if (prefs.dislikedFoods.includes(food.id)) return false;
  if (food.allergens.some((a) => prefs.allergies.includes(a))) return false;
  if (prefs.diet === 'vegetarian' && ['meat', 'fish', 'shellfish'].includes(food.animal)) return false;
  if (prefs.diet === 'pescatarian' && food.animal === 'meat') return false;
  return true;
}

const MAX_PREP: Record<NutritionPreferences['cookingTime'], number> = { minimal: 15, moderate: 25, plenty: 999 };

export function isRecipeAllowed(r: Recipe, ctx: MealContext): boolean {
  if (ctx.excludeRecipeIds?.includes(r.id)) return false;
  if (r.prepMinutes > MAX_PREP[ctx.prefs.cookingTime]) return false;
  if (!r.ingredients.every((i) => isFoodAllowed(getFood(i.foodId), ctx.prefs))) return false;
  if (ctx.availableFoods) {
    // indispensables : sources de protéines et de glucides ; le reste (légumes, garniture, gras) est facultatif
    const has = (id: string) => getFood(id).staple || ctx.availableFoods!.includes(id);
    const core = r.ingredients.filter((i) => i.role === 'protein' || i.role === 'carb');
    if (!core.length || !core.every((i) => has(i.foodId))) return false;
    const available = r.ingredients.filter((i) => has(i.foodId)).length;
    if (available / r.ingredients.length < 0.5) return false;
  }
  return true;
}

/** Ingrédients utilisables : en mode garde-manger, on retire les ingrédients facultatifs absents. */
export function usableIngredients(r: Recipe, ctx: MealContext): { ings: RecipeIngredient[]; simplified: boolean } {
  if (!ctx.availableFoods) return { ings: r.ingredients, simplified: false };
  const ings = r.ingredients.filter((i) => getFood(i.foodId).staple || ctx.availableFoods!.includes(i.foodId));
  return { ings, simplified: ings.length < r.ingredients.length };
}

const roundGrams = (food: Food, grams: number): number => {
  if (food.unit && (food.category === 'protein' || food.category === 'fruit' || food.id === 'tortilla' || food.id === 'mozzarella' || food.id === 'avocado')) {
    const units = Math.max(1, Math.round(grams / food.unit.grams));
    return units * food.unit.grams;
  }
  if (food.category === 'fat' && grams < 40) return Math.max(3, round(grams, 1));
  return Math.max(5, round(grams, 5));
};

/**
 * Recalcule les quantités d'une recette pour viser `target` (kcal + protéines).
 * Étapes : ajuster la source de protéines → ajuster les féculents → corriger avec les lipides.
 * Les facteurs sont bornés pour garder des portions réalistes.
 */
/** Portion maximale réaliste par aliment (g ou ml) pour un repas. */
export function maxPortion(food: Food): number {
  if (['milk', 'soy_drink'].includes(food.id)) return 400;
  if (food.id === 'eggs') return 220; // 4 œufs
  if (['skyr', 'fromage_blanc', 'yogurt'].includes(food.id)) return 350;
  if (['emmental', 'mozzarella'].includes(food.id)) return 125;
  if (['chickpeas', 'red_beans'].includes(food.id)) return 320;
  if (food.id === 'lentils') return 130;
  if (food.category === 'protein') return 250;
  if (['potatoes', 'sweet_potato'].includes(food.id)) return 450;
  if (food.id === 'bread') return 150;
  if (food.id === 'tortilla') return 180;
  if (food.category === 'starch') return 150;
  if (food.id.endsWith('_oil')) return 20;
  if (food.category === 'fat') return 45;
  if (food.category === 'fruit') return 250;
  return 400;
}

export function scaleIngredients(ings: RecipeIngredient[], target: { kcal: number; protein: number }): MealItem[] {
  const byRole = (role: RecipeIngredient['role']) => ings.filter((i) => i.role === role);
  const toItems = (list: RecipeIngredient[], f = 1): MealItem[] =>
    list.map((i) => ({ foodId: i.foodId, grams: Math.min(i.grams * f, Math.max(i.grams, maxPortion(getFood(i.foodId)))) }));
  const P = byRole('protein');
  const C = byRole('carb');
  const F = byRole('fat');
  const others = [...byRole('veg'), ...byRole('fixed')];

  const mP = macrosOf(toItems(P));
  const mRest = macrosOf([...toItems(C), ...toItems(F), ...toItems(others)]);
  const sp = mP.protein > 0 ? clamp((target.protein - mRest.protein) / mP.protein, 0.5, 2.6) : 1;

  const mC = macrosOf(toItems(C));
  const fixedKcal = macrosOf([...toItems(P, sp), ...toItems(F), ...toItems(others)]).kcal;
  const sc = mC.kcal > 0 ? clamp((target.kcal - fixedKcal) / mC.kcal, 0.3, 2.6) : 1;

  const mF = macrosOf(toItems(F));
  const nonFat = macrosOf([...toItems(P, sp), ...toItems(C, sc), ...toItems(others)]).kcal;
  let sf = 1;
  if (mF.kcal > 0) sf = clamp((target.kcal - nonFat) / mF.kcal, 0.3, 2);

  const items = [...toItems(P, sp), ...toItems(C, sc), ...toItems(F, sf), ...toItems(others)]
    .filter((it) => getFood(it.foodId).kcal > 0 || getFood(it.foodId).staple === undefined)
    .map((it) => ({ foodId: it.foodId, grams: roundGrams(getFood(it.foodId), it.grams) }));
  // fusion des doublons éventuels
  const merged = new Map<string, number>();
  for (const it of items) merged.set(it.foodId, (merged.get(it.foodId) ?? 0) + it.grams);
  return [...merged.entries()].map(([foodId, grams]) => ({ foodId, grams }));
}

function buildMeal(type: MealType, name: string, ings: RecipeIngredient[], target: { kcal: number; protein: number }, prep: number, steps: string[], recipeId?: string, seedKey = ''): Meal {
  const items = scaleIngredients(ings, target);
  return {
    id: `meal_${type}_${recipeId ?? 'plate'}_${seedKey}`,
    type,
    name,
    recipeId,
    items,
    macros: roundMacros(macrosOf(items)),
    prepMinutes: prep,
    steps,
  };
}

/** Assiette composée à partir des seuls aliments disponibles (repli du mode « j'ai ces aliments »). */
export function composePlate(type: MealType, target: { kcal: number; protein: number }, ctx: MealContext): Meal | null {
  const pool = FOODS.filter((f) => !f.staple && isFoodAllowed(f, ctx.prefs) && (!ctx.availableFoods || ctx.availableFoods.includes(f.id)));
  const density = (f: Food) => (f.kcal > 0 ? f.protein / f.kcal : 0);
  const isMain = type === 'lunch' || type === 'dinner';
  const breakfastLike = (f: Food) => f.category === 'dairy' || f.id === 'eggs' || f.id === 'ham';
  const proteins = pool
    .filter((f) => f.protein >= 7 && density(f) > 0.06 && (isMain ? f.category === 'protein' || f.id === 'mozzarella' : breakfastLike(f)))
    .sort((a, b) => density(b) - density(a));
  const morningCarbs = ['oats', 'bread', 'banana', 'apple', 'orange', 'berries', 'kiwi'];
  const carbs = pool.filter((f) => (isMain ? f.category === 'starch' : morningCarbs.includes(f.id)));
  const vegs = pool.filter((f) => f.category === 'vegetable' && f.id !== 'tomato_sauce');
  const fats = pool.filter((f) => f.category === 'fat');
  const rnd = seededRandom((ctx.seed ?? 1) + hashString(type));
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * Math.min(arr.length, 3))];

  const protein = proteins.length ? pick(proteins) : undefined;
  if (!protein) return null;
  const ings: RecipeIngredient[] = [{ foodId: protein.id, grams: 120, role: 'protein' }];
  const carb = carbs.length ? pick(carbs.filter((c) => c.id !== protein.id)) : undefined;
  if (carb) ings.push({ foodId: carb.id, grams: carb.kcal > 200 ? 70 : 200, role: 'carb' });
  if (isMain && vegs.length) ings.push({ foodId: pick(vegs).id, grams: 200, role: 'veg' });
  const fat = isMain ? fats.find((f) => f.id.endsWith('_oil')) ?? fats[0] : fats.find((f) => !f.id.endsWith('_oil'));
  if (fat) ings.push({ foodId: fat.id, grams: fat.id.endsWith('_oil') ? 10 : 15, role: 'fat' });
  const names = ings.map((i) => getFood(i.foodId).name.split(' (')[0]);
  return buildMeal(
    type,
    `Assiette ${names.slice(0, 3).join(', ').toLowerCase()}`,
    ings,
    target,
    isMain ? 15 : 5,
    ['Cuire la source de protéines et le féculent selon les indications du paquet.', 'Assembler, assaisonner avec la matière grasse.'],
    undefined,
    String(ctx.seed ?? 0),
  );
}

export function scoreRecipe(r: Recipe, ctx: MealContext, rnd: () => number): number {
  let s = rnd() * 3;
  for (const i of r.ingredients) if (ctx.prefs.likedFoods.includes(i.foodId)) s += 2;
  s -= (ctx.usedRecipes?.get(r.id) ?? 0) * 4;
  const cost = costOf(r.ingredients.map((i) => ({ foodId: i.foodId, grams: i.grams })));
  s -= cost * (ctx.prefs.budget === 'low' ? 2.5 : ctx.prefs.budget === 'medium' ? 0.8 : 0.1);
  if (ctx.prefs.cookingTime === 'minimal') s -= r.prepMinutes / 10;
  return s;
}

export function generateMeal(type: MealType, target: { kcal: number; protein: number }, ctx: MealContext): Meal | null {
  const rnd = seededRandom((ctx.seed ?? 1) * 31 + hashString(type));
  const candidates = RECIPES.filter((r) => r.mealTypes.includes(type) && isRecipeAllowed(r, ctx));
  if (!candidates.length) return composePlate(type, target, ctx);
  const best = candidates
    .map((r) => ({ r, s: scoreRecipe(r, ctx, rnd) }))
    .sort((a, b) => b.s - a.s)[0].r;
  ctx.usedRecipes?.set(best.id, (ctx.usedRecipes.get(best.id) ?? 0) + 1);
  const { ings, simplified } = usableIngredients(best, ctx);
  return buildMeal(type, simplified ? `${best.name} (version simplifiée)` : best.name, ings, target, best.prepMinutes, best.steps, best.id, String(ctx.seed ?? 0));
}

export function generateDay(date: string, plan: Pick<NutritionPlan, 'targetKcal' | 'protein'>, ctx: MealContext): DayMeals {
  const slots = mealSlots(ctx.prefs.mealsPerDay);
  const meals: Meal[] = [];
  slots.forEach((slot, i) => {
    const target = { kcal: plan.targetKcal * slot.share, protein: plan.protein * slot.proteinShare };
    const meal = generateMeal(slot.type, target, { ...ctx, seed: (ctx.seed ?? hashString(date)) + i * 7 });
    if (meal) meals.push({ ...meal, id: `${date}_${i}_${meal.recipeId ?? 'plate'}` });
  });
  const totals = roundMacros(meals.reduce((a, m) => ({ kcal: a.kcal + m.macros.kcal, protein: a.protein + m.macros.protein, carbs: a.carbs + m.macros.carbs, fat: a.fat + m.macros.fat }), emptyMacros()));
  return { date, meals, totals };
}

export function generateWeek(startDate: string, plan: Pick<NutritionPlan, 'targetKcal' | 'protein'>, ctx: MealContext): DayMeals[] {
  const used = ctx.usedRecipes ?? new Map<string, number>();
  return Array.from({ length: 7 }, (_, d) => {
    const date = addDays(startDate, d);
    return generateDay(date, plan, { ...ctx, usedRecipes: used, seed: (ctx.seed ?? 1) + hashString(date) });
  });
}

/** Remplace un repas par une autre recette (bouton « changer »). */
export function swapMeal(meal: Meal, target: { kcal: number; protein: number }, ctx: MealContext): Meal | null {
  const next = generateMeal(meal.type, target, {
    ...ctx,
    excludeRecipeIds: [...(ctx.excludeRecipeIds ?? []), ...(meal.recipeId ? [meal.recipeId] : [])],
    seed: (ctx.seed ?? 1) + 97,
  });
  return next ? { ...next, id: meal.id } : null;
}

export const describeItem = (it: MealItem): string => {
  const f = getFood(it.foodId);
  if (f.unit && it.grams % f.unit.grams === 0 && (f.category === 'protein' || f.category === 'fruit' || f.id === 'tortilla' || f.id === 'avocado' || f.id === 'mozzarella')) {
    const n = it.grams / f.unit.grams;
    return `${n} ${f.unit.label}${n > 1 && !f.unit.label.endsWith('s') ? 's' : ''} (${it.grams} g)`;
  }
  return `${it.grams} ${['milk', 'soy_drink'].includes(f.id) ? 'ml' : 'g'}`;
};
