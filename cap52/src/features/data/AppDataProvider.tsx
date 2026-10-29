import { randomUUID } from 'expo-crypto';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Db, DbContext } from '../../database/db';
import { PREFS } from '../../database/preferences';
import * as repo from '../../database/repositories';
import { todayLocal } from '../../domain/dates';
import { computeProgress, type ChallengeProgress } from '../../domain/progress';
import type { Challenge, ChallengeWeek, Deposit } from '../../domain/types';
import type { DepositInput, NewChallengeInput, ReminderSettings } from '../../domain/validation';
import { track } from '../../services/analytics';
import { isThemeId, type ThemeId } from '../../theme/themes';

/** Adaptateur expo-sqlite → interface Db (mêmes requêtes que dans les tests Node). */
export function expoDb(db: SQLiteDatabase): Db {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params) => {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes };
    },
    getAllAsync: (sql, params) => db.getAllAsync(sql, params),
    getFirstAsync: (sql, params) => db.getFirstAsync(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

export interface Preferences {
  onboardingDone: boolean;
  activeChallengeId: string | null;
  themeId: ThemeId;
  reminder: ReminderSettings;
  reminderNotificationId: string | null;
  shareShowAmount: boolean;
  demoPremium: boolean;
}

export interface ChallengeSnapshot {
  challenge: Challenge;
  weeks: ChallengeWeek[];
  deposits: Deposit[];
  progress: ChallengeProgress;
}

interface AppData {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  prefs: Preferences;
  challenges: Challenge[];
  snapshots: ChallengeSnapshot[];
  active: ChallengeSnapshot | null;
  today: string;
  ctx: DbContext;
  reload: () => Promise<void>;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
  createChallenge: (input: NewChallengeInput) => Promise<Challenge>;
  addDeposit: (input: DepositInput) => Promise<void>;
  updateDeposit: (id: string, amountCents: number, depositedOn: string) => Promise<void>;
  cancelDeposit: (id: string) => Promise<void>;
  cancelWeek: (challengeId: string, weekIndex: number) => Promise<void>;
  setWeekSkipped: (challengeId: string, weekIndex: number, skipped: boolean) => Promise<void>;
  setWeekPlanned: (challengeId: string, weekIndex: number, plannedCents: number | null) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
  wipeAll: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

const DEFAULT_PREFS: Preferences = {
  onboardingDone: PREFS.onboardingDone.fallback,
  activeChallengeId: PREFS.activeChallengeId.fallback,
  themeId: 'forest',
  reminder: PREFS.reminder.fallback,
  reminderNotificationId: PREFS.reminderNotificationId.fallback,
  shareShowAmount: PREFS.shareShowAmount.fallback,
  demoPremium: PREFS.demoPremium.fallback,
};

async function loadPrefs(ctx: DbContext): Promise<Preferences> {
  const themeId = await repo.getPreference(ctx, PREFS.themeId.key, PREFS.themeId.schema, PREFS.themeId.fallback);
  return {
    onboardingDone: await repo.getPreference(ctx, PREFS.onboardingDone.key, PREFS.onboardingDone.schema, false),
    activeChallengeId: await repo.getPreference(ctx, PREFS.activeChallengeId.key, PREFS.activeChallengeId.schema, null),
    themeId: isThemeId(themeId) ? themeId : 'forest',
    reminder: await repo.getPreference(ctx, PREFS.reminder.key, PREFS.reminder.schema, PREFS.reminder.fallback),
    reminderNotificationId: await repo.getPreference(
      ctx, PREFS.reminderNotificationId.key, PREFS.reminderNotificationId.schema, null,
    ),
    shareShowAmount: await repo.getPreference(ctx, PREFS.shareShowAmount.key, PREFS.shareShowAmount.schema, true),
    demoPremium: await repo.getPreference(ctx, PREFS.demoPremium.key, PREFS.demoPremium.schema, false),
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const sqlite = useSQLiteContext();
  const ctx = useMemo<DbContext>(() => ({ db: expoDb(sqlite), now: () => new Date(), newId: randomUUID }), [sqlite]);
  const [status, setStatus] = useState<AppData['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rawData, setRawData] = useState<{ challenge: Challenge; weeks: ChallengeWeek[]; deposits: Deposit[] }[]>([]);
  const [today, setToday] = useState(todayLocal());
  const loading = useRef(false);

  const reload = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const [p, list] = [await loadPrefs(ctx), await repo.listChallenges(ctx)];
      const data = [];
      for (const challenge of list) {
        data.push({
          challenge,
          weeks: await repo.listWeeks(ctx, challenge.id),
          deposits: await repo.listDeposits(ctx, challenge.id),
        });
      }
      setPrefs(p);
      setChallenges(list);
      setRawData(data);
      setToday(todayLocal());
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    } finally {
      loading.current = false;
    }
  }, [ctx]);

  useEffect(() => {
    // Chargement initial depuis un système externe (SQLite / store / serveur) : l'état est mis à jour après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  // La date du jour change à minuit : on la rafraîchit pour que la semaine en cours reste juste.
  useEffect(() => {
    const timer = setInterval(() => setToday(todayLocal()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const snapshots = useMemo(
    () => rawData.map((d) => ({ ...d, progress: computeProgress(d.challenge, d.weeks, d.deposits, today) })),
    [rawData, today],
  );
  const active = useMemo(
    () => snapshots.find((s) => s.challenge.id === prefs.activeChallengeId) ?? snapshots.find((s) => s.challenge.status === 'active') ?? null,
    [snapshots, prefs.activeChallengeId],
  );

  const mutate = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const result = await fn();
      await reload();
      return result;
    },
    [reload],
  );

  const setPref = useCallback(
    async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      await repo.setPreference(ctx, PREFS[key].key, value);
      setPrefs((p) => ({ ...p, [key]: value }));
    },
    [ctx],
  );

  const value: AppData = {
    status,
    error,
    prefs,
    challenges,
    snapshots,
    active,
    today,
    ctx,
    reload,
    setPref,
    createChallenge: (input) =>
      mutate(async () => {
        const c = await repo.createChallenge(ctx, input);
        await repo.setPreference(ctx, PREFS.activeChallengeId.key, c.id);
        return c;
      }),
    addDeposit: (input) =>
      mutate(async () => {
        await repo.addDeposit(ctx, input);
        track({ name: 'deposit_declared', weekIndex: input.weekIndex });
      }),
    updateDeposit: (id, amountCents, depositedOn) => mutate(() => repo.updateDeposit(ctx, id, { amountCents, depositedOn })),
    cancelDeposit: (id) => mutate(() => repo.cancelDeposit(ctx, id)),
    cancelWeek: (challengeId, weekIndex) => mutate(() => repo.cancelWeekDeposits(ctx, challengeId, weekIndex)),
    setWeekSkipped: (challengeId, weekIndex, skipped) => mutate(() => repo.setWeekSkipped(ctx, challengeId, weekIndex, skipped)),
    setWeekPlanned: (challengeId, weekIndex, planned) => mutate(() => repo.setWeekPlanned(ctx, challengeId, weekIndex, planned)),
    deleteChallenge: (id) =>
      mutate(async () => {
        await repo.deleteChallenge(ctx, id);
        if (prefs.activeChallengeId === id) await repo.setPreference(ctx, PREFS.activeChallengeId.key, null);
      }),
    wipeAll: () => mutate(() => repo.wipeAllData(ctx)),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData doit être utilisé dans AppDataProvider');
  return value;
}
