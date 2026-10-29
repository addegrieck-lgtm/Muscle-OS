// Webhook RevenueCat → table subscription_entitlements.
// Seule source d'écriture des droits premium côté serveur (utilisés par le coach et les défis).
// RevenueCat doit être configuré avec l'en-tête « Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET> »,
// et l'application appelle Purchases.logIn(<id utilisateur Supabase>) pour que app_user_id corresponde.
import { adminClient, json } from '../_shared/auth.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const entitlementId = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'premium';
  if (!secret) return json({ error: 'not_configured' }, 503);
  if (!timingSafeEqual(req.headers.get('Authorization') ?? '', `Bearer ${secret}`)) return json({ error: 'unauthorized' }, 401);

  const payload = await req.json().catch(() => null);
  const event = payload?.event;
  if (!event || typeof event.app_user_id !== 'string') return json({ error: 'invalid_payload' }, 400);
  // Achats anonymes (avant connexion) : rien à rattacher côté serveur.
  if (!UUID.test(event.app_user_id)) return json({ ok: true, ignored: 'anonymous_user' });

  const entitlements: string[] = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  if (!entitlements.includes(entitlementId) && event.type !== 'TEST') return json({ ok: true, ignored: 'other_entitlement' });

  const expiresAt = typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms) : null;
  const revoked = event.type === 'EXPIRATION' || event.type === 'REFUND';
  const active = !revoked && (expiresAt === null || expiresAt.getTime() > Date.now());

  const { error } = await adminClient()
    .from('subscription_entitlements')
    .upsert({
      user_id: event.app_user_id,
      entitlement: entitlementId,
      active,
      expires_at: expiresAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    });
  if (error) return json({ error: 'storage_failed' }, 500);
  return json({ ok: true });
});
