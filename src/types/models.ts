/**
 * MUSCLEOS — modèles de données.
 * Tous les identifiants sont des chaînes stables (slugs ou ids générés) afin de permettre
 * une future synchronisation cloud sans migration de clés.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string;

// ---------- Profil ----------

export type Sex = 'male' | 'female';
export type GoalId = 'muscle_gain' | 'recomp' | 'fat_loss' | 'cardio' | 'strength' | 'general';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type RunningExperience = 'none' | 'some' | 'regular';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Equipment =
  | 'none'
  | 'bodyweight'
  | 'chair'
  | 'table'
  | 'backpack'
  | 'dumbbells'
  | 'kettlebell'
  | 'bands'
  | 'pullup_bar'
  | 'bench'
  | 'other';

export type CardioEquipment = 'outdoor_run' | 'treadmill' | 'bike' | 'jump_rope' | 'none' | 'other';

export type MuscleGroupId =
  | 'chest'
  | 'abs'
  | 'obliques'
  | 'shoulders'
  | 'traps'
  | 'lats'
  | 'lower_back'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves';

export type PriorityLevel = 'normal' | 'important' | 'priority';
export type MusclePriorities = Record<MuscleGroupId, PriorityLevel>;

export interface Goal {
  id: GoalId;
  label: string;
  description: string;
  icon: string;
}

export interface MuscleGroup {
  id: MuscleGroupId;
  label: string;
  region: 'upper' | 'core' | 'lower';
  size: 'large' | 'small';
}

export type Diet = 'omnivore' | 'pescatarian' | 'vegetarian';
export type Allergen = 'gluten' | 'lactose' | 'eggs' | 'nuts' | 'peanuts' | 'fish' | 'shellfish' | 'soy';
export type Budget = 'low' | 'medium' | 'high';
export type CookingTime = 'minimal' | 'moderate' | 'plenty';

export interface NutritionPreferences {
  mealsPerDay: 3 | 4 | 5;
  diet: Diet;
  likedFoods: string[];
  dislikedFoods: string[];
  allergies: Allergen[];
  budget: Budget;
  cookingTime: CookingTime;
}

export interface User {
  id: string;
  name: string;
  createdAt: ISODateTime;
  startDate: ISODate;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  level: Level;
  runningExperience: RunningExperience;
  activityLevel: ActivityLevel;
  goal: GoalId;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
  cardioEquipment: CardioEquipment[];
  musclePriorities: MusclePriorities;
  nutrition: NutritionPreferences;
}

// ---------- Entraînement ----------

export type MovementPattern =
  | 'push_h'
  | 'push_v'
  | 'pull_h'
  | 'pull_v'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'isolation'
  | 'core_anti'
  | 'core_flex'
  | 'calf';

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroupId;
  secondary: MuscleGroupId[];
  pattern: MovementPattern;
  /** difficulté 1 (très facile) → 5 (très difficile) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Niveau minimum conseillé */
  level: Level;
  /** Tous les éléments listés sont requis. Liste vide = aucun matériel. */
  equipment: Equipment[];
  mode: 'reps' | 'time';
  /** fourchette par défaut (répétitions ou secondes) */
  defaultRange: [number, number];
  defaultSets: number;
  restSec: number;
  loadable: boolean;
  unilateral?: boolean;
  compound: boolean;
  cues: string[];
  mistakes: string[];
  progression?: string;
  regression?: string;
}

export type Feedback = 'easy' | 'ok' | 'hard' | 'very_hard';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  load?: number; // kg
  restSec: number;
  tempo?: string;
  rir: number; // répétitions en réserve visées
  note?: string;
}

export type SessionKind = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'core';

export interface Workout {
  id: string; // ex. 'w1-A'
  kind: SessionKind;
  title: string;
  focus: MuscleGroupId[];
  exercises: PlannedExercise[];
  estimatedMinutes: number;
  coreFinisher: boolean;
}

export interface Set {
  reps: number; // ou secondes pour mode 'time'
  load?: number;
  done: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  planned: PlannedExercise;
  sets: Set[];
  feedback?: Feedback;
  pain?: boolean;
}

export interface WorkoutSession {
  id: string;
  date: ISODate;
  workoutId: string;
  title: string;
  startedAt: ISODateTime;
  finishedAt?: ISODateTime;
  durationMin?: number;
  exercises: ExerciseLog[];
  bodyWeight?: number;
  adjusted?: string; // raison de l'ajustement récupération
}

export interface ExerciseProgress {
  exerciseId: string; // exercice courant (peut être une variante progressée)
  baseExerciseId: string; // exercice d'origine du programme
  repMin: number;
  repMax: number;
  sets: number;
  load?: number;
  tempo?: string;
  topStreak: number;
  failStreak: number;
  lastFeedback?: Feedback;
  lastMessage?: string;
  updatedAt?: ISODate;
}

// ---------- Cardio ----------

export type CardioType = 'endurance' | 'intervals' | 'easy_run' | 'long_run' | 'tempo' | 'conditioning' | 'walk';

export interface CardioBlock {
  label: string;
  minutes: number;
  intensity: 'very_easy' | 'easy' | 'moderate' | 'hard';
  repeat?: number;
}

