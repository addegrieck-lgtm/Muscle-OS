import { useCallback } from 'react';
import { toDisplayDate } from '../../domain/dates';
import { formatMoney, type Cents } from '../../domain/money';
import { locale } from '../../i18n';
import { useAppData } from './AppDataProvider';
import { APP_CONFIG } from '../../config/app';

/** Formatage localisé, dans la devise du challenge actif (euro par défaut). */
export function useFormat(currency?: string) {
  const { active } = useAppData();
  const cur = currency ?? active?.challenge.currency ?? APP_CONFIG.defaultCurrency;
  const money = useCallback((cents: Cents) => formatMoney(cents, cur, locale), [cur]);
  const date = useCallback((d: string) => toDisplayDate(d, locale), []);
  return { money, date, locale, currency: cur };
}
