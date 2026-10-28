import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card, Screen } from '../../components/layout';
import { ProgressBar } from '../../components/ProgressRing';
import { EmptyState } from '../../components/states';
import { GridLegend, WeekGrid } from '../../components/WeekGrid';
import { useAppData } from '../../features/data/AppDataProvider';
import { useFormat } from '../../features/data/useFormat';
import { strings } from '../../i18n';
import { SPACING } from '../../theme/themes';

export default function ChallengeScreen() {
  const { active, challenges } = useAppData();
  const { money } = useFormat();

  if (!active) {
    return (
      <Screen>
        <EmptyState
          icon="grid"
          title={strings.home.noChallengeTitle}
          body={strings.home.noChallengeBody}
          actionLabel={strings.home.createChallenge}
          onAction={() => router.push('/challenges/new')}
        />
      </Screen>
    );
  }

  const { challenge, progress } = active;
  const openWeek = (index: number) => router.push({ pathname: '/week/[index]', params: { index } });

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" muted>
            {strings.challengeTypes[challenge.type].title}
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {challenge.name}
          </AppText>
        </View>
        {challenges.length > 0 && (
          <Button label={strings.grid.switch} variant="secondary" compact onPress={() => router.push('/challenges')} />
        )}
      </View>

      <Card>
        <View style={styles.row}>
          <AppText variant="heading" numeric>
            {money(progress.totalSavedCents)}
          </AppText>
          <AppText muted numeric>
            {strings.home.of(money(progress.targetCents))}
          </AppText>
        </View>
        <ProgressBar progressBp={progress.progressBp} />
        <View style={styles.row}>
          <AppText variant="caption" muted>
            {strings.common.percent(progress.progressBp)}
          </AppText>
          <AppText variant="caption" muted>
            {`${progress.completedWeeks}/${challenge.weekCount}`}
          </AppText>
        </View>
      </Card>

      <WeekGrid weeks={progress.weeks} formatAmount={money} onPressWeek={openWeek} />
      <GridLegend />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerText: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
