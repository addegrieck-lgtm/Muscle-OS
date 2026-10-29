import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Cents } from '../domain/money';
import type { WeekView } from '../domain/progress';
import type { WeekState } from '../domain/types';
import { strings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACING, type ThemeColors } from '../theme/themes';
import { haptics } from '../utils/haptics';
import { AppText } from './AppText';
import { Icon } from './Icon';

const GAP = 6;
const MIN_CELL = 42; // zone tactile proche des 44 pt recommandés, gap compris

function cellStyle(state: WeekState, c: ThemeColors) {
  switch (state) {
    case 'completed':
      return { bg: c.accent, fg: c.onAccent, border: c.accent, dashed: false };
    case 'partial':
      return { bg: c.accentSoft, fg: c.text, border: c.partial, dashed: false };
    case 'skipped':
      return { bg: 'transparent', fg: c.skipped, border: c.skipped, dashed: true };
    case 'late':
      return { bg: c.surface, fg: c.text, border: c.late, dashed: false };
    case 'current':
      return { bg: c.surfaceAlt, fg: c.text, border: c.accent, dashed: false };
    case 'upcoming':
      return { bg: c.surface, fg: c.textMuted, border: c.border, dashed: false };
  }
}

const Cell = memo(function Cell({
  week,
  size,
  formatAmount,
  onPress,
}: {
  week: WeekView;
  size: number;
  formatAmount: (c: Cents) => string;
  onPress: (index: number) => void;
}) {
  const { colors } = useTheme();
  const s = cellStyle(week.state, colors);
  const amount = week.plannedCents ?? (week.depositedCents > 0 ? week.depositedCents : null);
  const amountLabel = amount === null ? strings.grid.noAmount : formatAmount(amount);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.grid.a11yCell(week.index, amountLabel, strings.weekStates[week.state])}
      onPress={() => {
        haptics.tap();
        onPress(week.index);
      }}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size * 1.12,
          backgroundColor: s.bg,
          borderColor: s.border,
          borderStyle: s.dashed ? 'dashed' : 'solid',
          borderWidth: week.state === 'current' ? 2 : 1,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={s.fg} style={styles.index} maxFontSizeMultiplier={1.2}>
        {week.index}
      </AppText>
      {week.state === 'completed' ? (
        <Icon name="check" size={size * 0.34} color={s.fg} strokeWidth={2.4} />
      ) : (
        <AppText variant="caption" color={s.fg} numeric numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {amount === null ? '·' : amountLabel}
        </AppText>
      )}
      {week.state === 'late' && <View style={[styles.dot, { backgroundColor: colors.late }]} />}
    </Pressable>
  );
});

/** Grille des semaines : le nombre de colonnes s'adapte à la largeur disponible. */
export function WeekGrid({
  weeks,
  formatAmount,
  onPressWeek,
}: {
  weeks: WeekView[];
  formatAmount: (c: Cents) => string;
  onPressWeek: (index: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const columns = Math.max(4, Math.min(8, Math.floor((width + GAP) / (MIN_CELL + GAP))));
  const size = width > 0 ? Math.floor((width - GAP * (columns - 1)) / columns) : 0;
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {size > 0 && weeks.map((w) => <Cell key={w.index} week={w} size={size} formatAmount={formatAmount} onPress={onPressWeek} />)}
    </View>
  );
}

export function GridLegend() {
  const { colors } = useTheme();
  const items: WeekState[] = ['completed', 'partial', 'current', 'late', 'skipped', 'upcoming'];
  return (
    <View style={styles.legend} accessibilityLabel={strings.grid.legend}>
      {items.map((state) => {
        const s = cellStyle(state, colors);
        return (
          <View key={state} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: s.bg, borderColor: s.border, borderStyle: s.dashed ? 'dashed' : 'solid' },
              ]}
            />
            <AppText variant="caption" muted>
              {strings.weekStates[state]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  index: { position: 'absolute', top: 3, left: 6, fontSize: 10, lineHeight: 12 },
  dot: { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
});
