import { store, type AppState } from './store';
import { emptyIntake, nutritionPlan } from './selectors';
import type {
  CardioSession,
  CoachMessage,
  ExerciseLog,
  Macros,
  Measurement,
  MusclePriorities,
  PhotoPose,
  RecoveryEntry,
  User,
  Workout,
  WorkoutSession,
} from '../types/models';
import { buildProgram, programWeek } from '../engines/programService';
import { applySession, shouldDeload } from '../engines/progressionEngine';
import { generateWeek, swapMeal as swapMealEngine, mealSlots } from '../engines/mealGenerator';
import { generateShoppingList } from '../engines/shoppingListGenerator';
import { answerLocally, localProvider, ollamaProvider, type CoachContext } from '../engines/coach';
import { blobToDataUrl, compressImage, dataUrlToBlob, photoStore } from './storage';
import { addDays, daysBetween, startOfWeek, today, uid } from '../utils';
import { getExercise } from '../data/exercises';

const set = store.set;
const get = store.get;

// ---------------- Programme ----------------

function recentCardioFeedback(s: AppState) {
  const t = today();
  return s.cardioSessions.filter((c) => daysBetween(c.date, t) >= 0 && daysBetween(c.date, t) < 10 && c.feedback).map((c) => c.feedback!);
}

export function regenerateProgram(reason?: string) {
  const s = get();
  if (!s.user) return;
  const t = today();
  const week = programWeek(s.user.startDate, t);
  const deload = shouldDeload({ week, level: s.user.level, recovery: s.recovery, sessions: s.sessions, today: t });
  const program = buildProgram(s.user, {
    week,
    deload: deload.deload,
    deloadReason: deload.reason,
    progress: s.progress,
    recentCardioFeedback: recentCardioFeedback(s),
  });
  if (reason) program.notes.unshift(reason);
  set({ program });
}

export function regenerateMeals() {
  const s = get();
  const plan = nutritionPlan(s);
  if (!s.user || !plan) return;
  const weekStart = startOfWeek(today());
  const pantryMode = s.pantryMode && s.pantry.length >= 3;
  const days = generateWeek(weekStart, plan, {
    prefs: s.user.nutrition,
    availableFoods: pantryMode ? s.pantry : undefined,
    seed: Math.floor(Math.random() * 10000),
  });
  set({ mealPlan: { weekStart, days, pantryMode } });
}

/** Au démarrage / changement de jour : met à jour la semaine de programme et les repas. */
export function ensureCurrent() {
  const s = get();
  if (!s.user) return;
  const t = today();
  const week = programWeek(s.user.startDate, t);
  if (!s.program || s.program.week !== week) regenerateProgram();
  if (!s.mealPlan || s.mealPlan.weekStart !== startOfWeek(t)) regenerateMeals();
}

// ---------------- Profil ----------------

export function completeOnboarding(user: User) {
  const t = today();
  set({ user: { ...user, startDate: t }, weights: [{ date: t, kg: user.weightKg }] });
  regenerateProgram();
  regenerateMeals();
}

export function updateUser(patch: Partial<User>, opts: { regenerate?: boolean; meals?: boolean } = { regenerate: true, meals: true }) {
  const s = get();
  if (!s.user) return;
  set({ user: { ...s.user, ...patch } });
  if (opts.regenerate) regenerateProgram('Programme recalculé suite à la modification de ton profil.');
  if (opts.meals) regenerateMeals();
}

export function setPriorities(p: MusclePriorities) {
  updateUser({ musclePriorities: p }, { regenerate: true, meals: false });
  const prog = get().program;
  if (prog) set({ program: { ...prog, notes: ['Programme adapté à tes nouvelles priorités musculaires.', ...prog.notes.filter((n) => !n.startsWith('Programme recalculé'))] } });
}

// ---------------- Séances ----------------

export function startSession(workout: Workout, adjustedReason?: string) {
  const s = get();
  const lastLoadFor = (exerciseId: string): number | undefined => {
    for (const sess of [...s.sessions].reverse()) {
      const l = sess.exercises.find((e) => e.exerciseId === exerciseId);
      const load = l?.sets.find((x) => x.load != null)?.load;
      if (load != null) return load;
    }
    return undefined;
  };
  // Pré-remplissage prudent : répétitions de la dernière séance (bornées à la cible), sinon bas de fourchette.
  const lastRepsFor = (exerciseId: string): number[] => {
    for (const sess of [...s.sessions].reverse()) {
      const l = sess.exercises.find((e) => e.exerciseId === exerciseId);
      if (l) return l.sets.filter((x) => x.done).map((x) => x.reps);
    }
    return [];
  };
  const exercises: ExerciseLog[] = workout.exercises.map((p) => {
    const load = p.load ?? (getExercise(p.exerciseId).loadable ? lastLoadFor(p.exerciseId) : undefined);
    const last = lastRepsFor(p.exerciseId);
    return {
      exerciseId: p.exerciseId,
      planned: { ...p, load },
      sets: Array.from({ length: p.sets }, (_, i) => ({ reps: Math.min(p.repMax, Math.max(p.repMin, last[i] ?? last.at(-1) ?? p.repMin)), load, done: false })),
    };
  });
  const session: WorkoutSession = {
    id: uid('ws'),
    date: today(),
    workoutId: workout.id,
    title: workout.title,
    startedAt: new Date().toISOString(),
    exercises,
    adjusted: adjustedReason,
  };
  set({ activeSession: session });
}

