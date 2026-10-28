/** Système de design : toutes les couleurs de l'application viennent d'ici. */
export const BRAND = {
  forest: '#102820',
  lime: '#D9F99D',
  offWhite: '#F8F8F4',
  grey: '#89918B',
  forestSurface: '#19372D',
} as const;

export type ThemeId = 'forest' | 'sand' | 'night' | 'minimal' | 'bright';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  /** Couleur d'accent (boutons principaux, progression). */
  accent: string;
  /** Texte posé sur l'accent. */
  onAccent: string;
  /** Accent doux pour les fonds de mise en avant. */
  accentSoft: string;
  partial: string;
  late: string;
  danger: string;
  skipped: string;
}

export interface Theme {
  id: ThemeId;
  premium: boolean;
  dark: boolean;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeId, Theme> = {
  forest: {
    id: 'forest',
    premium: false,
    dark: true,
    colors: {
      background: BRAND.forest,
      surface: BRAND.forestSurface,
      surfaceAlt: '#21453A',
      border: '#2C5246',
      text: BRAND.offWhite,
      textMuted: '#A9B3AC',
      accent: BRAND.lime,
      onAccent: BRAND.forest,
      accentSoft: 'rgba(217, 249, 157, 0.14)',
      partial: '#9BCB6B',
      late: '#F2C46D',
      danger: '#FF8A7A',
      skipped: '#5E6E66',
    },
  },
  sand: {
    id: 'sand',
    premium: true,
    dark: false,
    colors: {
      background: '#F3EDE2',
      surface: '#FFFDF8',
      surfaceAlt: '#EAE2D3',
      border: '#DDD3C1',
      text: '#1E2A23',
      textMuted: '#636B65',
      accent: BRAND.forest,
      onAccent: BRAND.lime,
      accentSoft: 'rgba(16, 40, 32, 0.08)',
      partial: '#5E8C4A',
      late: '#A86A12',
      danger: '#B3261E',
      skipped: '#A39C8E',
    },
  },
  night: {
    id: 'night',
    premium: true,
    dark: true,
    colors: {
      background: '#0B0F0E',
      surface: '#151B19',
      surfaceAlt: '#1D2522',
      border: '#28322E',
      text: '#F2F4F1',
      textMuted: '#9AA39D',
      accent: BRAND.lime,
      onAccent: '#0B0F0E',
      accentSoft: 'rgba(217, 249, 157, 0.12)',
      partial: '#8FBF5F',
      late: '#F2C46D',
      danger: '#FF8A7A',
      skipped: '#4B5651',
    },
  },
  minimal: {
    id: 'minimal',
    premium: true,
    dark: false,
    colors: {
      background: BRAND.offWhite,
      surface: '#FFFFFF',
      surfaceAlt: '#EFEFEA',
      border: '#E2E2DC',
      text: BRAND.forest,
      textMuted: '#5F6862',
      accent: BRAND.forest,
      onAccent: BRAND.offWhite,
      accentSoft: 'rgba(16, 40, 32, 0.07)',
      partial: '#4F7A3E',
      late: '#9A5B00',
      danger: '#B3261E',
      skipped: '#B5BAB6',
    },
  },
  bright: {
    id: 'bright',
    premium: true,
    dark: false,
    colors: {
      background: '#EEFCD3',
      surface: '#FFFFFF',
      surfaceAlt: '#E1F5BA',
      border: '#CFE8A0',
      text: BRAND.forest,
      textMuted: '#4E5E55',
      accent: BRAND.forest,
      onAccent: BRAND.lime,
      accentSoft: 'rgba(16, 40, 32, 0.08)',
      partial: '#4F7A3E',
      late: '#8A5200',
      danger: '#B3261E',
      skipped: '#A8B59A',
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export function isThemeId(value: string): value is ThemeId {
  return value in THEMES;
}

/** Couleurs proposées pour personnaliser un challenge (lisibles sur tous les thèmes). */
export const CHALLENGE_COLORS = ['#D9F99D', '#7DD3C0', '#F2C46D', '#F4A6A0', '#A5B4FC', '#E9D5FF'] as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const RADIUS = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

export const FONTS = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;