export interface CardioWorkout {
  id: string;
  type: CardioType;
  title: string;
  modality: CardioEquipment | 'walk' | 'bodyweight';
  totalMinutes: number;
  blocks: CardioBlock[];
  description: string;
  hard: boolean;
}

export interface CardioSession {
  id: string;
  date: ISODate;
  plannedId: string;
  type: CardioType;
  minutes: number;
  distanceKm?: number;
  feedback?: Feedback;
  pain?: boolean;
}

// ---------- Planning ----------

export interface DayPlan {
  weekday: number; // 0 = lundi
  workoutId?: string;
  cardio?: CardioWorkout;
  core?: boolean;
  rest: boolean;
}

export interface MuscleVolume {
  muscle: MuscleGroupId;
  weeklySets: number;
  frequency: number;
  multiplier: number;
}

export interface Program {
  id: string;
  generatedAt: ISODateTime;
  week: number;
  deload: boolean;
  splitName: string;
  workouts: Workout[];
  schedule: DayPlan[];
  volumes: MuscleVolume[];
  weeklyCardioMinutes: number;
  notes: string[];
}

// ---------- Nutrition ----------

export type FoodCategory = 'protein' | 'starch' | 'vegetable' | 'fruit' | 'dairy' | 'fat' | 'other';
export type ShoppingCategory = 'proteins' | 'starches' | 'vegetables' | 'fruits' | 'dairy' | 'fats' | 'pantry';

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  shopping: ShoppingCategory;
  /** valeurs pour 100 g (ou 100 ml) */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unit?: { label: string; grams: number }; // ex. 1 œuf = 60 g
  purchase?: { label: string; grams: number }; // conditionnement courant
  allergens: Allergen[];
  animal: 'meat' | 'fish' | 'shellfish' | 'egg' | 'dairy' | 'none';
  pricePerKg: number; // € estimation indicative
  staple?: boolean; // produit de placard toujours disponible (sel, épices)
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type IngredientRole = 'protein' | 'carb' | 'fat' | 'veg' | 'fixed';

export interface RecipeIngredient {
  foodId: string;
  grams: number;
  role: IngredientRole;
}

export interface Recipe {
  id: string;
  name: string;
  mealTypes: MealType[];
  prepMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealItem {
  foodId: string;
  grams: number;
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  recipeId?: string;
  items: MealItem[];
  macros: Macros;
  prepMinutes: number;
  steps: string[];
}

export interface DayMeals {
  date: ISODate;
  meals: Meal[];
  totals: Macros;
}

export interface NutritionPlan {
  bmr: number;
  tdee: number;
  targetKcal: number;
  protein: number;
  proteinRange: [number, number];
  carbs: number;
  fat: number;
  waterL: number;
  activityFactor: number;
  adjustmentPct: number;
  explanation: string[];
  sourceIds: string[];
}

export interface ShoppingItem {
  id: string; // foodId
  foodId: string;
  name: string;
  category: ShoppingCategory;
  grams: number;
  display: string;
  checked: boolean;
  estimatedCost: number;
}

export interface ShoppingList {
  id: string;
  weekStart: ISODate;
  generatedAt: ISODateTime;
  items: ShoppingItem[];
  estimatedTotal: number;
}

export interface IntakeLog {
  date: ISODate;
  eatenMealIds: string[];
  extra: Macros; // ajouts manuels
  waterMl: number;
}

// ---------- Suivi ----------

export interface WeightEntry {
  date: ISODate;
  kg: number;
}

export type MeasurementField = 'arm' | 'chest' | 'waist' | 'hips' | 'thigh' | 'calf';

export interface Measurement {
  date: ISODate;
  values: Partial<Record<MeasurementField, number>>;
}

export type PhotoPose = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: ISODate;
  pose: PhotoPose;
  /** la donnée binaire est stockée dans IndexedDB sous cet id */
  blobKey: string;
}

export interface RecoveryEntry {
  date: ISODate;
  energy: number; // 1-5 (5 = excellente)
  sleep: number; // 1-5 (5 = excellent)
  soreness: number; // 1-5 (5 = très courbaturé)
  motivation: number; // 1-5
  pain?: boolean;
  note?: string;
}

// ---------- Sources ----------

export type SourceCategory =
  | 'resistance'
  | 'hypertrophy'
  | 'cardio'
  | 'physical_activity'
  | 'nutrition'
  | 'protein'
  | 'recovery'
  | 'safety';

export interface Source {
  id: string;
  category: SourceCategory;
  authors: string;
  title: string;
  publication: string;
  year: number;
  doi?: string;
  url?: string;
  usedFor: string;
}

// ---------- Coach ----------

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  at: ISODateTime;
  severity?: 'info' | 'warning' | 'danger';
  actions?: CoachAction[];
  sourceIds?: string[];
}

export type CoachAction =
  | { type: 'start_quick_workout'; minutes: number; label: string }
  | { type: 'navigate'; to: string; label: string }
  | { type: 'use_foods'; foodIds: string[]; label: string };

export interface CoachSettings {
  provider: 'local' | 'ollama';
  ollamaUrl: string;
  ollamaModel: string;
}