export function updateActiveSession(fn: (s: WorkoutSession) => WorkoutSession) {
  const cur = get().activeSession;
  if (cur) set({ activeSession: fn(cur) });
}

export function cancelSession() {
  set({ activeSession: undefined });
}

export function finishSession() {
  const s = get();
  const cur = s.activeSession;
  if (!cur) return;
  const finishedAt = new Date().toISOString();
  const durationMin = Math.max(1, Math.round((Date.parse(finishedAt) - Date.parse(cur.startedAt)) / 60000));
  const session: WorkoutSession = { ...cur, finishedAt, durationMin, bodyWeight: s.weights.at(-1)?.kg };
  // on n'évalue que les exercices réellement travaillés
  const worked = { ...session, exercises: session.exercises.filter((e) => e.sets.some((x) => x.done)) };
  const { progress, results } = applySession(worked, s.progress);
  set({
    sessions: [...s.sessions, session],
    activeSession: undefined,
    progress,
    lastSessionSummary: { sessionId: session.id, messages: results.map((r) => ({ exerciseId: r.exerciseId, message: r.message, change: r.change })) },
  });
  // le programme reflète immédiatement les nouvelles cibles
  regenerateProgram();
}

export function logCardio(entry: Omit<CardioSession, 'id'>) {
  set((s) => ({ cardioSessions: [...s.cardioSessions, { ...entry, id: uid('cs') }] }));
}

export function deleteSession(id: string) {
  set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
}

// ---------------- Suivi ----------------

export function addWeight(date: string, kg: number) {
  set((s) => ({ weights: [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) }));
}

export function deleteWeight(date: string) {
  set((s) => ({ weights: s.weights.filter((w) => w.date !== date) }));
}

export function addMeasurement(m: Measurement) {
  set((s) => ({ measurements: [...s.measurements.filter((x) => x.date !== m.date), m].sort((a, b) => a.date.localeCompare(b.date)) }));
}

export function deleteMeasurement(date: string) {
  set((s) => ({ measurements: s.measurements.filter((x) => x.date !== date) }));
}

export async function addPhoto(file: File, pose: PhotoPose, date: string) {
  const blob = await compressImage(file);
  const id = uid('ph');
  await photoStore.put(id, blob);
  set((s) => ({ photos: [...s.photos, { id, date, pose, blobKey: id }] }));
}

export async function deletePhoto(id: string) {
  await photoStore.remove(id).catch(() => undefined);
  set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
}

export function saveRecovery(entry: RecoveryEntry) {
  set((s) => ({ recovery: [...s.recovery.filter((r) => r.date !== entry.date), entry] }));
}

// ---------------- Nutrition ----------------

const intakeOf = (s: AppState, date: string) => s.intake[date] ?? emptyIntake(date);

export function toggleEaten(date: string, mealId: string) {
  set((s) => {
    const log = intakeOf(s, date);
    const eaten = log.eatenMealIds.includes(mealId) ? log.eatenMealIds.filter((x) => x !== mealId) : [...log.eatenMealIds, mealId];
    return { intake: { ...s.intake, [date]: { ...log, eatenMealIds: eaten } } };
  });
}

export function addWater(date: string, ml: number) {
  set((s) => {
    const log = intakeOf(s, date);
    return { intake: { ...s.intake, [date]: { ...log, waterMl: Math.max(0, log.waterMl + ml) } } };
  });
}

export function addExtraMacros(date: string, m: Macros) {
  set((s) => {
    const log = intakeOf(s, date);
    const e = log.extra;
    return { intake: { ...s.intake, [date]: { ...log, extra: { kcal: e.kcal + m.kcal, protein: e.protein + m.protein, carbs: e.carbs + m.carbs, fat: e.fat + m.fat } } } };
  });
}

export function resetExtra(date: string) {
  set((s) => {
    const log = intakeOf(s, date);
    return { intake: { ...s.intake, [date]: { ...log, extra: { kcal: 0, protein: 0, carbs: 0, fat: 0 } } } };
  });
}

