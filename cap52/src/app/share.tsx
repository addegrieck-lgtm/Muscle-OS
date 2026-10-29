import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ToggleRow } from '../components/controls';
import { Card, Screen } from '../components/layout';
import { ProgressBar } from '../components/ProgressRing';
import { EmptyState } from '../components/states';
import { APP_CONFIG } from '../config/app';
import { useAppData } from '../features/data/AppDataProvider';
import { useFormat } from '../features/data/useFormat';
import { strings } from '../i18n';
import { BRAND, FONTS, RADIUS, SPACING } from '../theme/themes';
import { track } from '../services/analytics';
import { haptics } from '../utils/haptics';

const t = strings.share;

/**
 * Carte partageable générée à partir des données réelles de l'utilisateur.
 * Elle ne contient ni nom ni e-mail ; le montant peut être masqué.
 * Les couleurs de la carte sont fixes (identité de marque), quel que soit le thème.
 */
export default function Share() {
  const { active, prefs, setPref } = useAppData();
  const { money } = useFormat();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);

  if (!active) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="share" title={strings.home.noChallengeTitle} />
      </Screen>
    );
  }
  const { progress } = active;
  const showAmount = prefs.shareShowAmount;

  const share = async () => {
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t.unavailable);
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t.title, UTI: 'public.png' });
      track({ name: 'share_used' });
      haptics.success();
    } catch {
      Alert.alert(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <AppText style={styles.brand} color={BRAND.lime}>
          {APP_CONFIG.name}
        </AppText>
        <AppText style={styles.headline} color={BRAND.offWhite}>
          {showAmount ? t.headline(money(progress.totalSavedCents)) : t.headlineNoAmount(strings.common.percent(progress.progressBp))}
        </AppText>
        <ProgressBar progressBp={progress.progressBp} color={BRAND.lime} />
        <View style={styles.cardFooter}>
          <AppText variant="caption" color={BRAND.offWhite}>
            {t.weeks(progress.completedWeeks)}
          </AppText>
          <AppText variant="caption" color={BRAND.lime}>
            {strings.common.percent(progress.progressBp)}
          </AppText>
        </View>
        <AppText variant="caption" color={BRAND.grey}>
          {APP_CONFIG.tagline}
        </AppText>
      </View>

      <Card>
        <ToggleRow label={t.showAmount} hint={t.showAmountHint} value={showAmount} onChange={(v) => void setPref('shareShowAmount', v)} />
      </Card>
      <Button label={t.action} icon="share" onPress={share} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.forest,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    gap: SPACING.lg,
    aspectRatio: 4 / 5,
    justifyContent: 'center',
  },
  brand: { fontFamily: FONTS.extrabold, fontSize: 18, letterSpacing: 1.5 },
  headline: { fontFamily: FONTS.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
});
