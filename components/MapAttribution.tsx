import { Linking, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './ui';
import { ONEMAP_URL } from '../lib/constants';
import { radius, space, useTheme } from '../lib/theme';
import { useT } from '../lib/store';

/**
 * OneMap's Terms of Use require the OneMap logo and attribution on any map using their tiles.
 * MapLibre's native attribution button shows text only — it cannot render the logo — so this
 * overlay is the compliance widget. It replaces the native button (`attribution={false}` on Map).
 */
export default function MapAttribution() {
  const theme = useTheme();
  const t = useT();

  return (
    <Pressable
      onPress={() => void Linking.openURL(ONEMAP_URL)}
      accessibilityRole="link"
      accessibilityLabel={t('mapAttribution')}
      testID="map-attribution"
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Image source={require('../assets/onemap-logo.png')} style={styles.logo} />
      <Text variant="footnote" tone="muted" numberOfLines={1}>
        {t('mapAttribution')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 20,
    height: 20,
  },
});
