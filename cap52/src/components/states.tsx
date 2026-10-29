import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { strings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { SPACING } from '../theme/themes';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Card } from './layout';

export function LoadingState({ label = strings.common.loading }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityLabel={label}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.block}>
      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={28} color={colors.accent} />
      </View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      {body && (
        <AppText muted center>
          {body}
        </AppText>
      )}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} compact />}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="shield"
      title={message ?? strings.common.error}
      body={strings.common.errorDetail}
      actionLabel={onRetry ? strings.common.retry : undefined}
      onAction={onRetry}
    />
  );
}

/** État explicite pour un service externe pas encore configuré : jamais de fausses données. */
export function NotConfiguredState({ title, body }: { title: string; body?: string }) {
  return <EmptyState icon="lock" title={title} body={body} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  block: { alignItems: 'center', paddingVertical: SPACING.xxl },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
