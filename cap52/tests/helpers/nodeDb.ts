import { DatabaseSync } from 'node:sqlite';
import type { BindValue, Db, DbContext } from '../../src/database/db';

/** Adaptateur node:sqlite qui implémente la même interface que expo-sqlite. */
export function openNodeDb(path = ':memory:'): Db & { close: () => void } {
  const db = new DatabaseSync(path);
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params: BindValue[]) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async getAllAsync<T>(sql: string, params: BindValue[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: BindValue[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}

export function testContext(db: Db, start = '2027-01-04T09:00:00.000Z'): DbContext & { tick: () => void } {
  let time = new Date(start).getTime();
  let counter = 0;
  return {
    db,
    now: () => new Date(time),
    newId: () => `id-${++counter}`,
    tick: () => {
      time += 1000;
    },
  };
}
