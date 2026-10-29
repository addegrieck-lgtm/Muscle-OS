import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { OptionCard } from '../components/controls';
import { Icon } from '../components/Icon';
import { Card, Screen } from '../components/layout';
import { NotConfiguredState } from '../components/states';
import { APP_CONFIG } from '../config/app';
import { useSubscription } from '../features/subscriptions/SubscriptionProvider';
import { locale, strings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { SPACING } from '../theme/themes';
import { track } from '../services/analytics';
import { haptics } from '../utils/haptics';

const t = strings.premium;

export default function Premium() {
  const sub = useSubscription();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    track({ name: 'premium_viewed' });
  }, []);

  const offers = sub.offers.filter((o) => o.period !== 'other');
  const chosen = selected ?? offers.find((o) => o.period === 'annual')?.id ?? offers[0]?.id ?? null;

  const buy = async () => {
    if (!chosen) return;
    setBusy('buy');
    try {
      if ((await sub.purchase(chosen)) === 'purchased') {
        haptics.success();
        track({ name: 'subscription_started', period: offers.find((o) => o.id === chosen)?.period ?? 'other' });
      }
    } catch {
      Alert.alert(t.purchaseFailed);
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      Alert.alert((await sub.restore()) ? t.restored : t.nothingToRestore);
    } catch {
      Alert.alert(strings.common.error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <AppText variant="display">{t.title}</AppText>
      <AppText muted>{t.pitch}</AppText>

      <Card>
        {t.features.map((f) => (
          <View key={f} style={styles.feature}>
            <Icon name="check" size={18} color={colors.accent} strokeWidth={2.4} />
            <AppText style={styles.flex}>{f}</AppText>
          </View>
        ))}
      </Card>

      {sub.isPremium ? (
        <Card highlight>
          <AppText variant="heading">{sub.source === 'demo' ? t.activeDemo : t.active}</AppText>
          {sub.expiresAt && (
            <AppText variant="caption" muted>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(sub.expiresAt))}
            </AppText>
          )}
        </Card>
      ) : sub.status === 'not_configured' ? (
        <NotConfiguredState title={t.notConfiguredTitle} body={t.notConfiguredBody} />
      ) : sub.status === 'error' ? (
        <Card>
          <AppText muted>{t.loadFailed}</AppText>
          <Button label={strings.common.retry} variant="secondary" compact onPress={() => void sub.reloadOffers()} />
        </Card>
      ) : (
        <>
          {offers.map((o) => (
            <OptionCard
              key={o.id}
              title={o.period === 'annual' ? t.annual : t.monthly}
              selected={chosen === o.id}
              onPress={() => setSelected(o.id)}
              trailing={o.priceString}
            />
          ))}
          <Button label={t.subscribe} onPress={buy} loading={busy === 'buy'} disabled={!chosen || busy !== null} />
        </>
      )}

      {sub.status !== 'not_configured' && (
        <Button label={t.restore} variant="ghost" compact onPress={restore} loading={busy === 'restore'} disabled={busy !== null} />
      )}

      <AppText variant="caption" muted>
        {t.legal}
      </AppText>
      <View style={styles.links}>
        {APP_CONFIG.termsUrl !== '' && (
          <Button label="Conditions" variant="ghost" compact onPress={() => Linking.openURL(APP_CONFIG.termsUrl)} />
        )}
        {APP_CONFIG.privacyPolicyUrl !== '' && (
          <Button label={strings.privacy.title} variant="ghost" compact onPress={() => Linking.openURL(APP_CONFIG.privacyPolicyUrl)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  links: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm },
});
