import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import type { ReminderSettings } from '../../domain/validation';
import { strings } from '../../i18n';

const CHANNEL_ID = 'weekly-reminder';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** À appeler une fois au démarrage : les rappels s'affichent aussi app ouverte. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // Android 13+ : le dialogue de permission n'apparaît qu'après la création d'un canal.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: strings.notifications.channelName,
    importance: AndroidImportance.DEFAULT,
  });
}

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/** Demande la permission dans un contexte compris par l'utilisateur (onboarding ou réglages). */
export async function requestPermission(): Promise<PermissionState> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  return toState(await Notifications.requestPermissionsAsync());
}

/**
 * Remplace le rappel programmé par celui correspondant aux réglages.
 * Le déclencheur hebdomadaire est exprimé en heure locale : il suit automatiquement
 * les changements de fuseau horaire et d'heure d'été.
 * Retourne l'identifiant programmé, ou null si aucun rappel n'est actif.
 */
export async function syncReminder(settings: ReminderSettings): Promise<string | null> {
  // L'application ne programme que ce rappel : on repart d'un état propre pour éviter les doublons.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return null;
  if ((await getPermission()) !== 'granted') return null;
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: { title: strings.notifications.title, body: strings.notifications.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: settings.weekday,
      hour: settings.hour,
      minute: settings.minute,
      channelId: CHANNEL_ID,
    },
  });
}

/** Prochaine date de déclenchement réelle, telle que programmée par le système. */
export async function nextReminderDate(): Promise<Date | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const first = scheduled[0];
  if (!first?.trigger) return null;
  try {
    const next = await Notifications.getNextTriggerDateAsync(first.trigger as Notifications.SchedulableNotificationTriggerInput);
    return next ? new Date(next) : null;
  } catch {
    return null;
  }
}
