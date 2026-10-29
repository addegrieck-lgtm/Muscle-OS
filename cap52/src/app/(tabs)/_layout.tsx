import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { useAppData } from '../../features/data/AppDataProvider';
import { strings } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/themes';

const TAB_ICONS: Record<string, IconName> = { index: 'home', challenge: 'grid', stats: 'chart', settings: 'user' };

export default function TabsLayout() {
  const { prefs } = useAppData();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!prefs.onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        // Hauteur explicite (zone de sécurité incluse) : la hauteur par défaut coupe les libellés en Manrope.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: FONTS.semibold, fontSize: 11, lineHeight: 14, flexShrink: 0 },
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
