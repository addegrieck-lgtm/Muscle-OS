import { Platform } from 'react-native';

/**
 * Variables publiques (préfixe EXPO_PUBLIC_) : elles sont incluses dans le bundle mobile.
 * N'y mettre QUE des clés conçues pour être publiques (clé anon Supabase protégée par RLS,
 * clés SDK publiques RevenueCat). Les secrets restent côté serveur (Supabase Edge Functions).
 * Expo remplace `process.env.EXPO_PUBLIC_*` à la compilation : l'accès doit rester littéral.
 */
const clean = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : null);

export const ENV = {
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  revenueCatKey: clean(
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
        : undefined,
  ),
};

export const isSupabaseConfigured = ENV.supabaseUrl !== null && ENV.supabaseAnonKey !== null;
export const isRevenueCatConfigured = ENV.revenueCatKey !== null;
