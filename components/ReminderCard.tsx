import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';
import { useT } from '../lib/store';

export default function ReminderCard({
  busy,
  onEnable,
  onDismiss,
}: {
  busy: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}) {
  const t = useT();

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>🔔</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{t('reminderCardTitle')}</Text>
        <Text style={styles.desc}>{t('reminderCardDesc')}</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.enable, busy && styles.disabled]}
            onPress={onEnable}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.enableText}>
              {busy ? t('reminderEnabling') : t('reminderEnable')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.dismiss, busy && styles.disabled]}
            onPress={onDismiss}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.dismissText}>{t('reminderDismiss')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    margin: 12,
    marginBottom: 0,
    padding: 14,
    backgroundColor: colors.orangePale,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
    borderRadius: radius.card,
  },
  icon: { fontSize: 24, lineHeight: 30 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  desc: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  enable: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.green,
    borderRadius: radius.pill,
  },
  enableText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  dismiss: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  dismissText: { color: colors.textMuted, fontWeight: '500', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
