import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from './ui';
import { useT } from '../lib/store';
import { radius, space, useTheme } from '../lib/theme';

/** The one-time prompt at the top of Today, until reminders are on or it is dismissed. */
export default function ReminderPrompt({
  busy,
  onEnable,
  onDismiss,
}: {
  busy: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.noticeBg, borderColor: theme.colors.noticeBorder },
      ]}
    >
      <View style={styles.heading}>
        <Icon name="bell" size={22} color="statusWarn" />
        <Text variant="bodyStrong" style={styles.title}>
          {t('reminderCardTitle')}
        </Text>
      </View>
      <Text variant="subhead" tone="muted">
        {t('reminderCardDesc')}
      </Text>
      <View style={styles.actions}>
        <Button
          title={busy ? t('reminderEnabling') : t('reminderEnable')}
          onPress={onEnable}
          disabled={busy}
          block={false}
        />
        <Button title={t('reminderDismiss')} variant="plain" onPress={onDismiss} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderWidth: 1, borderRadius: radius.card },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
});
