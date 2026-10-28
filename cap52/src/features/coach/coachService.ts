import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import type { ChallengeSnapshot } from '../data/AppDataProvider';

export type CoachError = 'not_configured' | 'quota_exceeded' | 'premium_required' | 'unauthorized' | 'unavailable';

/**
 * Interroge le coach via l'Edge Function « coach ». La clé du fournisseur d'IA reste sur le serveur.
 * Seuls des agrégats du challenge sont envoyés (pas de nom, pas d'e-mail, pas d'historique détaillé).
 */
export async function askCoach(
  client: SupabaseClient,
  message: string,
  snapshot: ChallengeSnapshot,
): Promise<{ reply: string } | { error: CoachError }> {
  const { challenge, progress } = snapshot;
  const { data, error } = await client.functions.invoke('coach', {
    body: {
      message,
      context: {
        challengeType: challenge.type,
        weekCount: challenge.weekCount,
        currentWeek: progress.currentWeek,
        completedWeeks: progress.completedWeeks,
        lateWeeks: progress.lateWeeks,
        totalSavedCents: progress.totalSavedCents,
        targetCents: progress.targetCents,
        currency: challenge.currency,
      },
    },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const code = body?.error;
      if (code === 'not_configured' || code === 'quota_exceeded' || code === 'premium_required' || code === 'unauthorized') {
        return { error: code };
      }
    }
    return { error: 'unavailable' };
  }
  const reply = (data as { reply?: unknown } | null)?.reply;
  return typeof reply === 'string' && reply.length > 0 ? { reply } : { error: 'unavailable' };
}
