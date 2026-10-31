const whole = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const decimal = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** Formate un montant en centimes : 89000 -> « 890 € », 129050 -> « 1 290,50 € ». */
export function formatPrice(cents: number): string {
  const fmt = cents % 100 === 0 ? whole : decimal;
  return fmt.format(cents / 100).replace(/ /g, " ");
}

/** Convertit une saisie « 890 », « 890,50 » ou « 1 290.5 » en centimes entiers, sans flottant. */
export function parseEuroInput(input: string): number | null {
  const clean = input.replace(/[\s  €]/g, "").replace(",", ".");
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(clean);
  if (!m) return null;
  const euros = Number(m[1]);
  const cents = Number((m[2] ?? "").padEnd(2, "0"));
  return euros * 100 + cents;
}

export function centsToInput(cents: number): string {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  return c === 0 ? String(e) : `${e},${String(c).padStart(2, "0")}`;
}
