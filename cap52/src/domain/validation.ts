import { z } from 'zod';
import { isLocalDate } from './dates';
import { MAX_AMOUNT_CENTS } from './money';

const cents = z.number().int().min(0).max(MAX_AMOUNT_CENTS);
const localDate = z.string().refine(isLocalDate, 'Date invalide');

export const newChallengeSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    type: z.enum(['classic', 'reverse', 'free', 'custom']),
    currency: z.string().regex(/^[A-Z]{3}$/),
    unitCents: cents.min(1),
    weekCount: z.number().int().min(1).max(260),
    targetCents: cents,
    startDate: localDate,
    strategy: z.enum(['equal', 'increasing', 'decreasing']).nullable(),
    icon: z.string().min(1).max(32),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .superRefine((value, ctx) => {
    if ((value.type === 'free' || value.type === 'custom') && value.targetCents < 100) {
      ctx.addIssue({ code: 'custom', path: ['targetCents'], message: 'Objectif trop faible' });
    }
    if (value.type === 'custom' && value.strategy === null) {
      ctx.addIssue({ code: 'custom', path: ['strategy'], message: 'Stratégie requise' });
    }
  });

export type NewChallengeInput = z.infer<typeof newChallengeSchema>;

export const depositInputSchema = z.object({
  challengeId: z.string().min(1),
  weekIndex: z.number().int().min(1),
  amountCents: cents.min(1),
  depositedOn: localDate,
});

export type DepositInput = z.infer<typeof depositInputSchema>;

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  weekday: z.number().int().min(1).max(7), // 1 = dimanche
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;
