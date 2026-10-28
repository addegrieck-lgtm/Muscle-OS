import type { z } from 'zod';
import { buildPlan, progressionTotal } from '../domain/plan';
import type { Challenge, ChallengeWeek, Deposit } from '../domain/types';
import {
  depositInputSchema,
  newChallengeSchema,
  type DepositInput,
  type NewChallengeInput,
} from '../domain/validation';
import { DatabaseError, type DbContext } from './db';

// ── Lignes SQL ──────────────────────────────────────────────────────────────

interface ChallengeRow {
  id: string;
  owner_id: string | null;
  name: string;
  type: Challenge['type'];
  currency: string;
  target_cents: number;
  unit_cents: number;
  week_count: number;
  start_date: string;
  strategy: Challenge['strategy'];
  icon: string;
  color: string;
  status: Challenge['status'];
  created_at: string;
  updated_at: string;
}

interface WeekRow {
  challenge_id: string;
  week_index: number;
  planned_cents: number | null;
  skipped: number;
  updated_at: string;
}

interface DepositRow {
  id: string;
  challenge_id: string;
  week_index: number;
  amount_cents: number;
  deposited_on: string;
  status: Deposit['status'];
  created_at: string;
  updated_at: string;
}

const toChallenge = (r: ChallengeRow): Challenge => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  type: r.type,
  currency: r.currency,
  targetCents: r.target_cents,
  unitCents: r.unit_cents,
  weekCount: r.week_count,
  startDate: r.start_date,
  strategy: r.strategy,
  icon: r.icon,
  color: r.color,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toWeek = (r: WeekRow): ChallengeWeek => ({
  challengeId: r.challenge_id,
  index: r.week_index,
  plannedCents: r.planned_cents,
  skipped: r.skipped === 1,
  updatedAt: r.updated_at,
});

