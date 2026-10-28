import type { BindValue, DbContext } from '../../database/db';
import { mergeRows } from '../../domain/sync';

/**
 * Synchronisation bidirectionnelle local ↔ serveur.
 * Les tables locales et distantes ont les mêmes colonnes (snake_case) : on fusionne ligne à ligne
 * avec mergeRows (la modification la plus récente l'emporte). Rien n'est supprimé physiquement :
 * challenges (deleted_at) et versements (status) sont des suppressions logiques.
 */
export interface SyncRemote {
  fetch(table: SyncTable): Promise<Record<string, unknown>[]>;
  upsert(table: SyncTable, rows: Record<string, unknown>[]): Promise<void>;
}

export type SyncTable = 'challenges' | 'challenge_weeks' | 'deposits';

type Row = Record<string, unknown> & { updatedAt: string };

const COLUMNS: Record<SyncTable, string[]> = {
  challenges: [
    'id', 'owner_id', 'name', 'type', 'currency', 'target_cents', 'unit_cents', 'week_count', 'start_date',
    'strategy', 'icon', 'color', 'status', 'created_at', 'updated_at', 'deleted_at',
  ],
  challenge_weeks: ['challenge_id', 'week_index', 'planned_cents', 'skipped', 'updated_at'],
  deposits: ['id', 'challenge_id', 'week_index', 'amount_cents', 'deposited_on', 'status', 'created_at', 'updated_at'],
};

const KEYS: Record<SyncTable, (r: Record<string, unknown>) => string> = {
  challenges: (r) => String(r.id),
  challenge_weeks: (r) => `${r.challenge_id}:${r.week_index}`,
  deposits: (r) => String(r.id),
};

const TIMESTAMPS = new Set(['created_at', 'updated_at', 'deleted_at']);
const DATES = new Set(['start_date', 'deposited_on']);

/** Représentation commune : horodatages ISO UTC, dates AAAA-MM-JJ, booléens en 0/1. */
function normalize(table: SyncTable, raw: Record<string, unknown>): Row {
  const row: Record<string, unknown> = {};
  for (const col of COLUMNS[table]) {
    let v = raw[col] ?? null;
    if (v !== null && TIMESTAMPS.has(col)) v = new Date(String(v)).toISOString();
    if (v !== null && DATES.has(col)) v = String(v).slice(0, 10);
    if (col === 'skipped') v = v === true || v === 1 ? 1 : 0;
    row[col] = v;
  }
  return { ...row, updatedAt: String(row.updated_at) };
}

function toRemote(table: SyncTable, row: Row, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of COLUMNS[table]) out[col] = row[col];
  out.owner_id = userId;
  if (table === 'challenge_weeks') out.skipped = row.skipped === 1;
  return out;
}

async function applyLocal(ctx: DbContext, table: SyncTable, rows: Row[], userId: string) {
  const cols = COLUMNS[table];
  const keyCols = table === 'challenge_weeks' ? ['challenge_id', 'week_index'] : ['id'];
  const updates = cols.filter((c) => !keyCols.includes(c)).map((c) => `${c} = excluded.${c}`).join(', ');
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
    ON CONFLICT(${keyCols.join(', ')}) DO UPDATE SET ${updates}`;
  for (const row of rows) {
    const values = cols.map((c) => (c === 'owner_id' ? userId : (row[c] as BindValue)));
    await ctx.db.runAsync(sql, values);
  }
}

export async function syncAll(ctx: DbContext, remote: SyncRemote, userId: string): Promise<number> {
  let changed = 0;
  // Ordre imposé par les clés étrangères : challenges, puis semaines, puis versements.
  for (const table of ['challenges', 'challenge_weeks', 'deposits'] as const) {
    const local = (await ctx.db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`, [])).map((r) => normalize(table, r));
    const distant = (await remote.fetch(table)).map((r) => normalize(table, r));
    const { toPush, toApplyLocally } = mergeRows(local, distant, KEYS[table]);
    if (toPush.length > 0) await remote.upsert(table, toPush.map((r) => toRemote(table, r, userId)));
    if (toApplyLocally.length > 0) {
      await ctx.db.withTransactionAsync(() => applyLocal(ctx, table, toApplyLocally, userId));
    }
    changed += toPush.length + toApplyLocally.length;
  }
  // Les challenges créés hors connexion sont désormais rattachés au compte.
  await ctx.db.runAsync('UPDATE challenges SET owner_id = ? WHERE owner_id IS NULL', [userId]);
  return changed;
}
