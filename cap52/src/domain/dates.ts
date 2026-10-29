/**
 * Dates calendaires locales au format ISO « AAAA-MM-JJ ».
 * Les semaines du challenge sont des dates civiles : elles ne dépendent pas du fuseau
 * horaire, ce qui évite les décalages d'un jour lors d'un voyage ou d'un changement d'heure.
 */
export type LocalDate = string;

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: string): value is LocalDate {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function toUtcMs(date: LocalDate): number {
  const m = ISO_DATE.exec(date);
  if (!m) throw new Error(`Date invalide : ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Date du jour dans le fuseau de l'appareil. */
export function todayLocal(now: Date = new Date()): LocalDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Nombre de jours de `from` à `to` (négatif si `to` est antérieur). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** 1 = dimanche … 7 = samedi (convention des rappels Expo). */
export function weekdayOf(date: LocalDate): number {
  return new Date(toUtcMs(date)).getUTCDay() + 1;
}

export function toDisplayDate(date: LocalDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(toUtcMs(date)),
  );
}
