/**
 * @jest-environment node
 */
import { migrate } from '../../src/database/migrations';
import * as repo from '../../src/database/repositories';
import { syncAll, type SyncRemote, type SyncTable } from '../../src/features/account/syncEngine';
import type { NewChallengeInput } from '../../src/domain/validation';
import { openNodeDb, testContext } from '../helpers/nodeDb';

const USER = 'aaaaaaaa-0000-0000-0000-00000000000a';
const input: NewChallengeInput = {
  name: 'Vacances', type: 'classic', currency: 'EUR', unitCents: 100, weekCount: 4, targetCents: 0,
  startDate: '2027-01-04', strategy: null, icon: 'plane', color: '#D9F99D',
};

/** Serveur simulé : stocke les lignes comme PostgREST (booléens, horodatages +00:00). */
function fakeRemote(): SyncRemote & { tables: Record<SyncTable, Map<string, Record<string, unknown>>> } {
  const tables = { challenges: new Map(), challenge_weeks: new Map(), deposits: new Map() } as Record<
    SyncTable,
    Map<string, Record<string, unknown>>
  >;
  const key = (t: SyncTable, r: Record<string, unknown>) => (t === 'challenge_weeks' ? `${r.challenge_id}:${r.week_index}` : String(r.id));
  return {
    tables,
    async fetch(t) {
      return [...tables[t].values()].map((r) => ({ ...r }));
    },
    async upsert(t, rows) {
      for (const r of rows) {
        expect(r.owner_id).toBe(USER);
        const stored = { ...r, updated_at: String(r.updated_at).replace('.000Z', '+00:00') };
        tables[t].set(key(t, r), stored);
      }
    },
  };
}

async function device(start: string) {
  const db = openNodeDb();
  await migrate(db);
  return testContext(db, start);
}

describe('synchronisation', () => {
  it('pousse les données locales puis les retrouve sur un second appareil', async () => {
    const remote = fakeRemote();
    const phone = await device('2027-01-04T09:00:00.000Z');
    const c = await repo.createChallenge(phone, input);
    await repo.addDeposit(phone, { challengeId: c.id, weekIndex: 1, amountCents: 100, depositedOn: '2027-01-05' });

    expect(await syncAll(phone, remote, USER)).toBe(1 + 4 + 1);
    expect(remote.tables.challenge_weeks.get(`${c.id}:1`)?.skipped).toBe(false);
    expect((await repo.getChallenge(phone, c.id))?.ownerId).toBe(USER);

    const tablet = await device('2027-01-04T10:00:00.000Z');
    await syncAll(tablet, remote, USER);
    expect((await repo.listChallenges(tablet)).map((x) => x.name)).toEqual(['Vacances']);
    expect((await repo.listDeposits(tablet, c.id))[0].amountCents).toBe(100);

    // Deuxième passage sans changement : rien à faire.
    expect(await syncAll(tablet, remote, USER)).toBe(0);
  });

  it('garde la modification la plus récente et ne perd jamais un versement', async () => {
    const remote = fakeRemote();
    const phone = await device('2027-01-04T09:00:00.000Z');
    const c = await repo.createChallenge(phone, input);
    const d = await repo.addDeposit(phone, { challengeId: c.id, weekIndex: 1, amountCents: 100, depositedOn: '2027-01-05' });
    await syncAll(phone, remote, USER);

    const tablet = await device('2027-01-04T09:30:00.000Z');
    await syncAll(tablet, remote, USER);

    // La tablette annule le versement plus tard que le téléphone ne le modifie.
    phone.tick();
    await repo.updateDeposit(phone, d.id, { amountCents: 150, depositedOn: '2027-01-05' }); // 09:00:01
    await repo.cancelDeposit(tablet, d.id); // 09:30:00
    await repo.addDeposit(phone, { challengeId: c.id, weekIndex: 2, amountCents: 200, depositedOn: '2027-01-12' });

    await syncAll(phone, remote, USER);
    await syncAll(tablet, remote, USER);
    await syncAll(phone, remote, USER);

    for (const ctx of [phone, tablet]) {
      const deposits = await repo.listDeposits(ctx, c.id);
      expect(deposits).toHaveLength(2);
      expect(deposits.find((x) => x.id === d.id)?.status).toBe('cancelled');
      expect(deposits.find((x) => x.weekIndex === 2)?.amountCents).toBe(200);
    }
  });

  it('propage une suppression logique de challenge', async () => {
    const remote = fakeRemote();
    const phone = await device('2027-01-04T09:00:00.000Z');
    const c = await repo.createChallenge(phone, input);
    await syncAll(phone, remote, USER);
    const tablet = await device('2027-01-04T09:30:00.000Z');
    await syncAll(tablet, remote, USER);

    phone.tick();
    await repo.deleteChallenge(tablet, c.id);
    await syncAll(tablet, remote, USER);
    await syncAll(phone, remote, USER);
    expect(await repo.listChallenges(phone)).toHaveLength(0);
  });
});
