import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FONTS } from '../theme/themes';

export type TextVariant = 'display' | 'amount' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontFamily: FONTS.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  amount: { fontFamily: FONTS.extrabold, fontSize: 44, lineHeight: 50, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  title: { fontFamily: FONTS.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: FONTS.bold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: FONTS.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: FONTS.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
};

interface Props extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  center?: boolean;
  numeric?: boolean;
}

/** Texte de l'application : la police et les couleurs suivent le thème ; la taille suit les réglages d'accessibilité. */
export function AppText({ variant = 'body', muted, color, center, numeric, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={variant === 'amount' || variant === 'display' ? 1.4 : 2}
      style={[
        VARIANTS[variant],
        { color: color ?? (muted ? colors.textMuted : colors.text) },
        center && styles.center,
        numeric && styles.numeric,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  numeric: { fontVariant: ['tabular-nums'] },
});
