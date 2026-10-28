// Coach IA de CAP 52.
// - Identité vérifiée, droit premium vérifié côté serveur, quota quotidien atomique.
// - Entrées validées et bornées ; aucune donnée personnelle (e-mail, identifiant) n'est envoyée au modèle.
// - Rien n'est stocké hormis le compteur de quota (purgé après 30 jours).
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { adminClient, authenticate, corsHeaders, json } from '../_shared/auth.ts';

const MODEL = Deno.env.get('COACH_MODEL') ?? 'claude-opus-5-5';
const DAILY_LIMIT = Number(Deno.env.get('COACH_DAILY_LIMIT') ?? '20');

const SYSTEM_PROMPT = `Tu es le coach de CAP 52, une application d'épargne sur 52 semaines.
L'utilisateur déclare lui-même ses versements : tu ne connais pas son solde bancaire réel et tu ne dois jamais prétendre le connaître.
Tu aides à comprendre la progression, à ajuster un objectif, à trouver un rythme réaliste et à rester régulier.
Tu ne recommandes aucun placement financier, aucun produit d'investissement, et tu ne promets aucun rendement.
Les estimations que tu donnes sont indicatives et fondées uniquement sur les données fournies.
Ton ton est positif, simple et jamais culpabilisant. Réponds en français, en 120 mots maximum, sans titres ni listes longues.`;

interface CoachContext {
  challengeType: string;
  weekCount: number;
  currentWeek: number;
  completedWeeks: number;
  lateWeeks: number;
  totalSavedCents: number;
  targetCents: number;
  currency: string;
}

function parseBody(raw: unknown): { message: string; context: CoachContext } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { message, context } = raw as { message?: unknown; context?: Record<string, unknown> };
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 500) return null;
  if (typeof context !== 'object' || context === null) return null;
  const int = (v: unknown, max: number) => (Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : null);
  const parsed = {
    challengeType: ['classic', 'reverse', 'free', 'custom'].includes(context.challengeType as string) ? (context.challengeType as string) : null,
    weekCount: int(context.weekCount, 260),
    currentWeek: int(context.currentWeek, 261),
    completedWeeks: int(context.completedWeeks, 260),
    lateWeeks: int(context.lateWeeks, 260),
    totalSavedCents: int(context.totalSavedCents, 10_000_000_000),
    targetCents: int(context.targetCents, 10_000_000_000),
    currency: typeof context.currency === 'string' && /^[A-Z]{3}$/.test(context.currency) ? context.currency : null,
  };
  if (Object.values(parsed).some((v) => v === null)) return null;
  return { message: message.trim(), context: parsed as CoachContext };
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  const user = await authenticate(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = parseBody(await req.json().catch(() => null));
  if (!body) return json({ error: 'invalid_input' }, 400);

  const admin = adminClient();
  const { data: premium, error: premiumError } = await admin.rpc('has_premium', { p_user: user.id });
  if (premiumError) return json({ error: 'unavailable' }, 503);
  if (!premium) return json({ error: 'premium_required' }, 403);

  const { data: used, error: quotaError } = await admin.rpc('consume_ai_quota', { p_user: user.id, p_limit: DAILY_LIMIT });
  if (quotaError) return json({ error: 'unavailable' }, 503);
  if (used === -1) return json({ error: 'quota_exceeded' }, 429);

  const c = body.context;
  const contextText = [
    `Type de challenge : ${c.challengeType}`,
    `Semaine en cours : ${c.currentWeek} sur ${c.weekCount}`,
    `Semaines réalisées : ${c.completedWeeks} ; à rattraper : ${c.lateWeeks}`,
    `Total déclaré : ${money(c.totalSavedCents, c.currency)} sur un objectif de ${money(c.targetCents, c.currency)}`,
  ].join('\n');

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Réponse courte et conversationnelle : un effort faible suffit et limite le coût.
      output_config: { effort: 'low' },
      // En cas de refus par les garde-fous, l'API relance automatiquement sur un modèle de repli.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Données saisies dans l'application :\n${contextText}\n\nQuestion : ${body.message}` }],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'unavailable' }, 502);
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) return json({ error: 'unavailable' }, 502);
    return json({ reply: text, remainingToday: Math.max(0, DAILY_LIMIT - (used as number)) });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'unavailable' }, 503);
    if (error instanceof Anthropic.APIError) {
      console.error('coach: erreur API', error.status);
      return json({ error: 'unavailable' }, 502);
    }
    console.error('coach: erreur inattendue');
    return json({ error: 'unavailable' }, 500);
  }
});
