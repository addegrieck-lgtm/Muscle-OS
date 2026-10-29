import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { ReminderSettings } from '../../domain/validation';
import { useAppData } from '../data/AppDataProvider';
import { getPermission, nextReminderDate, requestPermission, syncReminder, type PermissionState } from './reminders';

/** État et actions des rappels, partagés par l'onboarding, l'accueil et les réglages. */
export function useReminders() {
  const { prefs, setPref } = useAppData();
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [next, setNext] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPermission(await getPermission());
      setNext(await nextReminderDate());
    } catch {
      setNext(null);
    }
  }, []);

  useEffect(() => {
    // Chargement initial depuis un système externe (SQLite / store / serveur) : l'état est mis à jour après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // L'utilisateur peut changer la permission dans les réglages du téléphone : on revérifie au retour.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  const apply = useCallback(
    async (settings: ReminderSettings) => {
      let effective = settings;
      if (settings.enabled) {
        const state = await requestPermission();
        setPermission(state);
        if (state !== 'granted') effective = { ...settings, enabled: false };
      }
      const id = await syncReminder(effective);
      await setPref('reminder', effective);
      await setPref('reminderNotificationId', id);
      await refresh();
      return effective;
    },
    [setPref, refresh],
  );

  return { settings: prefs.reminder, permission, next, apply, refresh };
}
