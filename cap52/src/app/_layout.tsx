import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorState } from '../components/states';
import { migrate } from '../database/migrations';
import { AccountProvider } from '../features/account/AccountProvider';
import { AppDataProvider, expoDb, useAppData } from '../features/data/AppDataProvider';
import { configureNotificationHandler, syncReminder } from '../features/reminders/reminders';
import { SubscriptionProvider } from '../features/subscriptions/SubscriptionProvider';
import { strings } from '../i18n';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { BRAND, FONTS } from '../theme/themes';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [dbError, setDbError] = useState<Error | null>(null);

  // En cas d'échec de chargement des polices, on continue avec la police système plutôt que de bloquer.
  if (!fontsLoaded && !fontError) return null;

  if (dbError) {
    SplashScreen.hideAsync().catch(() => undefined);
    return (
      <View style={styles.fatal}>
        <Text style={styles.fatalTitle}>{strings.common.error}</Text>
        <Text style={styles.fatalBody}>{dbError.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="cap52.db" onInit={(db) => migrate(expoDb(db)).then(() => undefined)} onError={setDbError}>
        <AppDataProvider>
          <ThemedRoot />
        </AppDataProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function ThemedRoot() {
  const { status, prefs, reload } = useAppData();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  // Au démarrage, on reprogramme le rappel : couvre une réinstallation ou un changement de réglages système.
  const reminderKey = JSON.stringify(prefs.reminder);
  useEffect(() => {
    if (status === 'ready' && prefs.reminder.enabled) syncReminder(prefs.reminder).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reminderKey]);

  return (
    <ThemeProvider themeId={prefs.themeId}>
      <SubscriptionProvider>
        <AccountProvider>
          {status === 'error' ? <FatalData onRetry={reload} /> : status === 'loading' ? null : <Navigator />}
        </AccountProvider>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

function FatalData({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ErrorState onRetry={onRetry} />
    </View>
  );
}

function Navigator() {
  const { colors, dark } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  const header = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: FONTS.bold, color: colors.text },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={header}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="week/[index]" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="share" options={{ presentation: 'modal', title: strings.share.title }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="challenges/index" options={{ title: strings.challenges.title }} />
        <Stack.Screen name="challenges/new" options={{ title: strings.challenges.new }} />
        <Stack.Screen name="account" options={{ title: strings.account.title }} />
        <Stack.Screen name="friends" options={{ title: strings.friends.title }} />
        <Stack.Screen name="coach" options={{ title: strings.coach.title }} />
        <Stack.Screen name="privacy" options={{ title: strings.privacy.title }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 16 },
  fatal: { flex: 1, backgroundColor: BRAND.forest, justifyContent: 'center', padding: 24, gap: 12 },
  fatalTitle: { color: BRAND.offWhite, fontSize: 22, fontWeight: '700' },
  fatalBody: { color: BRAND.grey, fontSize: 15 },
});
