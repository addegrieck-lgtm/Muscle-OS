import { Pressable, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FONTS, RADIUS, SPACING } from '../theme/themes';
import { haptics } from '../utils/haptics';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Rangée de pastilles à choix unique. */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string; locked?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              haptics.tap();
              onChange(o.value);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.accent : colors.surface,
                borderColor: selected ? colors.accent : colors.border,
              },
            ]}
          >
            {o.locked && <Icon name="lock" size={14} color={selected ? colors.onAccent : colors.textMuted} />}
            <AppText variant="caption" color={selected ? colors.onAccent : colors.text}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Carte sélectionnable (choix du mode, du thème…). */
export function OptionCard({
  title,
  description,
  selected,
  onPress,
  trailing,
  locked,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  trailing?: string;
  locked?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, description, trailing].filter(Boolean).join('. ')}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[
        styles.option,
        { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border },
      ]}
    >
      <View style={styles.optionText}>
        <View style={styles.optionTitle}>
          <AppText variant="heading">{title}</AppText>
          {locked && <Icon name="lock" size={16} color={colors.textMuted} />}
        </View>
        {description && (
          <AppText variant="caption" muted>
            {description}
          </AppText>
        )}
      </View>
      {trailing && (
        <AppText variant="bodyStrong" numeric>
          {trailing}
        </AppText>
      )}
      <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
      </View>
    </Pressable>
  );
}

export function TextField({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
        {...props}
      />
      {error && (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors, dark } = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.optionText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint && (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          haptics.tap();
          onChange(v);
        }}
        trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
        thumbColor={dark ? colors.text : '#FFFFFF'}
      />
    </View>
  );
}

/** Sélecteur ± pour une valeur entière bornée. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const btn = (delta: number, symbol: string, a11y: string) => {
    const next = Math.min(max, Math.max(min, value + delta));
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        disabled={next === value}
        onPress={() => {
          haptics.tap();
          onChange(next);
        }}
        style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt, opacity: next === value ? 0.4 : 1 }]}
      >
        <AppText variant="heading">{symbol}</AppText>
      </Pressable>
    );
  };
  return (
    <View style={styles.field}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View
        style={styles.stepper}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: format(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))
        }
      >
        {btn(-step, '−', `${label} −`)}
        <AppText variant="heading" numeric style={styles.stepValue}>
          {format(value)}
        </AppText>
        {btn(step, '+', `${label} +`)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  field: { gap: SPACING.xs },
  input: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONTS.semibold,
    fontSize: 17,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, textAlign: 'center' },
});