export function swapMeal(date: string, mealId: string) {
  const s = get();
  const plan = nutritionPlan(s);
  if (!s.mealPlan || !s.user || !plan) return;
  const days = s.mealPlan.days.map((d) => {
    if (d.date !== date) return d;
    const idx = d.meals.findIndex((m) => m.id === mealId);
    if (idx < 0) return d;
    const slot = mealSlots(s.user!.nutrition.mealsPerDay)[idx] ?? { share: 0.3, proteinShare: 0.3 };
    const next = swapMealEngine(d.meals[idx], { kcal: plan.targetKcal * slot.share, protein: plan.protein * slot.proteinShare }, {
      prefs: s.user!.nutrition,
      availableFoods: s.mealPlan!.pantryMode ? s.pantry : undefined,
      seed: Math.floor(Math.random() * 10000),
    });
    if (!next) return d;
    const meals = d.meals.map((m, i) => (i === idx ? next : m));
    const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.macros.kcal, protein: a.protein + m.macros.protein, carbs: a.carbs + m.macros.carbs, fat: a.fat + m.macros.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return { ...d, meals, totals };
  });
  set({ mealPlan: { ...s.mealPlan, days } });
}

export function setPantry(ids: string[]) {
  set({ pantry: ids });
}

export function setPantryMode(on: boolean) {
  set({ pantryMode: on });
  regenerateMeals();
}

export function generateShopping() {
  const s = get();
  if (!s.mealPlan) return;
  const t = today();
  // uniquement les jours restants de la semaine (aujourd'hui inclus)
  const days = s.mealPlan.days.filter((d) => d.date >= t);
  const list = generateShoppingList(days.length ? days : s.mealPlan.days, {
    weekStart: s.mealPlan.weekStart,
    alreadyHave: s.pantry,
    previous: s.shoppingList?.weekStart === s.mealPlan.weekStart ? s.shoppingList : undefined,
  });
  set({ shoppingList: list });
}

export function toggleShoppingItem(id: string) {
  const list = get().shoppingList;
  if (!list) return;
  set({ shoppingList: { ...list, items: list.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) } });
}

export function setCalorieOffset(delta: number) {
  set({ calorieOffset: delta });
  regenerateMeals();
}

// ---------------- Coach ----------------

export function coachContext(s: AppState): CoachContext | undefined {
  if (!s.user) return undefined;
  const t = today();
  return {
    user: s.user,
    program: s.program,
    nutrition: nutritionPlan(s),
    todayMeals: s.mealPlan?.days.find((d) => d.date === t),
    intake: s.intake[t],
    recoveryToday: s.recovery.find((r) => r.date === t),
    sessions: s.sessions,
    progress: s.progress,
    weights: s.weights,
    pantry: s.pantry,
    today: t,
  };
}

export async function sendCoachMessage(text: string) {
  const s = get();
  const ctx = coachContext(s);
  if (!ctx || !text.trim()) return;
  const userMsg: CoachMessage = { id: uid('m'), role: 'user', text: text.trim(), at: new Date().toISOString() };
  set((st) => ({ coachMessages: [...st.coachMessages, userMsg].slice(-100) }));
  const provider = s.coachSettings.provider === 'ollama' ? ollamaProvider(s.coachSettings.ollamaUrl, s.coachSettings.ollamaModel) : localProvider;
  let reply;
  try {
    reply = await provider.answer(text, ctx);
  } catch {
    reply = answerLocally(text, ctx);
  }
  const coachMsg: CoachMessage = {
    id: uid('m'),
    role: 'coach',
    text: reply.text,
    at: new Date().toISOString(),
    severity: reply.severity,
    actions: reply.actions,
    sourceIds: reply.sourceIds,
  };
  set((st) => ({ coachMessages: [...st.coachMessages, coachMsg].slice(-100) }));
}

export function clearCoach() {
  set({ coachMessages: [] });
}

// ---------------- Sauvegarde / restauration ----------------

export async function exportData(includePhotos: boolean): Promise<Blob> {
  const s = get();
  const photos: Record<string, string> = {};
  if (includePhotos) {
    for (const p of s.photos) {
      const b = await photoStore.get(p.blobKey).catch(() => undefined);
      if (b) photos[p.blobKey] = await blobToDataUrl(b);
    }
  }
  const payload = { app: 'muscleos', exportedAt: new Date().toISOString(), state: s, photos };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export async function importData(file: File) {
  const text = await file.text();
  const payload = JSON.parse(text) as { app?: string; state?: AppState; photos?: Record<string, string> };
  if (payload.app !== 'muscleos' || !payload.state) throw new Error('Fichier non reconnu');
  for (const [key, url] of Object.entries(payload.photos ?? {})) await photoStore.put(key, await dataUrlToBlob(url));
  store.replace(payload.state);
  ensureCurrent();
}

export function resetAll() {
  store.reset();
}

export const yesterday = () => addDays(today(), -1);
