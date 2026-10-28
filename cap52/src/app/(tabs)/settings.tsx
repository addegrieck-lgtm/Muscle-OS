import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ChipGroup, ToggleRow } from '../../components/controls';
import { Card, Divider, Row, Screen, SectionTitle } from '../../components/layout';
import { APP_CONFIG } from '../../config/app';
import { useAccount } from '../../features/account/AccountProvider';
import { useAppData } from '../../features/data/AppDataProvider';
import { exportDataFile } from '../../features/data/exportData';
import { useReminders } from '../../features/reminders/useReminders';
import { useSubscription } from '../../features/subscriptions/SubscriptionProvider';
import { strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { SPACING, THEME_IDS, THEMES, type ThemeId } from '../../theme/themes';
import { haptics } from '../../utils/haptics';

const t = strings.settings;

export default function Settings() {
  const app = useAppData();
  const { colors } = useTheme();
  const reminders = useReminders();
  const subscription = useSubscription();
  const account = useAccount();
  const [exporting, setExporting] = useState(false);

  const updateReminder = (patch: Partial<typeof reminders.settings>) =>
    reminders.apply({ ...reminders.settings, ...patch }).catch(() => Alert.alert(strings.common.error));

  const chooseTheme = (id: ThemeId) => {
    if (THEMES[id].premium && !subscription.isPremium) {
      router.push('/premium');
      return;
    }
    void app.setPref('themeId', id);
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await exportDataFile(app.ctx);
    } catch {
      Alert.alert(t.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  const confirmWipe = () =>
    Alert.alert(t.wipeConfirmTitle, t.wipeConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          await reminders.apply({ ...reminders.settings, enabled: false });
          await app.wipeAll();
          haptics.warning();
          router.replace('/onboarding');
        },
      },
    ]);

  const premiumLabel =
    subscription.source === 'store' ? strings.premium.active : subscription.source === 'demo' ? strings.premium.activeDemo : strings.premium.unlock;

  return (
    <Screen>
      <AppText variant="title">{t.title}</AppText>

      <Card>
        <Row icon="grid" label={t.challenges} value={String(app.challenges.length)} onPress={() => router.push('/challenges')} />
        <Divider />
        <Row icon="star" label={t.premium} value={premiumLabel} onPress={() => router.push('/premium')} />
      </Card>

      <SectionTitle>{t.reminders}</SectionTitle>
      <Card>
        <ToggleRow label={t.reminderOn} value={reminders.settings.enabled} onChange={(enabled) => updateReminder({ enabled })} />
        {reminders.permission === 'denied' && (
          <>
            <AppText variant="caption" color={colors.late}>
              {t.reminderDenied}
            </AppText>
            <Button label={t.openSystemSettings} variant="secondary" compact onPress={() => Linking.openSettings()} />
          </>
        )}
        {reminders.settings.enabled && (
          <>
            <AppText variant="caption" muted>
              {t.reminderDay}
            </AppText>
            <ChipGroup
              accessibilityLabel={t.reminderDay}
              options={[2, 3, 4, 5, 6, 7, 1].map((d) => ({ value: d, label: strings.weekdaysShort[d - 1] }))}
              value={reminders.settings.weekday}
              onChange={(weekday) => updateReminder({ weekday })}
            />
            <AppText variant="caption" muted>
              {t.reminderTime}
            </AppText>
            <ChipGroup
              accessibilityLabel={t.reminderTime}
              options={[7, 8, 9, 12, 18, 19, 20, 21].map((h) => ({ value: h, label: `${h} h` }))}
              value={reminders.settings.hour}
              onChange={(hour) => updateReminder({ hour, minute: 0 })}
            />
          </>
        )}
      </Card>

      <SectionTitle>{t.theme}</SectionTitle>
      <Card>
        <ChipGroup
          accessibilityLabel={t.theme}
          options={THEME_IDS.map((id) => ({ value: id, label: t.themes[id], locked: THEMES[id].premium && !subscription.isPremium }))}
          value={app.prefs.themeId}
          onChange={chooseTheme}
        />
      </Card>

      <SectionTitle>{t.sharing}</SectionTitle>
      <Card>
        <ToggleRow
          label={strings.share.showAmount}
          hint={strings.share.showAmountHint}
          value={app.prefs.shareShowAmount}
          onChange={(v) => void app.setPref('shareShowAmount', v)}
        />
      </Card>

      <SectionTitle>{t.account}</SectionTitle>
      <Card>
        <Row
          icon="user"
          label={strings.account.title}
          value={account.email ?? undefined}
          onPress={() => router.push('/account')}
        />
        <Divider />
        <Row icon="users" label={strings.friends.title} onPress={() => router.push('/friends')} />
        <Divider />
        <Row icon="message" label={strings.coach.title} onPress={() => router.push('/coach')} />
      </Card>

      <SectionTitle>{t.data}</SectionTitle>
      <Card>
        <Row icon="download" label={exporting ? strings.common.loading : t.export} onPress={exporting ? undefined : doExport} />
        <Divider />
        <Row icon="shield" label={t.privacy} onPress={() => router.push('/privacy')} />
        <Divider />
        <Row icon="message" label={t.feedback} onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent(`${APP_CONFIG.name} — avis`)}`)} />
        <Divider />
        <Row icon="trash" label={t.wipe} danger onPress={confirmWipe} />
      </Card>

      {__DEV__ && (
        <Card>
          <ToggleRow label={t.demoPremium} hint={t.demoPremiumHint} value={app.prefs.demoPremium} onChange={(v) => void app.setPref('demoPremium', v)} />
        </Card>
      )}

      <View style={styles.footer}>
        <AppText variant="caption" muted center>
          {`${APP_CONFIG.name} · ${t.version(Constants.expoConfig?.version ?? '—')}`}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: SPACING.lg },
});
