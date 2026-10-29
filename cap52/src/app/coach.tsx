import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { TextField } from '../components/controls';
import { Card, Screen } from '../components/layout';
import { EmptyState, NotConfiguredState } from '../components/states';
import { useAccount } from '../features/account/AccountProvider';
import { askCoach, type CoachError } from '../features/coach/coachService';
import { useAppData } from '../features/data/AppDataProvider';
import { useSubscription } from '../features/subscriptions/SubscriptionProvider';
import { strings } from '../i18n';
import { supabase } from '../services/supabase';
import { useTheme } from '../theme/ThemeProvider';
import { SPACING } from '../theme/themes';

const t = strings.coach;
const ERRORS: Record<CoachError, string> = {
  not_configured: t.notConfigured,
  quota_exceeded: t.quota,
  premium_required: strings.premium.locked,
  unauthorized: t.needAccount,
  unavailable: t.unavailable,
};

interface Exchange {
  question: string;
  reply: string;
}

export default function Coach() {
  const account = useAccount();
  const { isPremium } = useSubscription();
  const { active } = useAppData();
  const { colors } = useTheme();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) return <Screen edges={['bottom']}><NotConfiguredState title={t.notConfigured} /></Screen>;
  if (!account.session) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="message" title={t.needAccount} actionLabel={strings.account.title} onAction={() => router.push('/account')} />
      </Screen>
    );
  }
  if (!isPremium) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="message" title={strings.premium.locked} body={t.intro} actionLabel={strings.premium.unlock} onAction={() => router.push('/premium')} />
      </Screen>
    );
  }
  if (!active) return <Screen edges={['bottom']}><EmptyState icon="target" title={strings.home.noChallengeTitle} /></Screen>;

  const send = async () => {
    const q = question.trim();
    if (!q || !supabase) return;
    setBusy(true);
    setError(null);
    const result = await askCoach(supabase, q, active);
    setBusy(false);
    if ('reply' in result) {
      setHistory((h) => [...h, { question: q, reply: result.reply }]);
      setQuestion('');
    } else {
      setError(ERRORS[result.error]);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <AppText muted>{t.intro}</AppText>
      {history.map((e, i) => (
        <View key={i} style={styles.exchange}>
          <Card style={[styles.bubble, { backgroundColor: colors.surfaceAlt }]}>
            <AppText>{e.question}</AppText>
          </Card>
          <Card highlight>
            <AppText>{e.reply}</AppText>
          </Card>
        </View>
      ))}
      <TextField label={t.title} value={question} onChangeText={setQuestion} placeholder={t.placeholder} maxLength={500} multiline />
      {error && <AppText color={colors.danger} accessibilityLiveRegion="polite">{error}</AppText>}
      <Button label={t.send} icon="message" onPress={send} loading={busy} disabled={question.trim().length === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  exchange: { gap: SPACING.sm },
  bubble: { alignSelf: 'flex-end', maxWidth: '85%' },
});
