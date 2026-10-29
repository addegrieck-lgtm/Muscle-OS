import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Retours haptiques discrets ; silencieux sur le web ou si l'appareil ne les gère pas. */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  tap: () => {
    if (supported) Haptics.selectionAsync().catch(() => undefined);
  },
  success: () => {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning: () => {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
