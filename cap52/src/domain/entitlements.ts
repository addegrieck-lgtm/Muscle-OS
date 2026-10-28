import { APP_CONFIG } from '../config/app';
import type { ChallengeType } from './types';

export type PremiumFeature = 'multiple_challenges' | 'custom_goal' | 'themes' | 'advanced_stats' | 'friends' | 'coach';

/** Le mode personnalisé est premium ; les trois modes historiques restent gratuits. */
export function isChallengeTypeFree(type: ChallengeType): boolean {
  return type !== 'custom';
}

/**
 * Peut-on créer un challenge de plus ? Seuls les challenges actifs comptent.
 * Dépasser la limite (fin d'abonnement) ne supprime jamais rien : on bloque seulement la création.
 */
export function canCreateChallenge(activeCount: number, isPremium: boolean): boolean {
  const limit = isPremium ? APP_CONFIG.limits.premiumActiveChallenges : APP_CONFIG.limits.freeActiveChallenges;
  return activeCount < limit;
}
