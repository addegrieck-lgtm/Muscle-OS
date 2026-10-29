// Suppression du compte de l'appelant. Les données associées sont supprimées en cascade
// (challenges, semaines, versements, défis, droits, quotas : clés étrangères ON DELETE CASCADE).
import { adminClient, authenticate, corsHeaders, json } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const user = await authenticate(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'delete_failed' }, 500);
  return json({ ok: true });
});
