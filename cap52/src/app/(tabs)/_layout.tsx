import { Redirect, Tabs } from 'expo-router';
import { Icon, type IconName } from '../../components/Icon';
import { useAppData } from '../../features/data/AppDataProvider';
import { strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/themes';

const TAB_ICONS: Record<string, IconName> = { index: 'home', challenge: 'grid', stats: 'chart', settings: 'user' };

export default function TabsLayout() {
  const { prefs } = useAppData();
  const { colors } = useTheme();
  if (!prefs.onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: FONTS.semibold, fontSize: 11 },
        tabBarIcon: ({ color }) => <Icon name={TAB_ICONS[route.name] ?? 'home'} size={24} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: strings.tabs.home }} />
      <Tabs.Screen name="challenge" options={{ title: strings.tabs.challenge }} />
      <Tabs.Screen name="stats" options={{ title: strings.tabs.stats }} />
      <Tabs.Screen name="settings" options={{ title: strings.tabs.settings }} />
    </Tabs>
  );
}
