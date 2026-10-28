import type { LocalDate } from './dates';
import type { Cents } from './money';

/**
 * classic : 1, 2, 3 … 52 unités · reverse : 52 … 1 · free : montants libres ·
 * custom : montant cible réparti sur une durée (premium).
 */
export type ChallengeType = 'classic' | 'reverse' | 'free' | 'custom';
export type CustomStrategy = 'equal' | 'increasing' | 'decreasing';
export type ChallengeStatus = 'active' | 'completed' | 'archived';

export interface Challenge {
  id: string;
  ownerId: string | null; // null tant que l'utilisateur n'a pas de compte
  name: string;
  type: ChallengeType;
  currency: string;
  /** Objectif. Pour classic/reverse il est dérivé du plan, pour free/custom il est choisi. */
  targetCents: Cents;
  /** Unité de progression des modes classique et inversé (100 = 1 €). */
  unitCents: Cents;
  weekCount: number;
  startDate: LocalDate;
  strategy: CustomStrategy | null;
  icon: string;
  color: string;
  status: ChallengeStatus;
  createdAt: string;
  updatedAt: string;
}

/** État explicite d'une semaine : distinct des versements déclarés. */
export interface ChallengeWeek {
  challengeId: string;
  index: number; // 1..weekCount
  plannedCents: Cents | null; // null : mode libre sans montant prévu
  skipped: boolean;
  updatedAt: string;
}

export type DepositStatus = 'active' | 'cancelled';

/** Versement déclaré par l'utilisateur (l'application ne détient ni ne vérifie l'argent). */
export interface Deposit {
  id: string;
  challengeId: string;
  weekIndex: number;
  amountCents: Cents;
  depositedOn: LocalDate;
  status: DepositStatus;
  createdAt: string;
  updatedAt: string;
}

export type WeekState = 'completed' | 'partial' | 'skipped' | 'late' | 'current' | 'upcoming';
