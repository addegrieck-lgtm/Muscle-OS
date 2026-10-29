import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ChipGroup, TextField } from '../../components/controls';
import { Icon } from '../../components/Icon';
import { Card, Divider, Screen } from '../../components/layout';
import { EmptyState } from '../../components/states';
import { addDays } from '../../domain/dates';
import { centsToInput, parseAmountInput } from '../../domain/money';
import type { Deposit } from '../../domain/types';
import { useAppData } from '../../features/data/AppDataProvider';
import { useFormat } from '../../features/data/useFormat';
import { locale, strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { SPACING } from '../../theme/themes';
import { haptics } from '../../utils/haptics';

const t = strings.week;

type Mode = { kind: 'idle' } | { kind: 'add' } | { kind: 'edit'; deposit: Deposit } | { kind: 'plan' };

export default function WeekDetail() {
  const params = useLocalSearchParams<{ index: string }>();
  const index = Number(params.index);
  const app = useAppData();
  const { money, date } = useFormat();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(app.today);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const snapshot = app.active;
  const week = snapshot?.progress.weeks.find((w) => w.index === index);
  if (!snapshot || !week) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="grid" title={strings.common.error} actionLabel={strings.common.close} onAction={() => router.back()} />
      </Screen>
    );
  }
  const { challenge } = snapshot;
  const cancelledDeposits = snapshot.deposits.filter((d) => d.weekIndex === index && d.status === 'cancelled');

  const run = async (fn: () => Promise<void>, success = true) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (success) haptics.success();
      setMode({ kind: 'idle' });
    } catch {
      setError(strings.common.error);
    } finally {
      setBusy(false);
    }
  };

  const openForm = (next: Mode, initialCents: number | null) => {
    setAmount(initialCents ? centsToInput(initialCents, locale) : '');
    setDepositDate(next.kind === 'edit' ? next.deposit.depositedOn : app.today);
    setError(null);
    setMode(next);
  };

  const submitForm = () => {
    const cents = parseAmountInput(amount);
    if (cents === null || (cents === 0 && mode.kind !== 'plan')) {
      setError(t.invalidAmount);
      return;
    }
    if (mode.kind === 'add') {
      void run(() => app.addDeposit({ challengeId: challenge.id, weekIndex: index, amountCents: cents, depositedOn: depositDate }));
    } else if (mode.kind === 'edit') {
      void run(() => app.updateDeposit(mode.deposit.id, cents, depositDate));
    } else if (mode.kind === 'plan') {
      void run(() => app.setWeekPlanned(challenge.id, index, cents === 0 ? null : cents), false);
    }
  };

  const confirmUndo = () =>
    Alert.alert(t.undoConfirmTitle, t.undoConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: t.undo, style: 'destructive', onPress: () => void run(() => app.cancelWeek(challenge.id, index), false) },
    ]);

  const confirmRemove = (d: Deposit) =>
    Alert.alert(t.removeConfirm, money(d.amountCents), [
      { text: strings.common.cancel, style: 'cancel' },
      { text: t.remove, style: 'destructive', onPress: () => void run(() => app.cancelDeposit(d.id), false) },
    ]);

  const dateOptions = Array.from(
    new Set([app.today, addDays(app.today, -1), week.startDate, depositDate]),
  ).map((d) => ({
    value: d,
    label: d === app.today ? t.today : d === addDays(app.today, -1) ? t.yesterday : date(d),
  }));

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t.title(index) }} />

      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <AppText variant="title">{t.title(index)}</AppText>
          <AppText variant="caption" muted>
            {t.from(date(week.startDate))}
          </AppText>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <AppText variant="caption">{strings.weekStates[week.state]}</AppText>
        </View>
      </View>

      <Card>
        <View style={styles.amounts}>
          <Amount label={t.planned} value={week.plannedCents === null ? t.noPlan : money(week.plannedCents)} />
          <Amount label={t.deposited} value={money(week.depositedCents)} />
          {week.plannedCents !== null && <Amount label={t.missing} value={money(week.missingCents)} />}
        </View>
      </Card>

      {mode.kind === 'idle' ? (
        <View style={styles.actions}>
          {week.plannedCents !== null && week.missingCents > 0 && (
            <Button
              label={week.depositedCents > 0 ? t.validateRest(money(week.missingCents)) : t.validatePlanned(money(week.missingCents))}
              icon="check"
              loading={busy}
              onPress={() =>
                void run(() =>
                  app.addDeposit({ challengeId: challenge.id, weekIndex: index, amountCents: week.missingCents, depositedOn: app.today }),
                )
              }
            />
          )}
          <Button label={t.addCustom} icon="plus" variant="secondary" onPress={() => openForm({ kind: 'add' }, null)} />
          {challenge.type === 'free' && (
            <Button label={t.setPlanned} icon="target" variant="secondary" onPress={() => openForm({ kind: 'plan' }, week.plannedCents)} />
          )}
        </View>
      ) : (
        <Card>
          <AppText variant="heading">{mode.kind === 'plan' ? t.setPlanned : mode.kind === 'edit' ? t.edit : t.addCustom}</AppText>
          <TextField
            label={t.amount}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
            placeholder="0"
            error={error}
            onSubmitEditing={submitForm}
          />
          {mode.kind !== 'plan' && (
            <View style={styles.group}>
              <AppText variant="caption" muted>
                {t.date}
              </AppText>
              <ChipGroup accessibilityLabel={t.date} options={dateOptions} value={depositDate} onChange={setDepositDate} />
            </View>
          )}
          <Button label={strings.common.save} onPress={submitForm} loading={busy} />
          {mode.kind === 'plan' && week.plannedCents !== null && (
            <Button label={t.clearPlanned} variant="ghost" compact onPress={() => void run(() => app.setWeekPlanned(challenge.id, index, null), false)} />
          )}
          <Button label={strings.common.cancel} variant="ghost" compact onPress={() => setMode({ kind: 'idle' })} />
        </Card>
      )}

      <Card>
        <AppText variant="label" muted>
          {t.deposits}
        </AppText>
        {week.deposits.length === 0 && <AppText muted>{t.noDeposits}</AppText>}
        {week.deposits.map((d, i) => (
          <View key={d.id}>
            {i > 0 && <Divider />}
            <View style={styles.depositRow}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numeric>
                  {money(d.amountCents)}
                </AppText>
                <AppText variant="caption" muted>
                  {date(d.depositedOn)}
                </AppText>
              </View>
              <IconButton icon="edit" label={`${t.edit} ${money(d.amountCents)}`} onPress={() => openForm({ kind: 'edit', deposit: d }, d.amountCents)} />
              <IconButton icon="trash" label={`${t.remove} ${money(d.amountCents)}`} onPress={() => confirmRemove(d)} />
            </View>
          </View>
        ))}
        {cancelledDeposits.map((d) => (
          <AppText key={d.id} variant="caption" muted style={styles.cancelled}>
            {`${money(d.amountCents)} · ${date(d.depositedOn)} · ${t.cancelled}`}
          </AppText>
        ))}
      </Card>

      <View style={styles.actions}>
        {week.depositedCents > 0 && <Button label={t.undo} icon="undo" variant="danger" onPress={confirmUndo} />}
        {week.depositedCents === 0 && (
          <Button
            label={week.state === 'skipped' ? t.unskip : t.skip}
            icon="skip"
            variant="ghost"
            onPress={() => void run(() => app.setWeekSkipped(challenge.id, index, week.state !== 'skipped'), false)}
          />
        )}
      </View>
    </Screen>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="heading" numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: 'edit' | 'trash'; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={styles.iconBtn}>
      <Icon name={icon} size={20} color={icon === 'trash' ? colors.danger : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  badge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 999 },
  amounts: { flexDirection: 'row', gap: SPACING.md },
  actions: { gap: SPACING.sm },
  group: { gap: SPACING.sm },
  depositRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 52 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelled: { textDecorationLine: 'line-through' },
});
