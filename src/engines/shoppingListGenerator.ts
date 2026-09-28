import type { DayMeals, ShoppingCategory, ShoppingItem, ShoppingList } from '../types/models';
import { getFood } from '../data/foods';

/**
 * ShoppingListGenerator
 * Agrège les quantités de la semaine, retire ce que l'utilisateur possède déjà,
 * convertit en unités d'achat lisibles et regroupe par rayon.
 */

export const CATEGORY_ORDER: ShoppingCategory[] = ['proteins', 'starches', 'vegetables', 'fruits', 'dairy', 'fats', 'pantry'];

export function formatQuantity(foodId: string, grams: number): string {
  const f = getFood(foodId);
  const liquid = ['milk', 'soy_drink'].includes(f.id);
  if (f.unit && (f.category === 'protein' || f.category === 'fruit' || f.category === 'vegetable' || f.id === 'tortilla' || f.id === 'avocado' || f.id === 'mozzarella')) {
    const n = Math.ceil(grams / f.unit.grams - 0.15);
    if (n >= 1 && f.unit.label !== 'tranche') {
      const label = n > 1 && !f.unit.label.endsWith('s') ? `${f.unit.label}s` : f.unit.label;
      return `${n} ${label}`;
    }
  }
  if (f.purchase) {
    const packs = Math.ceil(grams / f.purchase.grams);
    const qty = grams >= 1000 ? `${(grams / 1000).toFixed(1).replace('.', ',')} ${liquid ? 'L' : 'kg'}` : `${Math.round(grams)} ${liquid ? 'ml' : 'g'}`;
    return `${qty} · ${packs} × ${f.purchase.label}`;
  }
  return grams >= 1000 ? `${(grams / 1000).toFixed(1).replace('.', ',')} kg` : `${Math.round(grams / 10) * 10} g`;
}

export function generateShoppingList(
  days: DayMeals[],
  opts: { alreadyHave?: string[]; previous?: ShoppingList; weekStart: string; now?: string } ,
): ShoppingList {
  const totals = new Map<string, number>();
  for (const d of days) for (const m of d.meals) for (const it of m.items) totals.set(it.foodId, (totals.get(it.foodId) ?? 0) + it.grams);

  const have = new Set(opts.alreadyHave ?? []);
  const prevChecked = new Set(opts.previous?.items.filter((i) => i.checked).map((i) => i.foodId) ?? []);

  const items: ShoppingItem[] = [...totals.entries()]
    .filter(([id]) => !getFood(id).staple && !have.has(id))
    .map(([foodId, grams]) => {
      const f = getFood(foodId);
      const purchaseGrams = f.purchase ? Math.ceil(grams / f.purchase.grams) * f.purchase.grams : grams;
      return {
        id: foodId,
        foodId,
        name: f.name,
        category: f.shopping,
        grams: Math.round(grams),
        display: formatQuantity(foodId, grams),
        checked: prevChecked.has(foodId),
        estimatedCost: Math.round((purchaseGrams / 1000) * f.pricePerKg * 100) / 100,
      };
    })
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name, 'fr'));

  return {
    id: `shop_${opts.weekStart}`,
    weekStart: opts.weekStart,
    generatedAt: opts.now ?? new Date().toISOString(),
    items,
    estimatedTotal: Math.round(items.reduce((a, i) => a + i.estimatedCost, 0)),
  };
}

export function groupByCategory(list: ShoppingList): { category: ShoppingCategory; items: ShoppingItem[] }[] {
  return CATEGORY_ORDER.map((category) => ({ category, items: list.items.filter((i) => i.category === category) })).filter((g) => g.items.length);
}
