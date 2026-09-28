import { describe, expect, it } from 'vitest';
import { calculateNutrition, mifflinStJeor, suggestCalorieAdjustment } from '../src/engines/nutritionCalculator';
import { generateDay, generateMeal, generateWeek, isFoodAllowed } from '../src/engines/mealGenerator';
import { generateShoppingList, groupByCategory } from '../src/engines/shoppingListGenerator';
import { answerLocally, findFoodsInText, type CoachContext } from '../src/engines/coach';
import { assessText } from '../src/engines/safety';
import { getFood } from '../src/data/foods';
import { RECIPES } from '../src/data/recipes';
import { makeUser } from './fixtures';

const input = { sex: 'male' as const, age: 30, heightCm: 180, weightKg: 80, activityLevel: 'moderate' as const, goal: 'general' as const, level: 'beginner' as const, trainingDaysPerWeek: 3, sessionMinutes: 45 };

describe('NutritionCalculator', () => {
  it('Mifflin-St Jeor : valeurs de référence', () => {
    expect(mifflinStJeor('male', 80, 180, 30)).toBe(1780);
    expect(mifflinStJeor('female', 60, 165, 30)).toBeCloseTo(1320.25, 1);
  });

  it('maintenance / surplus / déficit selon l’objectif', () => {
    const m = calculateNutrition(input);
    const gain = calculateNutrition({ ...input, goal: 'muscle_gain' });
    const cut = calculateNutrition({ ...input, goal: 'fat_loss' });
    expect(gain.targetKcal).toBeGreaterThan(m.targetKcal);
    expect(cut.targetKcal).toBeLessThan(m.targetKcal);
    expect(cut.targetKcal).toBeGreaterThanOrEqual(cut.bmr); // jamais sous le métabolisme de base
  });

  it('protéines dans la plage documentée (1,6-2,2 g/kg)', () => {
    for (const goal of ['muscle_gain', 'recomp', 'strength', 'general'] as const) {
      const p = calculateNutrition({ ...input, goal });
      expect(p.protein / 80).toBeGreaterThanOrEqual(1.6);
      expect(p.protein / 80).toBeLessThanOrEqual(2.2);
    }
  });

  it('macros cohérentes avec les calories (±2 %)', () => {
    const p = calculateNutrition({ ...input, goal: 'muscle_gain' });
    const kcal = p.protein * 4 + p.carbs * 4 + p.fat * 9;
    expect(Math.abs(kcal - p.targetKcal) / p.targetKcal).toBeLessThan(0.02);
  });

  it('IMC élevé : protéines sur poids de référence', () => {
    const p = calculateNutrition({ ...input, weightKg: 130 });
    expect(p.protein).toBeLessThan(130 * 1.6);
  });

  it('ajustement selon tendance de poids', () => {
    expect(suggestCalorieAdjustment('fat_loss', 0).delta).toBeLessThan(0);
    expect(suggestCalorieAdjustment('muscle_gain', -0.2).delta).toBeGreaterThan(0);
    expect(suggestCalorieAdjustment('muscle_gain', null).delta).toBe(0);
  });
});

describe('MealGenerator', () => {
  const plan = { targetKcal: 2600, protein: 150 };
  const prefs = makeUser().nutrition;

  it('journée proche de la cible (±12 % kcal, ±15 % protéines)', () => {
    const d = generateDay('2026-01-05', plan, { prefs, seed: 3 });
    expect(d.meals.length).toBe(4);
    expect(Math.abs(d.totals.kcal - plan.targetKcal) / plan.targetKcal).toBeLessThan(0.12);
    expect(Math.abs(d.totals.protein - plan.protein) / plan.protein).toBeLessThan(0.15);
  });

  it('respecte végétarien + allergies + aliments détestés', () => {
    const p = { ...prefs, diet: 'vegetarian' as const, allergies: ['lactose' as const], dislikedFoods: ['eggs'] };
    const week = generateWeek('2026-01-05', plan, { prefs: p, seed: 1 });
    for (const d of week) for (const m of d.meals) for (const it of m.items) {
      const f = getFood(it.foodId);
      expect(isFoodAllowed(f, p), `${f.id} dans ${m.name}`).toBe(true);
    }
  });

  it('mode « j’ai ces aliments » : n’utilise que les aliments disponibles', () => {
    const available = ['chicken', 'rice', 'eggs', 'banana', 'fromage_blanc', 'broccoli', 'olive_oil', 'oats'];
    for (const type of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
      const m = generateMeal(type, { kcal: 600, protein: 40 }, { prefs, availableFoods: available, seed: 2 });
      expect(m, type).not.toBeNull();
      for (const it of m!.items) expect(available.includes(it.foodId) || getFood(it.foodId).staple).toBe(true);
    }
  });

  it('variété sur la semaine', () => {
    const week = generateWeek('2026-01-05', plan, { prefs, seed: 1 });
    const lunches = new Set(week.map((d) => d.meals.find((m) => m.type === 'lunch')!.recipeId));
    expect(lunches.size).toBeGreaterThanOrEqual(4);
  });

  it('toutes les recettes référencent des aliments existants', () => {
    for (const r of RECIPES) for (const i of r.ingredients) expect(() => getFood(i.foodId)).not.toThrow();
  });
});

