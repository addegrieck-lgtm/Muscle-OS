import type { Allergen, Food, FoodCategory, ShoppingCategory } from '../types/models';

/**
 * Base d'aliments — valeurs nutritionnelles moyennes arrondies pour 100 g (ou 100 ml),
 * d'après la table Ciqual (ANSES). Viandes/poissons : poids CRU. Féculents : poids SEC/CRU.
 * Les prix au kg sont des estimations indicatives (supermarché France) pour le module budget.
 */
function F(
  id: string,
  name: string,
  category: FoodCategory,
  shopping: ShoppingCategory,
  [kcal, protein, carbs, fat]: [number, number, number, number],
  pricePerKg: number,
  extra: Partial<Pick<Food, 'unit' | 'purchase' | 'staple'>> & { allergens?: Allergen[]; animal?: Food['animal'] } = {},
): Food {
  return {
    id,
    name,
    category,
    shopping,
    kcal,
    protein,
    carbs,
    fat,
    pricePerKg,
    allergens: extra.allergens ?? [],
    animal: extra.animal ?? 'none',
    unit: extra.unit,
    purchase: extra.purchase,
    staple: extra.staple,
  };
}

export const FOODS: Food[] = [
  // ---- Protéines ----
  F('chicken', 'Blanc de poulet', 'protein', 'proteins', [110, 23.5, 0, 1.5], 11, { animal: 'meat', purchase: { label: 'barquette 500 g', grams: 500 } }),
  F('turkey', 'Escalope de dinde', 'protein', 'proteins', [107, 24, 0, 1.2], 12, { animal: 'meat', purchase: { label: 'barquette 400 g', grams: 400 } }),
  F('beef5', 'Steak haché 5 %', 'protein', 'proteins', [125, 21, 0, 5], 13, { animal: 'meat', unit: { label: 'steak', grams: 100 }, purchase: { label: 'boîte de 4 × 100 g', grams: 400 } }),
  F('ham', 'Jambon blanc', 'protein', 'proteins', [115, 20, 1, 3.5], 13, { animal: 'meat', unit: { label: 'tranche', grams: 40 }, purchase: { label: 'paquet 4 tranches', grams: 160 } }),
  F('eggs', 'Œufs', 'protein', 'proteins', [140, 12.7, 0.3, 9.8], 5.5, { animal: 'egg', allergens: ['eggs'], unit: { label: 'œuf', grams: 55 }, purchase: { label: 'boîte de 6', grams: 330 } }),
  F('tuna', 'Thon au naturel', 'protein', 'proteins', [110, 25, 0, 1], 13, { animal: 'fish', allergens: ['fish'], purchase: { label: 'boîte 140 g égoutté', grams: 140 } }),
  F('salmon', 'Pavé de saumon', 'protein', 'proteins', [190, 20, 0, 12], 22, { animal: 'fish', allergens: ['fish'], unit: { label: 'pavé', grams: 125 }, purchase: { label: '2 pavés', grams: 250 } }),
  F('cod', 'Cabillaud / poisson blanc', 'protein', 'proteins', [80, 18, 0, 0.7], 16, { animal: 'fish', allergens: ['fish'], purchase: { label: 'sachet surgelé 400 g', grams: 400 } }),
  F('shrimp', 'Crevettes décortiquées', 'protein', 'proteins', [95, 21, 0, 1.2], 20, { animal: 'shellfish', allergens: ['shellfish'], purchase: { label: 'sachet 300 g', grams: 300 } }),
  F('tofu', 'Tofu ferme', 'protein', 'proteins', [125, 13, 1.5, 7.5], 9, { allergens: ['soy'], purchase: { label: 'bloc 400 g', grams: 400 } }),
  F('lentils', 'Lentilles (sèches)', 'protein', 'starches', [330, 24, 50, 1.5], 3.5, { purchase: { label: 'paquet 500 g', grams: 500 } }),
  F('chickpeas', 'Pois chiches (conserve égouttés)', 'protein', 'starches', [125, 7, 16, 2.5], 2.5, { purchase: { label: 'boîte 265 g égouttés', grams: 265 } }),
  F('red_beans', 'Haricots rouges (conserve égouttés)', 'protein', 'starches', [105, 7.5, 14, 0.5], 2.5, { purchase: { label: 'boîte 250 g égouttés', grams: 250 } }),
  // ---- Produits laitiers ----
  F('fromage_blanc', 'Fromage blanc 3 %', 'dairy', 'dairy', [75, 7.3, 4, 3], 2.8, { animal: 'dairy', allergens: ['lactose'], purchase: { label: 'pot 1 kg', grams: 1000 } }),
  F('skyr', 'Skyr nature', 'dairy', 'dairy', [60, 10.5, 4, 0.2], 5, { animal: 'dairy', allergens: ['lactose'], purchase: { label: 'pot 450 g', grams: 450 } }),
  F('yogurt', 'Yaourt nature', 'dairy', 'dairy', [57, 4.5, 5, 1.5], 2.5, { animal: 'dairy', allergens: ['lactose'], unit: { label: 'pot', grams: 125 }, purchase: { label: 'pack de 8', grams: 1000 } }),
  F('milk', 'Lait demi-écrémé', 'dairy', 'dairy', [46, 3.3, 4.8, 1.6], 1.1, { animal: 'dairy', allergens: ['lactose'], purchase: { label: 'brique 1 L', grams: 1000 } }),
  F('soy_drink', 'Boisson soja nature', 'dairy', 'dairy', [40, 3.3, 2.5, 1.8], 2, { allergens: ['soy'], purchase: { label: 'brique 1 L', grams: 1000 } }),
  F('emmental', 'Emmental râpé', 'dairy', 'dairy', [380, 28, 0, 30], 11, { animal: 'dairy', allergens: ['lactose'], purchase: { label: 'sachet 200 g', grams: 200 } }),
  F('mozzarella', 'Mozzarella', 'dairy', 'dairy', [240, 18, 1, 18], 9, { animal: 'dairy', allergens: ['lactose'], unit: { label: 'boule', grams: 125 }, purchase: { label: 'boule 125 g', grams: 125 } }),
  // ---- Féculents ----
  F('rice', 'Riz basmati (sec)', 'starch', 'starches', [355, 7.5, 78, 0.6], 2.5, { purchase: { label: 'paquet 1 kg', grams: 1000 } }),
  F('pasta', 'Pâtes (sèches)', 'starch', 'starches', [355, 12.5, 71, 1.5], 1.8, { allergens: ['gluten'], purchase: { label: 'paquet 500 g', grams: 500 } }),
  F('oats', 'Flocons d’avoine', 'starch', 'starches', [370, 13, 58, 7], 2, { allergens: ['gluten'], purchase: { label: 'paquet 500 g', grams: 500 } }),
  F('bread', 'Pain complet', 'starch', 'starches', [245, 9, 44, 3], 4.5, { allergens: ['gluten'], unit: { label: 'tranche', grams: 35 }, purchase: { label: 'pain 500 g', grams: 500 } }),
  F('potatoes', 'Pommes de terre', 'starch', 'starches', [80, 2, 17, 0.1], 1.3, { purchase: { label: 'filet 2,5 kg', grams: 2500 } }),
  F('sweet_potato', 'Patate douce', 'starch', 'starches', [85, 1.5, 18, 0.2], 3, { purchase: { label: '1 kg', grams: 1000 } }),
  F('quinoa', 'Quinoa (sec)', 'starch', 'starches', [370, 14, 64, 6], 8, { purchase: { label: 'paquet 500 g', grams: 500 } }),
  F('couscous', 'Semoule (sèche)', 'starch', 'starches', [360, 12, 72, 1.5], 2.2, { allergens: ['gluten'], purchase: { label: 'paquet 1 kg', grams: 1000 } }),
  F('tortilla', 'Wraps / tortillas', 'starch', 'starches', [310, 8.5, 52, 7], 6, { allergens: ['gluten'], unit: { label: 'wrap', grams: 60 }, purchase: { label: 'paquet de 6', grams: 360 } }),
  // ---- Légumes ----
  F('broccoli', 'Brocolis', 'vegetable', 'vegetables', [34, 2.8, 4, 0.4], 3.5, { purchase: { label: 'sachet surgelé 1 kg', grams: 1000 } }),
  F('green_beans', 'Haricots verts', 'vegetable', 'vegetables', [30, 2, 4.5, 0.2], 3.5, { purchase: { label: 'sachet surgelé 1 kg', grams: 1000 } }),
  F('zucchini', 'Courgettes', 'vegetable', 'vegetables', [17, 1.2, 2, 0.3], 2.5, { unit: { label: 'courgette', grams: 250 } }),
  F('carrots', 'Carottes', 'vegetable', 'vegetables', [36, 0.8, 7, 0.2], 1.5, { purchase: { label: 'sachet 1 kg', grams: 1000 } }),
  F('tomatoes', 'Tomates', 'vegetable', 'vegetables', [19, 0.8, 3, 0.3], 3, { unit: { label: 'tomate', grams: 120 } }),
  F('spinach', 'Épinards', 'vegetable', 'vegetables', [25, 2.9, 1.5, 0.5], 3.5, { purchase: { label: 'sachet surgelé 750 g', grams: 750 } }),
  F('salad', 'Salade verte', 'vegetable', 'vegetables', [15, 1.3, 1.5, 0.2], 6, { purchase: { label: 'sachet 250 g', grams: 250 } }),
  F('bell_pepper', 'Poivron', 'vegetable', 'vegetables', [30, 1, 5, 0.3], 4, { unit: { label: 'poivron', grams: 150 } }),
  F('veg_mix', 'Poêlée de légumes', 'vegetable', 'vegetables', [45, 2, 6, 0.5], 3, { purchase: { label: 'sachet surgelé 1 kg', grams: 1000 } }),
  F('onion', 'Oignon', 'vegetable', 'vegetables', [35, 1.2, 6.5, 0.2], 1.8, { unit: { label: 'oignon', grams: 100 } }),
  F('mushrooms', 'Champignons de Paris', 'vegetable', 'vegetables', [25, 2.5, 1, 0.3], 5, { purchase: { label: 'barquette 250 g', grams: 250 } }),
  F('cucumber', 'Concombre', 'vegetable', 'vegetables', [13, 0.7, 2, 0.1], 2.5, { unit: { label: 'concombre', grams: 300 } }),
  F('tomato_sauce', 'Coulis de tomate', 'vegetable', 'pantry', [35, 1.4, 5.5, 0.3], 2.5, { purchase: { label: 'brique 500 g', grams: 500 } }),
  // ---- Fruits ----
  F('banana', 'Banane', 'fruit', 'fruits', [90, 1.2, 20, 0.3], 2, { unit: { label: 'banane', grams: 120 } }),
  F('apple', 'Pomme', 'fruit', 'fruits', [53, 0.3, 12, 0.2], 2.5, { unit: { label: 'pomme', grams: 150 } }),
  F('orange', 'Orange', 'fruit', 'fruits', [45, 0.9, 9, 0.2], 2.5, { unit: { label: 'orange', grams: 150 } }),
  F('berries', 'Fruits rouges', 'fruit', 'fruits', [45, 1, 8, 0.4], 7, { purchase: { label: 'sachet surgelé 500 g', grams: 500 } }),
  F('kiwi', 'Kiwi', 'fruit', 'fruits', [58, 1, 11, 0.6], 4, { unit: { label: 'kiwi', grams: 80 } }),
  // ---- Matières grasses ----
  F('olive_oil', 'Huile d’olive', 'fat', 'fats', [900, 0, 0, 100], 9, { purchase: { label: 'bouteille 50 cl', grams: 460 } }),
  F('rapeseed_oil', 'Huile de colza', 'fat', 'fats', [900, 0, 0, 100], 3, { purchase: { label: 'bouteille 1 L', grams: 920 } }),
  F('almonds', 'Amandes', 'fat', 'fats', [600, 25, 7, 52], 14, { allergens: ['nuts'], purchase: { label: 'sachet 200 g', grams: 200 } }),
  F('walnuts', 'Noix', 'fat', 'fats', [700, 15, 7, 65], 16, { allergens: ['nuts'], purchase: { label: 'sachet 200 g', grams: 200 } }),
  F('peanut_butter', 'Beurre de cacahuète', 'fat', 'fats', [610, 25, 13, 50], 9, { allergens: ['peanuts'], purchase: { label: 'pot 350 g', grams: 350 } }),
  F('avocado', 'Avocat', 'fat', 'fruits', [170, 1.8, 2, 16], 7, { unit: { label: 'avocat', grams: 140 } }),
  F('hummus', 'Houmous', 'fat', 'pantry', [280, 7, 13, 21], 10, { purchase: { label: 'pot 200 g', grams: 200 } }),
  // ---- Autres ----
  F('honey', 'Miel', 'other', 'pantry', [320, 0.4, 80, 0], 12, { purchase: { label: 'pot 250 g', grams: 250 } }),
  F('dark_chocolate', 'Chocolat noir 70 %', 'other', 'pantry', [570, 8, 33, 42], 12, { purchase: { label: 'tablette 100 g', grams: 100 } }),
  F('spices', 'Sel, poivre, épices', 'other', 'pantry', [0, 0, 0, 0], 0, { staple: true }),
];

export const foodById = (id: string): Food | undefined => FOODS.find((f) => f.id === id);

export const getFood = (id: string): Food => {
  const f = foodById(id);
  if (!f) throw new Error(`Aliment inconnu : ${id}`);
  return f;
};

/** Aliments proposés dans l'écran « J'ai déjà ces aliments » */
export const SELECTABLE_FOODS = FOODS.filter((f) => !f.staple);
