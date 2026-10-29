import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { TextField, ToggleRow } from '../components/controls';
import { Card, Divider, Screen } from '../components/layout';
import { ProgressBar } from '../components/ProgressRing';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '../components/states';
import { useAccount } from '../features/account/AccountProvider';
import { useAppData } from '../features/data/AppDataProvider';
import { useFormat } from '../features/data/useFormat';
import { friendsService, type FriendBoardRow, type FriendChallenge } from '../features/friends/friendsService';
import { useSubscription } from '../features/subscriptions/SubscriptionProvider';
import { strings } from '../i18n';
import { supabase } from '../services/supabase';
import { useTheme } from '../theme/ThemeProvider';
import { SPACING } from '../theme/themes';

const t = strings.friends;

export default function Friends() {
  const account = useAccount();
  const { isPremium } = useSubscription();
  const { active } = useAppData();
  const { money } = useFormat();
  const { colors } = useTheme();
  const service = useMemo(() => (supabase ? friendsService(supabase) : null), []);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [items, setItems] = useState<FriendChallenge[]>([]);
  const [boards, setBoards] = useState<Record<string, FriendBoardRow[]>>({});
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shareAmount, setShareAmount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!service || !account.session) return;
    setStatus('loading');
    try {
      const list = await service.list();
      const entries = await Promise.all(list.map(async (c) => [c.id, await service.board(c.id)] as const));
      setItems(list);
      setBoards(Object.fromEntries(entries));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [service, account.session]);

  useEffect(() => {
    // Chargement initial depuis un système externe (SQLite / store / serveur) : l'état est mis à jour après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!service) return <Screen edges={['bottom']}><NotConfiguredState title={strings.account.notConfigured} /></Screen>;
  if (!account.session) {
    return (
      <Screen edges={['bottom']}>
        <AppText muted>{t.intro}</AppText>
        <EmptyState icon="users" title={t.needAccount} actionLabel={strings.account.title} onAction={() => router.push('/account')} />
      </Screen>
    );
  }
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <Screen edges={['bottom']}><ErrorState onRetry={load} /></Screen>;

  const run = async (fn: () => Promise<unknown>, failure = t.failed) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const nickOk = nickname.trim().length > 0 && nickname.trim().length <= 24;
  const publish = (id: string) =>
    active &&
    run(() => service.updateProgress(id, active.progress.progressBp, active.progress.totalSavedCents, shareAmount));

  return (
    <Screen edges={['bottom']}>
      <AppText muted>{t.intro}</AppText>

      <Card>
        <TextField label={t.nickname} value={nickname} onChangeText={setNickname} maxLength={24} />
        <ToggleRow label={t.shareAmount} value={shareAmount} onChange={setShareAmount} />
        {error && <AppText color={colors.danger}>{error}</AppText>}
      </Card>

      <Card>
        <AppText variant="heading">{t.create}</AppText>
        {isPremium ? (
          <>
            <TextField label={t.name} value={name} onChangeText={setName} maxLength={40} />
            <Button
              label={t.create}
              icon="plus"
              loading={busy}
              disabled={!nickOk || name.trim().length === 0}
              onPress={() =>
                void run(async () => {
                  const id = await service.create(name.trim(), nickname.trim());
                  if (active) await service.updateProgress(id, active.progress.progressBp, active.progress.totalSavedCents, shareAmount);
                  setName('');
                })
              }
            />
          </>
        ) : (
          <Button label={strings.premium.unlock} icon="star" variant="secondary" onPress={() => router.push('/premium')} />
        )}
        <Divider />
        <AppText variant="heading">{t.join}</AppText>
        <TextField label={t.code} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={8} />
        <Button
          label={t.join}
          variant="secondary"
          loading={busy}
          disabled={!nickOk || code.trim().length !== 8}
          onPress={() =>
            void run(async () => {
              const id = await service.join(code.trim(), nickname.trim());
              if (active) await service.updateProgress(id, active.progress.progressBp, active.progress.totalSavedCents, shareAmount);
              setCode('');
            }, t.invalidCode)
          }
        />
      </Card>

      {items.length === 0 && <EmptyState icon="users" title={t.empty} />}
      {items.map((c) => (
        <Card key={c.id}>
          <View style={styles.row}>
            <AppText variant="heading" style={styles.flex}>
              {c.name}
            </AppText>
            <AppText variant="caption" muted>
              {t.members(c.member_count)}
            </AppText>
          </View>
          {(boards[c.id] ?? []).map((m, i) => (
            <View key={`${m.nickname}-${i}`} style={styles.member}>
              <View style={styles.row}>
                <AppText variant={m.is_me ? 'bodyStrong' : 'body'} style={styles.flex}>
                  {m.nickname}
                </AppText>
                <AppText variant="caption" muted numeric>
                  {`${strings.common.percent(m.progress_bp)}${m.saved_cents !== null ? ` · ${money(m.saved_cents)}` : ''}`}
                </AppText>
              </View>
              <ProgressBar progressBp={m.progress_bp} />
            </View>
          ))}
          {c.invite_code && (
            <Button label={c.invite_code} icon="share" variant="secondary" compact onPress={() => Share.share({ message: t.invite(c.invite_code ?? '') })} />
          )}
          {active && <Button label={strings.account.sync} variant="ghost" compact onPress={() => void publish(c.id)} />}
          <Button
            label={c.is_owner ? t.delete : t.leave}
            variant="danger"
            compact
            onPress={() =>
              Alert.alert(c.is_owner ? t.delete : t.leave, c.name, [
                { text: strings.common.cancel, style: 'cancel' },
                { text: strings.common.confirm, style: 'destructive', onPress: () => void run(() => service.leave(c.id)) },
              ])
            }
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  member: { gap: SPACING.xs },
});
