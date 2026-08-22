import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './ui';
import { Text } from './ui';
import { radius, space, useTheme } from '../lib/theme';

/** A titled group of `ui/Row`s, the shape every native settings screen has. */
export default function SettingsSection({
  title,
  icon,
  footer,
  children,
}: {
  title: string;
  icon?: IconName;
  footer?: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {!!icon && <Icon name={icon} size={16} color="muted" />}
        <Text variant="overline" tone="muted" style={styles.title}>
          {title.toUpperCase()}
        </Text>
      </View>
      <View
        style={[
          styles.group,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {children}
      </View>
      {!!footer && (
        <Text variant="footnote" tone="faint" style={styles.title}>
          {footer}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg },
  title: { flexShrink: 1 },
  group: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
