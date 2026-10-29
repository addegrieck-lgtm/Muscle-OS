import { z } from 'zod';
import { reminderSettingsSchema, type ReminderSettings } from '../domain/validation';

/** Clés, schémas et valeurs par défaut des préférences stockées dans la table `preferences`. */
export const PREFS = {
  onboardingDone: { key: 'onboarding_done', schema: z.boolean(), fallback: false },
  activeChallengeId: { key: 'active_challenge_id', schema: z.string().nullable(), fallback: null as string | null },
  themeId: { key: 'theme_id', schema: z.string(), fallback: 'forest' },
  reminder: {
    key: 'reminder',
    schema: reminderSettingsSchema,
    // Dimanche 18 h : moment calme pour faire le point de la semaine.
    fallback: { enabled: false, weekday: 1, hour: 18, minute: 0 } as ReminderSettings,
  },
  reminderNotificationId: { key: 'reminder_notification_id', schema: z.string().nullable(), fallback: null as string | null },
  shareShowAmount: { key: 'share_show_amount', schema: z.boolean(), fallback: true },
  demoPremium: { key: 'demo_premium', schema: z.boolean(), fallback: false },
} as const;
