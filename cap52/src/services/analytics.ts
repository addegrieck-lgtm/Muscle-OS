/**
 * Indicateurs produit, sans aucun service tiers activé.
 * Les événements sont typés et appelés aux moments clés ; le fournisseur par défaut ne fait rien.
 * Brancher un fournisseur (respectueux de la vie privée, avec consentement si nécessaire) se fait
 * en appelant setAnalyticsProvider au démarrage — voir docs/RELEASE.md, section Indicateurs.
 * Ne jamais envoyer de montants, de noms de challenge ni d'identifiants personnels.
 */
export type AnalyticsEvent =
  | { name: 'onboarding_completed'; mode: string }
  | { name: 'challenge_created'; mode: string }
  | { name: 'deposit_declared'; weekIndex: number }
  | { name: 'share_used' }
  | { name: 'premium_viewed' }
  | { name: 'subscription_started'; period: string };

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
}

let provider: AnalyticsProvider = { track: () => undefined };

export function setAnalyticsProvider(next: AnalyticsProvider) {
  provider = next;
}

export function track(event: AnalyticsEvent) {
  try {
    provider.track(event);
  } catch {
    // Un incident de mesure ne doit jamais affecter l'utilisateur.
  }
}
