import { useSyncExternalStore } from 'react';
import type {
  CardioSession,
  CoachMessage,
  CoachSettings,
  DayMeals,
  ExerciseProgress,
  IntakeLog,
  ISODate,
  Measurement,
  ProgressPhoto,
  Program,
  RecoveryEntry,
  ShoppingList,
  User,
  WeightEntry,
  WorkoutSession,
} from '../types/models';
import { LocalStorageAdapter, type StorageAdapter } from './storage';

export const STATE_VERSION = 1;

export interface AppState {
  version: number;
  user?: User;
  program?: Program;
  progress: Record<string, ExerciseProgress>;
  sessions: WorkoutSession[];
  activeSession?: WorkoutSession;
  cardioSessions: CardioSession[];
  weights: WeightEntry[];
  measurements: Measurement[];
  photos: ProgressPhoto[];
  recovery: RecoveryEntry[];
  mealPlan?: { weekStart: ISODate; days: DayMeals[]; pantryMode: boolean };
  pantry: string[];
  pantryMode: boolean;
  shoppingList?: ShoppingList;
  intake: Record<ISODate, IntakeLog>;
  coachMessages: CoachMessage[];
  coachSettings: CoachSettings;
  calorieOffset: number;
  lastSessionSummary?: { sessionId: string; messages: { exerciseId: string; message: string; change: string }[] };
}

export const initialState = (): AppState => ({
  version: STATE_VERSION,
  progress: {},
  sessions: [],
  cardioSessions: [],
  weights: [],
  measurements: [],
  photos: [],
  recovery: [],
  pantry: [],
  pantryMode: false,
  intake: {},
  coachMessages: [],
  coachSettings: { provider: 'local', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3.1' },
  calorieOffset: 0,
});

/** Migrations de schéma (ajouter un cas par version). */
export function migrate(raw: Partial<AppState> | null): AppState {
  const base = initialState();
  if (!raw) return base;
  return { ...base, ...raw, version: STATE_VERSION, coachSettings: { ...base.coachSettings, ...(raw.coachSettings ?? {}) } };
}

type Listener = () => void;

export function createStore(adapter: StorageAdapter<AppState>) {
  let state = migrate(adapter.load());
  const listeners = new Set<Listener>();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => adapter.save(state), 150);
  };

  return {
    get: () => state,
    set(updater: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
      const patch = typeof updater === 'function' ? updater(state) : updater;
      state = { ...state, ...patch };
      persist();
      listeners.forEach((l) => l());
    },
    replace(next: AppState) {
      state = migrate(next);
      adapter.save(state);
      listeners.forEach((l) => l());
    },
    flush: () => adapter.save(state),
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    reset() {
      state = initialState();
      adapter.clear();
      listeners.forEach((l) => l());
    },
  };
}

export const store = createStore(new LocalStorageAdapter<AppState>('muscleos:v1'));

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => store.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flush();
  });
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
