import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { ENV, isSupabaseConfigured } from '../config/env';

/**
 * Client Supabase, ou null si le serveur n'est pas configuré.
 * Seule la clé « anon » publique est utilisée ici : l'accès aux données est protégé
 * par les politiques Row Level Security définies dans supabase/migrations.
 */
export const supabase: SupabaseClient | null =
  isSupabaseConfigured && ENV.supabaseUrl && ENV.supabaseAnonKey
    ? createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
        auth: {
          storage: Storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
