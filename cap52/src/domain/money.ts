/**
 * Montants en unité monétaire minimale (centimes pour l'euro).
 * Toute la logique métier manipule des entiers : jamais d'addition flottante.
 */
export type Cents = number;

export const MAX_AMOUNT_CENTS: Cents = 100_000_000; // 1 000 000,00 — garde-fou de saisie

export function isValidCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_CENTS;
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Convertit des unités entières (1 € → 100). */
export function unitsToCents(units: number): Cents {
  return Math.round(units * 100);
}

/**
 * Analyse une saisie utilisateur (« 12 », « 12,5 », « 12.50 », « 1 234,56 »).
 * Retourne null si la saisie est invalide, négative ou a plus de deux décimales.
 */
export function parseAmountInput(raw: string): Cents | null {
  const normalized = raw.replace(/[\s  €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [intPart, decPart = ''] = normalized.split('.');
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, '0'));
  return isValidCents(cents) ? cents : null;
}

/** Ratio en points de base (0–10 000), plafonné, sans flottant cumulatif. */
export function ratioBasisPoints(part: Cents, total: Cents): number {
  if (total <= 0) return 0;
  return Math.min(10_000, Math.floor((part * 10_000) / total));
}

export function formatMoney(cents: Cents, currency: string, locale: string): string {
  const hasDecimals = cents % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Montant pour un champ de saisie (« 12,50 » en français). */
export function centsToInput(cents: Cents, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(cents / 100);
}
