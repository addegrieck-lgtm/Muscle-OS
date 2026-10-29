import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { BarList, LineChart } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { Card, Divider, Screen, SectionTitle } from '../../components/layout';
import { EmptyState } from '../../components/states';
import { computeAchievements } from '../../domain/achievements';
import { diffDays } from '../../domain/dates';
import { activeDeposits, cumulativeSeries, projectFinalCents, regularityBp, weekStreaks } from '../../domain/progress';
import { useAppData, type ChallengeSnapshot } from '../../features/data/AppDataProvider';
import { useFormat } from '../../features/data/useFormat';
import { useSubscription } from '../../features/subscriptions/SubscriptionProvider';
import { locale, strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { SPACING } from '../../theme/themes';

const t = strings.stats;

export default function Stats() {
  const { active, snapshots } = useAppData();
  const { money, date } = useFormat();
  const { isPremium } = useSubscription();

  if (!active) {
    return (
      <Screen>
        <AppText variant="title">{t.title}</AppText>
        <EmptyState icon="chart" title={strings.home.noChallengeTitle} body={t.noHistory} />
      </Screen>
    );
  }

  const { progress } = active;
  const history = activeDeposits(active.deposits).slice().reverse();

  return (
    <Screen>
      <AppText variant="title">{t.title}</AppText>

      <View style={styles.tiles}>
        <Tile label={t.total} value={money(progress.totalSavedCents)} />
        <Tile label={t.progress} value={strings.common.percent(progress.progressBp)} />
      </View>
      <View style={styles.tiles}>
        <Tile label={t.weeksDone} value={`${progress.completedWeeks}/${active.challenge.weekCount}`} />
        <Tile label={t.average} value={money(progress.averageDepositCents)} />
      </View>

      <SectionTitle>{t.advanced}</SectionTitle>
      {isPremium ? <AdvancedStats snapshot={active} all={snapshots} /> : <LockedCard />}

      <SectionTitle>{t.history}</SectionTitle>
      <Card>
        {history.length === 0 && <AppText muted>{t.noHistory}</AppText>}
        {history.map((d, i) => (
          <View key={d.id}>
            {i > 0 && <Divider />}
            <View style={styles.historyRow}>
              <AppText style={styles.flex}>{strings.common.week(d.weekIndex)}</AppText>
              <AppText variant="caption" muted>
                {date(d.depositedOn)}
              </AppText>
              <AppText variant="bodyStrong" numeric style={styles.amount}>
                {money(d.amountCents)}
              </AppText>
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="caption" muted center>
        {strings.common.declaredNote}
      </AppText>
    </Screen>
  );
}

function AdvancedStats({ snapshot, all }: { snapshot: ChallengeSnapshot; all: ChallengeSnapshot[] }) {
  const { colors } = useTheme();
  const { money } = useFormat();
  const { today } = useAppData();
  const { challenge, progress, deposits } = snapshot;
  const totalDays = challenge.weekCount * 7;

  let plannedRunning = 0;
  const planned = [{ x: 0, y: 0 }].concat(
    progress.weeks.map((w) => ({ x: w.index / challenge.weekCount, y: (plannedRunning += w.plannedCents ?? 0) })),
  );
  const actual = [{ x: 0, y: 0 }].concat(
    cumulativeSeries(deposits).map((p) => ({
      x: Math.min(1, Math.max(0, (diffDays(challenge.startDate, p.date) + 1) / totalDays)),
      y: p.cumulativeCents,
    })),
  );
  const hasPlan = plannedRunning > 0;

  const streaks = weekStreaks(progress.weeks, progress.currentWeek);
  const regularity = regularityBp(progress.weeks, progress.currentWeek);
  const projection = projectFinalCents(progress.totalSavedCents, challenge.startDate, today, challenge.weekCount);

  const byMonth = new Map<string, number>();
  for (const d of activeDeposits(deposits)) {
    const key = d.depositedOn.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + d.amountCents);
  }
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);

  return (
    <>
      <Card>
        <AppText variant="heading">{t.cumulative}</AppText>
        <LineChart
          accessibilityLabel={`${t.cumulative} : ${money(progress.totalSavedCents)}`}
          series={[
            ...(hasPlan ? [{ points: planned, color: colors.textMuted, dashed: true, label: t.plannedLine }] : []),
            { points: actual, color: colors.accent, label: t.actualLine },
          ]}
        />
      </Card>

      <View style={styles.tiles}>
        <Tile label={t.regularity} value={strings.common.percent(regularity)} />
        <Tile label={t.streak} value={strings.common.weeks(streaks.current)} />
      </View>
      <View style={styles.tiles}>
        <Tile label={t.bestStreak} value={strings.common.weeks(streaks.best)} />
        <Tile label={t.projection} value={projection === null ? '—' : money(projection)} />
      </View>
      <AppText variant="caption" muted>
        {projection === null ? t.projectionNone : t.projectionHint}
      </AppText>

      {months.length > 0 && (
        <Card>
          <AppText variant="heading">{t.byMonth}</AppText>
          <BarList items={months.map(([m, v]) => ({ label: monthFormatter.format(new Date(`${m}-01T00:00:00Z`)), value: v, display: money(v) }))} />
        </Card>
      )}

      {all.length > 1 && (
        <Card>
          <AppText variant="heading">{t.compare}</AppText>
          <BarList
            items={all.map((s) => ({
              label: s.challenge.name,
              value: s.progress.progressBp,
              display: `${strings.common.percent(s.progress.progressBp)} · ${money(s.progress.totalSavedCents)}`,
              color: s.challenge.color,
            }))}
          />
        </Card>
      )}

      <Card>
        <AppText variant="heading">{t.badges}</AppText>
        <View style={styles.badges}>
          {computeAchievements(progress).map((a) => (
            <View
              key={a.id}
              style={[styles.badge, { backgroundColor: a.unlocked ? colors.accentSoft : colors.surfaceAlt, opacity: a.unlocked ? 1 : 0.5 }]}
              accessible
              accessibilityLabel={`${strings.achievements[a.id]}${a.unlocked ? '' : ' (verrouillé)'}`}
            >
              <Icon name={a.unlocked ? 'star' : 'lock'} size={16} color={a.unlocked ? colors.accent : colors.textMuted} />
              <AppText variant="caption">{strings.achievements[a.id]}</AppText>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

function LockedCard() {
  return (
    <Card highlight>
      <View style={styles.lockRow}>
        <AppText variant="heading" style={styles.flex}>
          {strings.premium.locked}
        </AppText>
      </View>
      <AppText muted>{t.advancedPitch}</AppText>
      <Button label={strings.premium.unlock} icon="star" compact onPress={() => router.push('/premium')} />
    </Card>
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
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: SPACING.md },
  tile: { flex: 1, gap: SPACING.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 44 },
  amount: { minWidth: 72, textAlign: 'right' },
  lockRow: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 999 },
});