const toDeposit = (r: DepositRow): Deposit => ({
  id: r.id,
  challengeId: r.challenge_id,
  weekIndex: r.week_index,
  amountCents: r.amount_cents,
  depositedOn: r.deposited_on,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const iso = (ctx: DbContext) => ctx.now().toISOString();

// ── Challenges ──────────────────────────────────────────────────────────────

export async function createChallenge(ctx: DbContext, input: NewChallengeInput): Promise<Challenge> {
  const data = newChallengeSchema.parse(input);
  const plan = buildPlan(data);
  // Classique et inversé : l'objectif découle du plan (1 378 € pour 52 × 1 €).
  const targetCents =
    data.type === 'classic' || data.type === 'reverse' ? progressionTotal(data.weekCount, data.unitCents) : data.targetCents;
  const now = iso(ctx);
  const id = ctx.newId();

  await ctx.db.withTransactionAsync(async () => {
    await ctx.db.runAsync(
      `INSERT INTO challenges (id, owner_id, name, type, currency, target_cents, unit_cents, week_count, start_date,
         strategy, icon, color, status, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, data.name, data.type, data.currency, targetCents, data.unitCents, data.weekCount, data.startDate,
        data.type === 'custom' ? data.strategy : null, data.icon, data.color, now, now],
    );
    for (let i = 0; i < plan.length; i++) {
      await ctx.db.runAsync(
        'INSERT INTO challenge_weeks (challenge_id, week_index, planned_cents, skipped, updated_at) VALUES (?, ?, ?, 0, ?)',
        [id, i + 1, plan[i], now],
      );
    }
  });
  const created = await getChallenge(ctx, id);
  if (!created) throw new DatabaseError('Le challenge créé est introuvable');
  return created;
}

export async function listChallenges(ctx: DbContext): Promise<Challenge[]> {
  const rows = await ctx.db.getAllAsync<ChallengeRow>(
    'SELECT * FROM challenges WHERE deleted_at IS NULL ORDER BY created_at ASC',
    [],
  );
  return rows.map(toChallenge);
}

export async function getChallenge(ctx: DbContext, id: string): Promise<Challenge | null> {
  const row = await ctx.db.getFirstAsync<ChallengeRow>(
    'SELECT * FROM challenges WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return row ? toChallenge(row) : null;
}

export async function updateChallengeDetails(
  ctx: DbContext,
  id: string,
  details: { name: string; icon: string; color: string },
): Promise<void> {
  const name = details.name.trim();
  if (name.length === 0 || name.length > 40) throw new DatabaseError('Nom invalide');
  await ctx.db.runAsync('UPDATE challenges SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?', [
    name, details.icon, details.color, iso(ctx), id,
  ]);
}

export async function setChallengeStatus(ctx: DbContext, id: string, status: Challenge['status']): Promise<void> {
  await ctx.db.runAsync('UPDATE challenges SET status = ?, updated_at = ? WHERE id = ?', [status, iso(ctx), id]);
}

/** Suppression logique : nécessaire pour propager la suppression lors d'une synchronisation. */
export async function deleteChallenge(ctx: DbContext, id: string): Promise<void> {
  const now = iso(ctx);
  await ctx.db.runAsync('UPDATE challenges SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
}

// ── Semaines ────────────────────────────────────────────────────────────────

export async function listWeeks(ctx: DbContext, challengeId: string): Promise<ChallengeWeek[]> {
  const rows = await ctx.db.getAllAsync<WeekRow>(
    'SELECT * FROM challenge_weeks WHERE challenge_id = ? ORDER BY week_index ASC',
    [challengeId],
  );
  return rows.map(toWeek);
}

export async function setWeekSkipped(ctx: DbContext, challengeId: string, weekIndex: number, skipped: boolean) {
  await ctx.db.runAsync(
    'UPDATE challenge_weeks SET skipped = ?, updated_at = ? WHERE challenge_id = ? AND week_index = ?',
    [skipped ? 1 : 0, iso(ctx), challengeId, weekIndex],
  );
}

/** Mode libre uniquement : montant prévu choisi semaine par semaine (null = pas de montant prévu). */
export async function setWeekPlanned(ctx: DbContext, challengeId: string, weekIndex: number, plannedCents: number | null) {
  const challenge = await getChallenge(ctx, challengeId);
  if (!challenge) throw new DatabaseError('Challenge introuvable');
  if (challenge.type !== 'free') throw new DatabaseError('Seul le mode libre permet de modifier le montant prévu');
  if (plannedCents !== null && (!Number.isSafeInteger(plannedCents) || plannedCents < 0)) {
    throw new DatabaseError('Montant invalide');
  }
  await ctx.db.runAsync(
    'UPDATE challenge_weeks SET planned_cents = ?, updated_at = ? WHERE challenge_id = ? AND week_index = ?',
    [plannedCents, iso(ctx), challengeId, weekIndex],
  );
}

// ── Versements ──────────────────────────────────────────────────────────────

export async function listDeposits(ctx: DbContext, challengeId?: string): Promise<Deposit[]> {
  const rows = challengeId
    ? await ctx.db.getAllAsync<DepositRow>(
        'SELECT * FROM deposits WHERE challenge_id = ? ORDER BY deposited_on ASC, created_at ASC',
        [challengeId],
      )
    : await ctx.db.getAllAsync<DepositRow>(
        `SELECT d.* FROM deposits d JOIN challenges c ON c.id = d.challenge_id
         WHERE c.deleted_at IS NULL ORDER BY d.deposited_on ASC, d.created_at ASC`,
        [],
      );
  return rows.map(toDeposit);
}

export async function addDeposit(ctx: DbContext, input: DepositInput): Promise<Deposit> {
  const data = depositInputSchema.parse(input);
  const challenge = await getChallenge(ctx, data.challengeId);
  if (!challenge) throw new DatabaseError('Challenge introuvable');
  if (data.weekIndex > challenge.weekCount) throw new DatabaseError('Semaine hors du challenge');
  const now = iso(ctx);
  const id = ctx.newId();
  await ctx.db.withTransactionAsync(async () => {
    await ctx.db.runAsync(
      `INSERT INTO deposits (id, challenge_id, week_index, amount_cents, deposited_on, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, data.challengeId, data.weekIndex, data.amountCents, data.depositedOn, now, now],
    );
    // Un versement sur une semaine ignorée la réactive : l'utilisateur a changé d'avis.
    await ctx.db.runAsync(
      'UPDATE challenge_weeks SET skipped = 0, updated_at = ? WHERE challenge_id = ? AND week_index = ? AND skipped = 1',
      [now, data.challengeId, data.weekIndex],
    );
  });
  return {
    id, challengeId: data.challengeId, weekIndex: data.weekIndex, amountCents: data.amountCents,
    depositedOn: data.depositedOn, status: 'active', createdAt: now, updatedAt: now,
  };
}

export async function updateDeposit(
  ctx: DbContext,
  id: string,
  changes: { amountCents: number; depositedOn: string },
): Promise<void> {
  const data = depositInputSchema.pick({ amountCents: true, depositedOn: true }).parse(changes);
  const result = await ctx.db.runAsync(
    "UPDATE deposits SET amount_cents = ?, deposited_on = ?, updated_at = ? WHERE id = ? AND status = 'active'",
    [data.amountCents, data.depositedOn, iso(ctx), id],
  );
  if (result.changes === 0) throw new DatabaseError('Versement introuvable ou annulé');
}

/** Annulation logique : le versement reste dans l'historique avec le statut « cancelled ». */
export async function cancelDeposit(ctx: DbContext, id: string): Promise<void> {
  await ctx.db.runAsync("UPDATE deposits SET status = 'cancelled', updated_at = ? WHERE id = ?", [iso(ctx), id]);
}

export async function cancelWeekDeposits(ctx: DbContext, challengeId: string, weekIndex: number): Promise<void> {
  await ctx.db.runAsync(
    "UPDATE deposits SET status = 'cancelled', updated_at = ? WHERE challenge_id = ? AND week_index = ? AND status = 'active'",
    [iso(ctx), challengeId, weekIndex],
  );
}

// ── Préférences (clé → JSON validé) ─────────────────────────────────────────

export async function getPreference<T>(ctx: DbContext, key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const row = await ctx.db.getFirstAsync<{ value: string }>('SELECT value FROM preferences WHERE key = ?', [key]);
  if (!row) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback; // valeur corrompue : on retombe sur la valeur par défaut sans planter
  }
}

export async function setPreference(ctx: DbContext, key: string, value: unknown): Promise<void> {
  await ctx.db.runAsync(
    `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), iso(ctx)],
  );
}

// ── Export et effacement ───────────────────────────────────────────────────

export async function exportAllData(ctx: DbContext) {
  const challenges = await ctx.db.getAllAsync<ChallengeRow>('SELECT * FROM challenges', []);
  const weeks = await ctx.db.getAllAsync<WeekRow>('SELECT * FROM challenge_weeks', []);
  const deposits = await ctx.db.getAllAsync<DepositRow>('SELECT * FROM deposits', []);
  const preferences = await ctx.db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM preferences', []);
  return {
    format: 'cap52-export',
    version: 1,
    exportedAt: iso(ctx),
    challenges: challenges.map(toChallenge),
    weeks: weeks.map(toWeek),
    deposits: deposits.map(toDeposit),
    preferences: Object.fromEntries(preferences.map((p) => [p.key, JSON.parse(p.value) as unknown])),
  };
}

export async function wipeAllData(ctx: DbContext): Promise<void> {
  await ctx.db.withTransactionAsync(async () => {
    await ctx.db.execAsync('DELETE FROM deposits; DELETE FROM challenge_weeks; DELETE FROM challenges; DELETE FROM preferences;');
  });
}
