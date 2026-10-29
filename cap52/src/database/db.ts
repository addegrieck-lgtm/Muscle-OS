/**
 * Sous-ensemble de l'API expo-sqlite utilisé par l'application.
 * Les dépôts ne dépendent que de cette interface, ce qui permet de les tester sous Node
 * (adaptateur node:sqlite dans tests/) avec exactement les mêmes requêtes SQL.
 */
export type BindValue = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: BindValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params: BindValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: BindValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Dépendances injectées : horloge et générateur d'identifiants. */
export interface DbContext {
  db: Db;
  now: () => Date;
  newId: () => string;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
