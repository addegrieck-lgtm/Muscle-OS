import { useState } from 'react';
import { Alert } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { TextField } from '../components/controls';
import { Card, Screen } from '../components/layout';
import { NotConfiguredState } from '../components/states';
import { useAccount } from '../features/account/AccountProvider';
import { supabaseRemote } from '../features/account/supabaseRemote';
import { syncAll } from '../features/account/syncEngine';
import { useAppData } from '../features/data/AppDataProvider';
import { supabase } from '../services/supabase';
import { strings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

const t = strings.account;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Account() {
  const account = useAccount();
  const { ctx, reload } = useAppData();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!account.configured) {
    return (
      <Screen edges={['bottom']}>
        <AppText muted>{t.localOnly}</AppText>
        <NotConfiguredState title={t.notConfigured} />
      </Screen>
    );
  }

  const guard = async (fn: () => Promise<void>, failure: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  if (account.session) {
    const sync = () =>
      guard(async () => {
        if (!supabase || !account.session) return;
        const changed = await syncAll(ctx, supabaseRemote(supabase), account.session.user.id);
        await reload();
        setMessage(t.synced(changed));
      }, t.syncFailed);

    const confirmDelete = () =>
      Alert.alert(t.deleteAccount, t.deleteAccountConfirm, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.common.delete, style: 'destructive', onPress: () => void guard(account.deleteAccount, strings.common.error) },
      ]);

    return (
      <Screen edges={['bottom']}>
        <Card>
          <AppText variant="heading">{t.signedInAs(account.email ?? '')}</AppText>
          <Button label={t.sync} icon="undo" onPress={sync} loading={busy} />
          {message && <AppText muted accessibilityLiveRegion="polite">{message}</AppText>}
          {error && <AppText color={colors.danger}>{error}</AppText>}
        </Card>
        <Button label={t.signOut} variant="secondary" onPress={() => void guard(account.signOut, strings.common.error)} />
        <Button label={t.deleteAccount} variant="danger" onPress={confirmDelete} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <AppText muted>{t.localOnly}</AppText>
      <Card>
        {step === 'email' ? (
          <>
            <TextField
              label={t.email}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
            />
            <Button
              label={t.sendCode}
              loading={busy}
              onPress={() => {
                if (!EMAIL.test(email.trim())) return setError(t.invalidEmail);
                void guard(async () => {
                  await account.sendCode(email.trim());
                  setStep('code');
                  setMessage(t.codeSent(email.trim()));
                }, strings.common.error);
              }}
            />
          </>
        ) : (
          <>
            {message && <AppText muted>{message}</AppText>}
            <TextField label={t.code} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} error={error} />
            <Button label={t.verify} loading={busy} onPress={() => void guard(() => account.verifyCode(email.trim(), code.trim()), t.authFailed)} />
            <Button label={strings.common.back} variant="ghost" compact onPress={() => setStep('email')} />
          </>
        )}
      </Card>
    </Screen>
  );
}
