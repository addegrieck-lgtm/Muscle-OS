/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { DATABASE_VERSION, migrate } from '../../src/database/migrations';
import * as repo from '../../src/database/repositories';
import { computeProgress } from '../../src/domain/progress';
import type { NewChallengeInput } from '../../src/domain/validation';
import { openNodeDb, testContext } from '../helpers/nodeDb';

const classic: NewChallengeInput = {
  name: 'Mon CAP 52', type: 'classic', currency: 'EUR', unitCents: 100, weekCount: 52, targetCents: 0,
  startDate: '2027-01-04', strategy: null, icon: 'target', color: '#D9F99D',
};

async function freshContext() {
  const db = openNodeDb();
  await migrate(db);
  return testContext(db);
}

describe('migrations', () => {
  it('sont idempotentes', async () => {
    const db = openNodeDb();
    expect(await migrate(db)).toBe(DATABASE_VERSION);
    expect(await migrate(db)).toBe(DATABASE_VERSION);
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
    expect(v?.user_version).toBe(DATABASE_VERSION);
  });

  it('refusent une base plus récente que l’application', async () => {
    const db = openNodeDb();
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION + 1}`);
    await expect(migrate(db)).rejects.toThrow(/plus récente/);
  });
});

describe('challenges et versements', () => {
  it('crée un challenge classique avec 52 semaines et 1 378 € d’objectif', async () => {
    const ctx = await freshContext();
    const c = await repo.createChallenge(ctx, classic);
    expect(c.targetCents).toBe(137_800);
    const weeks = await repo.listWeeks(ctx, c.id);
    expect(weeks).toHaveLength(52);
    expect(weeks[51].plannedCents).toBe(5_200);
  });

  it('valide, modifie et annule un versement', async () => {
    const ctx = await freshContext();
    const c = await repo.createChallenge(ctx, classic);
    const d = await repo.addDeposit(ctx, { challengeId: c.id, weekIndex: 1, amountCents: 100, depositedOn: '2027-01-05' });

    ctx.tick();
    await repo.updateDeposit(ctx, d.id, { amountCents: 250, depositedOn: '2027-01-06' });
    let deposits = await repo.listDeposits(ctx, c.id);
    expect(deposits[0].amountCents).toBe(250);
    expect(deposits[0].updatedAt > deposits[0].createdAt).toBe(true);

    await repo.cancelDeposit(ctx, d.id);
    deposits = await repo.listDeposits(ctx, c.id);
    expect(deposits).toHaveLength(1); // conservé dans l'historique
    expect(deposits[0].status).toBe('cancelled');
    await expect(repo.updateDeposit(ctx, d.id, { amountCents: 1, depositedOn: '2027-01-06' })).rejects.toThrow();

    const weeks = await repo.listWeeks(ctx, c.id);
    expect(computeProgress(c, weeks, deposits, '2027-01-06').totalSavedCents).toBe(0);
  });

  it('refuse montant nul, négatif ou semaine hors challenge', async () => {
    const ctx = await freshContext();
    const c = await repo.createChallenge(ctx, classic);
    const base = { challengeId: c.id, weekIndex: 1, depositedOn: '2027-01-05' };
    await expect(repo.addDeposit(ctx, { ...base, amountCents: 0 })).rejects.toThrow();
    await expect(repo.addDeposit(ctx, { ...base, amountCents: -100 })).rejects.toThrow();
    await expect(repo.addDeposit(ctx, { ...base, amountCents: 1.5 })).rejects.toThrow();
    await expect(repo.addDeposit(ctx, { ...base, weekIndex: 53, amountCents: 100 })).rejects.toThrow();
    await expect(repo.addDeposit(ctx, { ...base, challengeId: 'inconnu', amountCents: 100 })).rejects.toThrow();
  });

  it('un versement réactive une semaine ignorée', async () => {
    const ctx = await freshContext();
    const c = await repo.createChallenge(ctx, classic);
    await repo.setWeekSkipped(ctx, c.id, 2, true);
    expect((await repo.listWeeks(ctx, c.id))[1].skipped).toBe(true);
    await repo.addDeposit(ctx, { challengeId: c.id, weekIndex: 2, amountCents: 200, depositedOn: '2027-01-12' });
    expect((await repo.listWeeks(ctx, c.id))[1].skipped).toBe(false);
  });

  it('mode libre : montant prévu modifiable, interdit ailleurs', async () => {
    const ctx = await freshContext();
    const free = await repo.createChallenge(ctx, { ...classic, type: 'free', targetCents: 100_000 });
    await repo.setWeekPlanned(ctx, free.id, 3, 4_000);
    expect((await repo.listWeeks(ctx, free.id))[2].plannedCents).toBe(4_000);
    const cl = await repo.createChallenge(ctx, classic);
    await expect(repo.setWeekPlanned(ctx, cl.id, 3, 4_000)).rejects.toThrow(/mode libre/);
  });

  it('objectif personnalisé : la somme des semaines vaut la cible', async () => {
    const ctx = await freshContext();
    const c = await repo.createChallenge(ctx, {
      ...classic, type: 'custom', targetCents: 250_050, weekCount: 30, strategy: 'increasing',
    });
    const weeks = await repo.listWeeks(ctx, c.id);
    expect(weeks.reduce((s, w) => s + (w.plannedCents ?? 0), 0)).toBe(250_050);
  });

  it('suppression : le challenge disparaît des listes', async () => {
    const ctx = await freshContext();
    const c = await repo.createChallenge(ctx, classic);
    await repo.addDeposit(ctx, { challengeId: c.id, weekIndex: 1, amountCents: 100, depositedOn: '2027-01-05' });
    await repo.deleteChallenge(ctx, c.id);
    expect(await repo.listChallenges(ctx)).toHaveLength(0);
    expect(await repo.getChallenge(ctx, c.id)).toBeNull();
    expect(await repo.listDeposits(ctx)).toHaveLength(0);
  });

  it('refuse un challenge invalide', async () => {
    const ctx = await freshContext();
    await expect(repo.createChallenge(ctx, { ...classic, name: '  ' })).rejects.toThrow();
    await expect(repo.createChallenge(ctx, { ...classic, startDate: '2027-02-30' })).rejects.toThrow();
    await expect(repo.createChallenge(ctx, { ...classic, type: 'custom', strategy: null, targetCents: 1000 })).rejects.toThrow();
  });
});

describe('préférences', () => {
  it('retombe sur la valeur par défaut si la donnée est corrompue', async () => {
    const ctx = await freshContext();
    expect(await repo.getPreference(ctx, 'x', z.number(), 7)).toBe(7);
    await repo.setPreference(ctx, 'x', 42);
    expect(await repo.getPreference(ctx, 'x', z.number(), 7)).toBe(42);
    await ctx.db.runAsync("UPDATE preferences SET value = '{pas du json' WHERE key = 'x'", []);
    expect(await repo.getPreference(ctx, 'x', z.number(), 7)).toBe(7);
  });
});

describe('persistance', () => {
  it('retrouve les données après fermeture et réouverture', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cap52-'));
    const file = join(dir, 'cap52.db');
    try {
      const db1 = openNodeDb(file);
      await migrate(db1);
      const ctx1 = testContext(db1);
      const c = await repo.createChallenge(ctx1, classic);
      await repo.addDeposit(ctx1, { challengeId: c.id, weekIndex: 1, amountCents: 100, depositedOn: '2027-01-05' });
      await repo.setPreference(ctx1, 'active_challenge_id', c.id);
      db1.close();

      const db2 = openNodeDb(file);
      await migrate(db2);
      const ctx2 = testContext(db2);
      expect((await repo.listChallenges(ctx2)).map((x) => x.id)).toEqual([c.id]);
      expect((await repo.listDeposits(ctx2, c.id))[0].amountCents).toBe(100);
      expect(await repo.getPreference(ctx2, 'active_challenge_id', z.string(), '')).toBe(c.id);
      const exported = await repo.exportAllData(ctx2);
      expect(exported.challenges).toHaveLength(1);
      expect(exported.weeks).toHaveLength(52);
      await repo.wipeAllData(ctx2);
      expect(await repo.listChallenges(ctx2)).toHaveLength(0);
      db2.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('annule la transaction en cas d’erreur', async () => {
    const ctx = await freshContext();
    await expect(
      ctx.db.withTransactionAsync(async () => {
        await ctx.db.runAsync("INSERT INTO preferences (key, value, updated_at) VALUES ('t', '1', 'x')", []);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await ctx.db.getFirstAsync('SELECT * FROM preferences WHERE key = ?', ['t'])).toBeNull();
  });
});
