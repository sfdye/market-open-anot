import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './ui';
import { radius, space, useTheme } from '../lib/theme';

/** A titled group of `ui/Row`s, the shape every native settings screen has. */
export default function SettingsSection({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <Text variant="overline" tone="muted" style={styles.title}>
        {title.toUpperCase()}
      </Text>
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
  title: { paddingHorizontal: space.lg },
  group: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
