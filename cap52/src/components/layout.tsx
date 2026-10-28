import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACING } from '../theme/themes';
import { haptics } from '../utils/haptics';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: highlight ? colors.accentSoft : colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="label" muted style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </AppText>
  );
}

/** Ligne de réglage cliquable (navigation ou action). */
export function Row({
  label,
  value,
  icon,
  onPress,
  danger,
  trailing,
}: {
  label: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.text;
  const content = (
    <View style={styles.row}>
      {icon && <Icon name={icon} size={20} color={color} />}
      <AppText variant="bodyStrong" color={color} style={styles.rowLabel}>
        {label}
      </AppText>
      {value !== undefined && (
        <AppText variant="caption" muted>
          {value}
        </AppText>
      )}
      {trailing}
      {onPress && !trailing && <Icon name="chevronRight" size={18} color={colors.textMuted} />}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  sectionTitle: { marginTop: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
  rowLabel: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
});
