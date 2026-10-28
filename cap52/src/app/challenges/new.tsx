import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ChipGroup, OptionCard, Stepper, TextField } from '../../components/controls';
import { CHALLENGE_ICONS, Icon } from '../../components/Icon';
import { Card, Screen } from '../../components/layout';
import { APP_CONFIG } from '../../config/app';
import { addDays, todayLocal } from '../../domain/dates';
import { canCreateChallenge, isChallengeTypeFree } from '../../domain/entitlements';
import { parseAmountInput } from '../../domain/money';
import { DEFAULT_WEEK_COUNT, progressionTotal, requiredWeeklyCents } from '../../domain/plan';
import type { ChallengeType, CustomStrategy } from '../../domain/types';
import { useAppData } from '../../features/data/AppDataProvider';
import { useFormat } from '../../features/data/useFormat';
import { useSubscription } from '../../features/subscriptions/SubscriptionProvider';
import { strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { CHALLENGE_COLORS, SPACING } from '../../theme/themes';
import { track } from '../../services/analytics';
import { haptics } from '../../utils/haptics';

const t = strings.challenges;
const TYPES: ChallengeType[] = ['classic', 'reverse', 'free', 'custom'];
const STRATEGIES: CustomStrategy[] = ['equal', 'increasing', 'decreasing'];

export default function NewChallenge() {
  const { createChallenge, snapshots, active } = useAppData();
  const { isPremium } = useSubscription();
  const { money, date } = useFormat(APP_CONFIG.defaultCurrency);
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<(typeof CHALLENGE_ICONS)[number]>('target');
  const [color, setColor] = useState<string>(CHALLENGE_COLORS[0]);
  const [type, setType] = useState<ChallengeType>('classic');
  const [multiplier, setMultiplier] = useState(1);
  const [target, setTarget] = useState('1000');
  const [weeks, setWeeks] = useState(26);
  const [strategy, setStrategy] = useState<CustomStrategy>('equal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = snapshots.filter((s) => s.challenge.status === 'active').length;
  if (!canCreateChallenge(activeCount, isPremium)) {
    return (
      <Screen edges={['bottom']}>
        <Card highlight>
          <AppText>{t.limitReached(APP_CONFIG.limits.freeActiveChallenges)}</AppText>
          <Button label={strings.premium.unlock} icon="star" onPress={() => router.replace('/premium')} />
        </Card>
      </Screen>
    );
  }

  const targetCents = parseAmountInput(target);
  const weekCount = type === 'custom' ? weeks : DEFAULT_WEEK_COUNT;
  const computedTarget =
    type === 'classic' || type === 'reverse' ? progressionTotal(DEFAULT_WEEK_COUNT, 100 * multiplier) : (targetCents ?? 0);
  const weekly = requiredWeeklyCents(computedTarget, weekCount);
  const currentWeekly = active ? requiredWeeklyCents(active.challenge.targetCents, active.challenge.weekCount) : null;
  const locked = !isChallengeTypeFree(type) && !isPremium;
  const valid = name.trim().length > 0 && computedTarget >= 100 && !locked;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await createChallenge({
        name: name.trim(),
        type,
        currency: APP_CONFIG.defaultCurrency,
        unitCents: 100 * multiplier,
        weekCount,
        targetCents: computedTarget,
        startDate: todayLocal(),
        strategy: type === 'custom' ? strategy : null,
        icon,
        color,
      });
      track({ name: 'challenge_created', mode: type });
      haptics.success();
      router.dismissTo('/');
    } catch {
      setError(strings.common.error);
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <TextField label={t.name} value={name} onChangeText={setName} maxLength={40} placeholder={strings.onboarding.goalNameDefault} />

      <View style={styles.group}>
        <AppText variant="caption" muted>
          {t.icon}
        </AppText>
        <View style={styles.swatches}>
          {CHALLENGE_ICONS.map((i) => (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityLabel={i}
              accessibilityState={{ selected: icon === i }}
              onPress={() => setIcon(i)}
              style={[styles.swatch, { backgroundColor: icon === i ? color : colors.surface, borderColor: icon === i ? color : colors.border }]}
            >
              <Icon name={i} size={22} color={icon === i ? '#102820' : colors.text} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="caption" muted>
          {t.color}
        </AppText>
        <View style={styles.swatches}>
          {CHALLENGE_COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityLabel={c}
              accessibilityState={{ selected: color === c }}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? colors.text : 'transparent' }]}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="caption" muted>
          {t.type}
        </AppText>
        {TYPES.map((ty) => (
          <OptionCard
            key={ty}
            title={strings.challengeTypes[ty].title}
            description={strings.challengeTypes[ty].description}
            selected={type === ty}
            locked={!isChallengeTypeFree(ty) && !isPremium}
            onPress={() => setType(ty)}
          />
        ))}
      </View>

      {locked && (
        <Card highlight>
          <AppText muted>{strings.premium.locked}</AppText>
          <Button label={strings.premium.unlock} icon="star" compact onPress={() => router.push('/premium')} />
        </Card>
      )}

      {(type === 'classic' || type === 'reverse') && (
        <ChipGroup
          accessibilityLabel={strings.onboarding.goalMultiplier}
          options={[1, 2, 5, 10].map((m) => ({ value: m, label: money(100 * m) }))}
          value={multiplier}
          onChange={setMultiplier}
        />
      )}

      {(type === 'free' || type === 'custom') && (
        <TextField
          label={t.target}
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
          error={targetCents === null || targetCents < 100 ? strings.week.invalidAmount : null}
        />
      )}

      {type === 'custom' && !locked && (
        <>
          <Stepper label={t.duration} value={weeks} min={4} max={156} step={1} format={(w) => strings.common.weeks(w)} onChange={setWeeks} />
          <AppText variant="caption" muted>
            {t.endsOn(date(addDays(todayLocal(), weeks * 7 - 1)))}
          </AppText>
          <ChipGroup
            accessibilityLabel={t.strategy}
            options={STRATEGIES.map((s) => ({ value: s, label: strings.strategies[s] }))}
            value={strategy}
            onChange={setStrategy}
          />
        </>
      )}

      <Card highlight>
        <AppText variant="caption" muted>
          {strings.onboarding.summaryTarget}
        </AppText>
        <AppText variant="title" numeric>
          {money(computedTarget)}
        </AppText>
        <AppText variant="caption" muted>
          {t.weekly(money(weekly))}
        </AppText>
        {currentWeekly !== null && weekly > currentWeekly && (
          <AppText variant="caption" color={colors.late}>
            {t.effortHigher(money(weekly))}
          </AppText>
        )}
      </Card>

      {error && <AppText color={colors.danger}>{error}</AppText>}
      <Button label={t.create} onPress={submit} loading={busy} disabled={!valid} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  swatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
