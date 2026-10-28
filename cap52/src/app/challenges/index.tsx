import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Icon, isIconName } from '../../components/Icon';
import { Card, Screen } from '../../components/layout';
import { ProgressBar } from '../../components/ProgressRing';
import { canCreateChallenge } from '../../domain/entitlements';
import { useAppData } from '../../features/data/AppDataProvider';
import { useFormat } from '../../features/data/useFormat';
import { useSubscription } from '../../features/subscriptions/SubscriptionProvider';
import { APP_CONFIG } from '../../config/app';
import { strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { SPACING } from '../../theme/themes';

const t = strings.challenges;

export default function Challenges() {
  const { snapshots, active, setPref, deleteChallenge } = useAppData();
  const { isPremium } = useSubscription();
  const { money } = useFormat();
  const { colors } = useTheme();
  const activeCount = snapshots.filter((s) => s.challenge.status === 'active').length;
  const canCreate = canCreateChallenge(activeCount, isPremium);

  const confirmDelete = (id: string, name: string) =>
    Alert.alert(t.deleteConfirmTitle, `${name}\n\n${t.deleteConfirmBody}`, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.common.delete, style: 'destructive', onPress: () => void deleteChallenge(id) },
    ]);

  return (
    <Screen edges={['bottom']}>
      {snapshots.map(({ challenge, progress }) => {
        const isActive = active?.challenge.id === challenge.id;
        return (
          <Pressable
            key={challenge.id}
            accessibilityRole="button"
            accessibilityLabel={`${challenge.name}, ${strings.common.percent(progress.progressBp)}`}
            onPress={() => {
              void setPref('activeChallengeId', challenge.id);
              router.navigate('/');
            }}
          >
            <Card highlight={isActive}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: challenge.color }]}>
                  <Icon name={isIconName(challenge.icon) ? challenge.icon : 'target'} size={20} color="#102820" />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading" numberOfLines={1}>
                    {challenge.name}
                  </AppText>
                  <AppText variant="caption" muted>
                    {`${strings.challengeTypes[challenge.type].title} · ${money(progress.totalSavedCents)} / ${money(progress.targetCents)}`}
                  </AppText>
                </View>
                {isActive && (
                  <AppText variant="caption" color={colors.accent}>
                    {t.active}
                  </AppText>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.common.delete} ${challenge.name}`}
                  onPress={() => confirmDelete(challenge.id, challenge.name)}
                  hitSlop={8}
                  style={styles.trash}
                >
                  <Icon name="trash" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              <ProgressBar progressBp={progress.progressBp} color={challenge.color} />
            </Card>
          </Pressable>
        );
      })}

      {!canCreate && (
        <Card highlight>
          <AppText muted>{t.limitReached(APP_CONFIG.limits.freeActiveChallenges)}</AppText>
        </Card>
      )}
      <Button
        label={canCreate ? t.new : strings.premium.unlock}
        icon={canCreate ? 'plus' : 'star'}
        onPress={() => router.push(canCreate ? '/challenges/new' : '/premium')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
