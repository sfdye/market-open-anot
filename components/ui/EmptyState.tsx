import { View } from 'react-native';
import { space } from '../../lib/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionTitle, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl }}>
      <Icon name={icon} size={44} color="textFaint" />
      <Text variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {!!message && (
        <Text variant="subhead" tone="muted" style={{ textAlign: 'center' }}>
          {message}
        </Text>
      )}
      {!!actionTitle && !!onAction && (
        <Button title={actionTitle} icon="add" onPress={onAction} block={false} />
      )}
    </View>
  );
}
