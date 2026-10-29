import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChipGroup, OptionCard, TextField } from '../components/controls';
import { Card, Screen } from '../components/layout';
import { APP_CONFIG } from '../config/app';
import { todayLocal } from '../domain/dates';
import { parseAmountInput } from '../domain/money';
import { DEFAULT_WEEK_COUNT, plannedAmountForWeek, progressionTotal } from '../domain/plan';
import type { ChallengeType } from '../domain/types';
import type { ReminderSettings } from '../domain/validation';
import { useAppData } from '../features/data/AppDataProvider';
import { useFormat } from '../features/data/useFormat';
import { useReminders } from '../features/reminders/useReminders';
import { strings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { CHALLENGE_COLORS, SPACING } from '../theme/themes';
import { track } from '../services/analytics';
import { haptics } from '../utils/haptics';

const TOTAL_STEPS = 5;
const MULTIPLIERS = [1, 2, 5, 10];
const FREE_MODES: ChallengeType[] = ['classic', 'reverse', 'free'];
const t = strings.onboarding;

export default function Onboarding() {
  const { createChallenge, setPref } = useAppData();
  const { money } = useFormat(APP_CONFIG.defaultCurrency);
  const reminders = useReminders();
  const reduceMotion = useReducedMotion();
  const { colors } = useTheme();

  const [step, setStep] = useState(1);
  const [type, setType] = useState<ChallengeType>('classic');
  const [name, setName] = useState(t.goalNameDefault);
  const [multiplier, setMultiplier] = useState(1);
  const [freeTarget, setFreeTarget] = useState('1378');
  const [reminder, setReminder] = useState<ReminderSettings>({ ...reminders.settings, enabled: false });
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitCents = 100 * multiplier;
  const freeTargetCents = parseAmountInput(freeTarget);
  const targetCents = type === 'free' ? (freeTargetCents ?? 0) : progressionTotal(DEFAULT_WEEK_COUNT, unitCents);
  const firstWeek = type === 'classic' || type === 'reverse' ? plannedAmountForWeek(type, 1, DEFAULT_WEEK_COUNT, unitCents) : null;

  const goalValid = name.trim().length > 0 && (type !== 'free' || (freeTargetCents !== null && freeTargetCents >= 100));

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));

  const enableReminder = async () => {
    const applied = await reminders.apply({ ...reminder, enabled: true });
    setReminder(applied);
    if (applied.enabled) next();
    else setReminderMessage(t.reminderDenied);
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await createChallenge({
        name: name.trim(),
        type,
        currency: APP_CONFIG.defaultCurrency,
        unitCents,
        weekCount: DEFAULT_WEEK_COUNT,
        targetCents,
        startDate: todayLocal(),
        strategy: null,
        icon: 'target',
        color: CHALLENGE_COLORS[0],
      });
      await setPref('onboardingDone', true);
      track({ name: 'onboarding_completed', mode: type });
      haptics.success();
      router.replace('/');
    } catch {
      setError(strings.common.error);
      setBusy(false);
    }
  };

  const entering = reduceMotion ? undefined : FadeIn.duration(250);
  const exiting = reduceMotion ? undefined : FadeOut.duration(150);

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.dots} accessibilityLabel={t.step(step, TOTAL_STEPS)}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i < step ? colors.accent : colors.surfaceAlt, width: i + 1 === step ? 24 : 8 }]}
            />
          ))}
        </View>
        {step > 1 && step < TOTAL_STEPS && step !== 2 && (
          <Button label={strings.common.skip} variant="ghost" compact onPress={() => setStep(TOTAL_STEPS)} disabled={!goalValid} />
        )}
      </View>

      <Animated.View key={step} entering={entering} exiting={exiting} style={styles.body}>
        {step === 1 && (
          <>
            <AppText variant="label" muted>
              {APP_CONFIG.name}
            </AppText>
            <AppText variant="display">{t.introTitle}</AppText>
            <AppText muted>{t.introBody}</AppText>
            <Card highlight>
              <AppText variant="heading" center numeric>
                {t.introExample}
              </AppText>
            </Card>
            <AppText variant="caption" muted>
              {strings.common.declaredNote}
            </AppText>
          </>
        )}

        {step === 2 && (
          <>
            <AppText variant="title">{t.modeTitle}</AppText>
            <AppText muted>{t.modeBody}</AppText>
            {FREE_MODES.map((m) => (
              <OptionCard
                key={m}
                title={strings.challengeTypes[m].title}
                description={strings.challengeTypes[m].description}
                selected={type === m}
                onPress={() => setType(m)}
                trailing={m === 'free' ? undefined : money(progressionTotal(DEFAULT_WEEK_COUNT, 100))}
              />
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <AppText variant="title">{t.goalTitle}</AppText>
            <TextField label={t.goalName} value={name} onChangeText={setName} maxLength={40} returnKeyType="done" />
            {type === 'free' ? (
              <TextField
                label={t.goalFreeTarget}
                value={freeTarget}
                onChangeText={setFreeTarget}
                keyboardType="decimal-pad"
                error={freeTargetCents === null || freeTargetCents < 100 ? strings.week.invalidAmount : null}
              />
            ) : (
              <View style={styles.group}>
                <AppText variant="caption" muted>
                  {t.goalMultiplier}
                </AppText>
                <ChipGroup
                  accessibilityLabel={t.goalMultiplier}
                  options={MULTIPLIERS.map((m) => ({ value: m, label: money(100 * m) }))}
                  value={multiplier}
                  onChange={setMultiplier}
                />
                <AppText variant="caption" muted>
                  {t.goalMultiplierHint}
                </AppText>
              </View>
            )}
            <Card highlight>
              <AppText variant="caption" muted>
                {t.summaryTarget}
              </AppText>
              <AppText variant="title" numeric>
                {money(targetCents)}
              </AppText>
            </Card>
          </>
        )}

        {step === 4 && (
          <>
            <AppText variant="title">{t.reminderTitle}</AppText>
            <AppText muted>{t.reminderBody}</AppText>
            <View style={styles.group}>
              <AppText variant="caption" muted>
                {strings.settings.reminderDay}
              </AppText>
              <ChipGroup
                accessibilityLabel={strings.settings.reminderDay}
                options={[2, 3, 4, 5, 6, 7, 1].map((d) => ({ value: d, label: strings.weekdaysShort[d - 1] }))}
                value={reminder.weekday}
                onChange={(weekday) => setReminder((r) => ({ ...r, weekday }))}
              />
            </View>
            <View style={styles.group}>
              <AppText variant="caption" muted>
                {strings.settings.reminderTime}
              </AppText>
              <ChipGroup
                accessibilityLabel={strings.settings.reminderTime}
                options={[8, 12, 18, 20].map((h) => ({ value: h, label: `${h} h` }))}
                value={reminder.hour}
                onChange={(hour) => setReminder((r) => ({ ...r, hour, minute: 0 }))}
              />
            </View>
            {reminderMessage && (
              <AppText variant="caption" color={colors.late} accessibilityLiveRegion="polite">
                {reminderMessage}
              </AppText>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <AppText variant="display">{t.summaryTitle}</AppText>
            <Card>
              <AppText variant="heading">{name.trim()}</AppText>
              <SummaryLine label={t.summaryTarget} value={money(targetCents)} />
              <SummaryLine label={t.summaryWeeks} value={strings.common.weeks(DEFAULT_WEEK_COUNT)} />
              {firstWeek !== null && <SummaryLine label={t.summaryFirst} value={money(firstWeek)} />}
              <SummaryLine label={strings.settings.reminders} value={reminder.enabled ? `${strings.weekdays[reminder.weekday - 1]}, ${reminder.hour} h` : strings.home.noReminder} />
            </Card>
            {error && <AppText color={colors.danger}>{error}</AppText>}
          </>
        )}
      </Animated.View>

      <View style={styles.footer}>
        {step === 4 ? (
          <>
            <Button label={t.reminderEnable} icon="bell" onPress={enableReminder} />
            <Button label={t.reminderLater} variant="ghost" onPress={next} />
          </>
        ) : step === TOTAL_STEPS ? (
          <Button label={t.start} onPress={start} loading={busy} disabled={!goalValid} />
        ) : (
          <Button label={strings.common.continue} onPress={next} disabled={step === 3 && !goalValid} />
        )}
        {step > 1 && <Button label={strings.common.back} variant="ghost" compact onPress={() => setStep((s) => s - 1)} />}
      </View>
    </Screen>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <AppText muted>{label}</AppText>
      <AppText variant="bodyStrong" numeric>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  body: { flex: 1, gap: SPACING.lg, paddingTop: SPACING.lg },
  group: { gap: SPACING.sm },
  footer: { gap: SPACING.sm },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
});
