import { addDays, diffDays, isLocalDate, todayLocal, weekdayOf } from '../../src/domain/dates';
import { formatMoney, isValidCents, parseAmountInput, ratioBasisPoints, sumCents } from '../../src/domain/money';

describe('montants', () => {
  it.each([
    ['12', 1_200],
    ['12,5', 1_250],
    ['12.05', 1_205],
    ['1 234,56', 123_456],
    ['0,01', 1],
    ['7 €', 700],
  ])('analyse « %s »', (raw, expected) => {
    expect(parseAmountInput(raw)).toBe(expected);
  });

  it.each(['', '-5', 'abc', '1,234', '12,345', '1e3', '99999999999'])('refuse « %s »', (raw) => {
    expect(parseAmountInput(raw)).toBeNull();
  });

  it('évite les erreurs flottantes', () => {
    // 0,1 + 0,2 en flottant ≠ 0,3 ; en centimes, si.
    expect(sumCents([10, 20])).toBe(30);
    expect(parseAmountInput('0,1')! + parseAmountInput('0,2')!).toBe(parseAmountInput('0,3'));
  });

  it('valide les bornes', () => {
    expect(isValidCents(0)).toBe(true);
    expect(isValidCents(-1)).toBe(false);
    expect(isValidCents(1.5)).toBe(false);
    expect(isValidCents(Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('calcule un ratio plafonné', () => {
    expect(ratioBasisPoints(0, 0)).toBe(0);
    expect(ratioBasisPoints(68_900, 137_800)).toBe(5_000);
    expect(ratioBasisPoints(200_000, 137_800)).toBe(10_000);
  });

  it('formate en euros', () => {
    expect(formatMoney(137_800, 'EUR', 'fr-FR').replace(/\s/g, ' ')).toBe('1 378 €');
    expect(formatMoney(1_250, 'EUR', 'fr-FR').replace(/\s/g, ' ')).toBe('12,50 €');
  });
});

describe('dates', () => {
  it('valide le format', () => {
    expect(isLocalDate('2027-02-28')).toBe(true);
    expect(isLocalDate('2027-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('27-1-1')).toBe(false);
  });

  it('calcule les écarts et ajouts', () => {
    expect(addDays('2027-12-30', 3)).toBe('2028-01-02');
    expect(diffDays('2027-01-01', '2028-01-01')).toBe(365);
    expect(diffDays('2027-01-10', '2027-01-01')).toBe(-9);
  });

  it('numérote les jours comme les rappels Expo (1 = dimanche)', () => {
    expect(weekdayOf('2027-01-03')).toBe(1); // dimanche
    expect(weekdayOf('2027-01-04')).toBe(2); // lundi
  });

  it('prend la date locale de l’appareil', () => {
    expect(todayLocal(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
  });
});
