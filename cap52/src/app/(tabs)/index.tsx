import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Card, Screen } from '../../components/layout';
import { ProgressRing } from '../../components/ProgressRing';
import { EmptyState } from '../../components/states';
import { useAppData } from '../../features/data/AppDataProvider';
import { useFormat } from '../../features/data/useFormat';
import { useReminders } from '../../features/reminders/useReminders';
import { locale, strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { SPACING } from '../../theme/themes';
import { haptics } from '../../utils/haptics';

const t = strings.home;

export default function Home() {
  const { active, addDeposit, today } = useAppData();
  const { money, date } = useFormat();
  const { colors } = useTheme();
  const { next } = useReminders();
  const [busy, setBusy] = useState(false);

  if (!active) {
    return (
      <Screen>
        <AppText variant="title">{strings.common.appName}</AppText>
        <EmptyState
          icon="target"
          title={t.noChallengeTitle}
          body={t.noChallengeBody}
          actionLabel={t.createChallenge}
          onAction={() => router.push('/challenges/new')}
        />
      </Screen>
    );
  }

  const { challenge, progress } = active;
  const week = progress.nextWeek;
  const isCurrentWeek = week?.state === 'current' || (week && week.index === progress.currentWeek);
  const notStarted = progress.currentWeek === 0;
  const finished = progress.currentWeek > challenge.weekCount;

  const quickValidate = async () => {
    if (!week) return;
    // Mode libre sans montant prévu : on ouvre le détail pour saisir le montant.
    if (week.plannedCents === null) {
      router.push({ pathname: '/week/[index]', params: { index: week.index } });
      return;
    }
    setBusy(true);
    try {
      await addDeposit({ challengeId: challenge.id, weekIndex: week.index, amountCents: week.missingCents, depositedOn: today });
      haptics.success();
    } finally {
      setBusy(false);
    }
  };

  const nextReminder = next
    ? new Intl.DateTimeFormat(locale, { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(next)
    : t.noReminder;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" muted>
            {t.hello}
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {challenge.name}
          </AppText>
        </View>
        <Button label={t.share} icon="share" variant="secondary" compact onPress={() => router.push('/share')} />
      </View>

      <View style={styles.ringWrap}>
        <ProgressRing
          progressBp={progress.progressBp}
          accessibilityLabel={`${money(progress.totalSavedCents)} ${t.saved}, ${t.of(money(progress.targetCents))}`}
        >
          <AppText variant="amount" numeric adjustsFontSizeToFit numberOfLines={1}>
            {money(progress.totalSavedCents)}
          </AppText>
          <AppText muted>{t.of(money(progress.targetCents))}</AppText>
          <AppText variant="bodyStrong" color={colors.accent} style={styles.percent}>
            {strings.common.percent(progress.progressBp)}
          </AppText>
        </ProgressRing>
      </View>

      {progress.isGoalReached ? (
        <Card highlight>
          <AppText variant="heading" center>
            {t.goalReached}
          </AppText>
        </Card>
      ) : notStarted ? (
        <Card>
          <AppText center>{t.notStarted(date(challenge.startDate))}</AppText>
        </Card>
      ) : week ? (
        <Card>
          <View style={styles.weekHeader}>
            <AppText variant="label" muted>
              {isCurrentWeek ? t.thisWeek : strings.week.title(week.index)}
            </AppText>
            <AppText variant="caption" muted>
              {strings.common.week(week.index)}
            </AppText>
          </View>
          {week.plannedCents !== null && (
            <View style={styles.weekAmounts}>
              <View>
                <AppText variant="caption" muted>
                  {t.planned}
                </AppText>
                <AppText variant="title" numeric>
                  {money(week.plannedCents)}
                </AppText>
              </View>
              {week.depositedCents > 0 && (
                <View>
                  <AppText variant="caption" muted>
                    {t.remaining}
                  </AppText>
                  <AppText variant="title" numeric>
                    {money(week.missingCents)}
                  </AppText>
                </View>
              )}
            </View>
          )}
          <Button
            label={week.plannedCents === null ? t.addDeposit : t.validate(money(week.missingCents))}
            icon={week.plannedCents === null ? 'plus' : 'check'}
            onPress={quickValidate}
            loading={busy}
          />
          <Button
            label={strings.week.title(week.index)}
            variant="ghost"
            compact
            onPress={() => router.push({ pathname: '/week/[index]', params: { index: week.index } })}
          />
        </Card>
      ) : (
        <Card>
          <AppText center>{finished ? t.finished : t.weekDone}</AppText>
        </Card>
      )}

      {progress.lateWeeks > 0 && !progress.isGoalReached && (
        <AppText variant="caption" muted center>
          {t.lateNote(progress.lateWeeks)}
        </AppText>
      )}

      <View style={styles.tiles}>
        <Tile label={t.weeksDone} value={`${progress.completedWeeks}/${challenge.weekCount}`} />
        <Tile label={t.leftToGoal} value={money(progress.remainingCents)} />
      </View>

      <Card>
        <View style={styles.reminderRow}>
          <Icon name="bell" size={20} color={colors.textMuted} />
          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              {t.nextReminder}
            </AppText>
            <AppText variant="bodyStrong">{nextReminder}</AppText>
          </View>
        </View>
      </Card>

      <Button label={t.openGrid} icon="grid" variant="secondary" onPress={() => router.navigate('/challenge')} />
      <AppText variant="caption" muted center>
        {strings.common.declaredNote}
      </AppText>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.tile}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="heading" numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerText: { flex: 1 },
  ringWrap: { alignItems: 'center', paddingVertical: SPACING.sm },
  percent: { marginTop: SPACING.xs },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  weekAmounts: { flexDirection: 'row', gap: SPACING.xxl },
  tiles: { flexDirection: 'row', gap: SPACING.md },
  tile: { flex: 1, gap: SPACING.xs },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
});