describe('ShoppingListGenerator', () => {
  const week = generateWeek('2026-01-05', { targetKcal: 2400, protein: 140 }, { prefs: makeUser().nutrition, seed: 5 });

  it('agrège les quantités et groupe par rayon', () => {
    const list = generateShoppingList(week, { weekStart: '2026-01-05' });
    const totalGrams = week.flatMap((d) => d.meals.flatMap((m) => m.items)).filter((i) => !getFood(i.foodId).staple).reduce((a, i) => a + i.grams, 0);
    expect(list.items.reduce((a, i) => a + i.grams, 0)).toBeCloseTo(totalGrams, -1);
    expect(new Set(list.items.map((i) => i.foodId)).size).toBe(list.items.length);
    expect(groupByCategory(list).length).toBeGreaterThan(3);
    expect(list.estimatedTotal).toBeGreaterThan(0);
  });

  it('retire les aliments déjà possédés et conserve les cases cochées', () => {
    const first = generateShoppingList(week, { weekStart: '2026-01-05' });
    const target = first.items[0].foodId;
    first.items[0].checked = true;
    const again = generateShoppingList(week, { weekStart: '2026-01-05', previous: first });
    expect(again.items.find((i) => i.foodId === target)!.checked).toBe(true);
    const without = generateShoppingList(week, { weekStart: '2026-01-05', alreadyHave: [target] });
    expect(without.items.some((i) => i.foodId === target)).toBe(false);
  });
});

describe('Coach local & sécurité', () => {
  const ctx: CoachContext = { user: makeUser(), sessions: [], progress: {}, weights: [], pantry: [], today: '2026-01-10', nutrition: calculateNutrition(input) };

  it('détecte les signaux d’alerte', () => {
    expect(assessText('J’ai une douleur dans la poitrine').level).toBe('urgent');
    expect(assessText('je me sens essoufflé de façon inhabituelle').level).toBe('urgent');
    expect(assessText('j’ai mal au genou').level).toBe('caution');
    expect(assessText('J’ai mal récupéré').level).toBe('none');
  });

  it('répond aux demandes courantes', () => {
    expect(answerLocally('Je n’ai que 20 minutes.', ctx).actions?.[0]).toMatchObject({ type: 'start_quick_workout', minutes: 20 });
    expect(answerLocally('Je n’ai pas de poulet.', ctx).intent).toBe('missing_food');
    expect(answerLocally('J’ai mal récupéré', ctx).intent).toBe('recovery');
    expect(answerLocally('Je n’ai pas pu faire ma séance hier.', ctx).intent).toBe('missed_session');
    expect(answerLocally('Comment progresser aux pompes ?', ctx).intent).toBe('exercise_progress');
    expect(answerLocally('Que dois-je manger ce soir ?', ctx).intent).toBe('what_to_eat');
    expect(answerLocally('J’ai une douleur à la poitrine en courant', ctx).severity).toBe('danger');
  });

  it('reconnaît les aliments', () => {
    expect(findFoodsInText('je n’ai plus de patate douce ni de riz')).toEqual(expect.arrayContaining(['sweet_potato', 'rice']));
  });
});
