/**
 * Configuration centrale de la marque et du produit.
 * Changer le nom de l'application ici suffit pour l'interface ; les identifiants de
 * publication (bundle iOS, package Android, slug) vivent dans app.json et ne doivent
 * être modifiés qu'avec l'accord du propriétaire du projet.
 */
export const APP_CONFIG = {
  name: 'CAP 52',
  tagline: '52 semaines pour prendre le cap',
  defaultCurrency: 'EUR',
  defaultLocale: 'fr-FR',
  supportEmail: 'contact@example.com', // TODO propriétaire : adresse de support réelle
  privacyPolicyUrl: '', // TODO propriétaire : URL publique de la politique de confidentialité
  termsUrl: '', // TODO propriétaire : URL des conditions d'utilisation
  limits: {
    freeActiveChallenges: 1,
    premiumActiveChallenges: 20,
  },
  subscriptions: {
    entitlementId: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'premium',
  },
} as const;
