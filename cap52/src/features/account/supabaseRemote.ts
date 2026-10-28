import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncRemote } from './syncEngine';

/** Adaptateur Supabase du moteur de synchronisation. RLS limite les lectures aux lignes de l'utilisateur. */
export function supabaseRemote(client: SupabaseClient): SyncRemote {
  return {
    async fetch(table) {
      const { data, error } = await client.from(table).select('*');
      if (error) throw error;
      return data ?? [];
    },
    async upsert(table, rows) {
      const onConflict = table === 'challenge_weeks' ? 'challenge_id,week_index' : 'id';
      // Par lots pour rester sous les limites de taille de requête.
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await client.from(table).upsert(rows.slice(i, i + 200), { onConflict });
        if (error) throw error;
      }
    },
  };
}
