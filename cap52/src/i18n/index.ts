import { getLocales } from 'expo-localization';
import { APP_CONFIG } from '../config/app';
import { fr, type Strings } from './fr';

/** Langues disponibles. Ajouter une langue : créer `xx.ts` typé `Strings` et l'enregistrer ici. */
const LANGUAGES: Record<string, Strings> = { fr };

export function resolveLocale(): { strings: Strings; locale: string } {
  const device = getLocales()[0];
  const language = device?.languageCode ?? 'fr';
  const strings = LANGUAGES[language] ?? fr;
  // Formats de nombres : on garde la région de l'appareil si la langue est supportée.
  const locale = LANGUAGES[language] && device?.languageTag ? device.languageTag : APP_CONFIG.defaultLocale;
  return { strings, locale };
}

const resolved = resolveLocale();

export const strings: Strings = resolved.strings;
export const locale: string = resolved.locale;
export type { Strings };
