import { Linking } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card, Screen } from '../components/layout';
import { APP_CONFIG } from '../config/app';
import { strings } from '../i18n';

export default function Privacy() {
  return (
    <Screen edges={['bottom']}>
      <Card>
        {strings.privacy.body.map((p) => (
          <AppText key={p}>{p}</AppText>
        ))}
      </Card>
      <AppText variant="caption" muted>
        {strings.privacy.exportHint}
      </AppText>
      {APP_CONFIG.privacyPolicyUrl !== '' && (
        <Button label={strings.privacy.title} variant="secondary" onPress={() => Linking.openURL(APP_CONFIG.privacyPolicyUrl)} />
      )}
    </Screen>
  );
}
