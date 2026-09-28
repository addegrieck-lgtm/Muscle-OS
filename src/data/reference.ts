import type {
  CardioEquipment,
  Equipment,
  Goal,
  MuscleGroup,
  MuscleGroupId,
  MusclePriorities,
  PriorityLevel,
  Allergen,
  MeasurementField,
  ShoppingCategory,
} from '../types/models';

export const GOALS: Goal[] = [
  { id: 'muscle_gain', label: 'Prise de muscle', description: 'Construire du muscle avec un léger surplus calorique.', icon: '💪' },
  { id: 'recomp', label: 'Recomposition corporelle', description: 'Gagner du muscle et perdre du gras, calories proches de la maintenance.', icon: '⚖️' },
  { id: 'fat_loss', label: 'Perte de gras', description: 'Perdre du gras en préservant le muscle.', icon: '🔥' },
  { id: 'cardio', label: 'Amélioration cardio', description: 'Endurance, course, santé cardiovasculaire.', icon: '🫀' },
  { id: 'strength', label: 'Force', description: 'Devenir plus fort sur les mouvements de base.', icon: '🏋️' },
  { id: 'general', label: 'Condition physique générale', description: 'Être en forme, en bonne santé, équilibré.', icon: '✨' },
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'chest', label: 'Pectoraux', region: 'upper', size: 'large' },
  { id: 'shoulders', label: 'Épaules', region: 'upper', size: 'large' },
  { id: 'traps', label: 'Trapèzes', region: 'upper', size: 'small' },
  { id: 'lats', label: 'Dorsaux', region: 'upper', size: 'large' },
  { id: 'biceps', label: 'Biceps', region: 'upper', size: 'small' },
  { id: 'triceps', label: 'Triceps', region: 'upper', size: 'small' },
  { id: 'forearms', label: 'Avant-bras', region: 'upper', size: 'small' },
  { id: 'abs', label: 'Abdominaux', region: 'core', size: 'small' },
  { id: 'obliques', label: 'Obliques', region: 'core', size: 'small' },
  { id: 'lower_back', label: 'Lombaires', region: 'core', size: 'small' },
  { id: 'glutes', label: 'Fessiers', region: 'lower', size: 'large' },
  { id: 'quads', label: 'Quadriceps', region: 'lower', size: 'large' },
  { id: 'hamstrings', label: 'Ischio-jambiers', region: 'lower', size: 'large' },
  { id: 'adductors', label: 'Adducteurs', region: 'lower', size: 'small' },
  { id: 'calves', label: 'Mollets', region: 'lower', size: 'small' },
];

export const MUSCLE_IDS = MUSCLE_GROUPS.map((m) => m.id);

export const muscleLabel = (id: MuscleGroupId): string => MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? id;

export const defaultPriorities = (): MusclePriorities =>
  Object.fromEntries(MUSCLE_IDS.map((id) => [id, 'normal'])) as MusclePriorities;

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  normal: 'Normal',
  important: 'Important',
  priority: 'Prioritaire',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: 'Aucun',
  bodyweight: 'Poids du corps',
  chair: 'Chaise',
  table: 'Table solide',
  backpack: 'Sac à dos (lestable)',
  dumbbells: 'Haltères',
  kettlebell: 'Kettlebell',
  bands: 'Élastiques',
  pullup_bar: 'Barre de traction',
  bench: 'Banc',
  other: 'Autre',
};

export const CARDIO_LABELS: Record<CardioEquipment, string> = {
  outdoor_run: 'Course extérieure',
  treadmill: 'Tapis de course',
  bike: 'Vélo',
  jump_rope: 'Corde à sauter',
  none: 'Aucun',
  other: 'Autre',
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  lactose: 'Lactose',
  eggs: 'Œufs',
  nuts: 'Fruits à coque',
  peanuts: 'Arachides',
  fish: 'Poisson',
  shellfish: 'Crustacés',
  soy: 'Soja',
};

export const MEASUREMENT_LABELS: Record<MeasurementField, string> = {
  arm: 'Bras',
  chest: 'Poitrine',
  waist: 'Taille',
  hips: 'Hanches',
  thigh: 'Cuisse',
  calf: 'Mollet',
};

export const SHOPPING_LABELS: Record<ShoppingCategory, { label: string; emoji: string }> = {
  proteins: { label: 'Protéines', emoji: '🥩' },
  starches: { label: 'Féculents', emoji: '🍚' },
  vegetables: { label: 'Légumes', emoji: '🥦' },
  fruits: { label: 'Fruits', emoji: '🍎' },
  dairy: { label: 'Produits laitiers', emoji: '🥛' },
  fats: { label: 'Matières grasses & oléagineux', emoji: '🥜' },
  pantry: { label: 'Épicerie', emoji: '🧂' },
};

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
