import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../../lib/theme';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A two-or-three-way switch: a selected pill on a track, the way both platforms draw one. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.borderLight }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={option.disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: option.disabled }}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.colors.surface },
              option.disabled && styles.disabled,
            ]}
          >
            <Text
              variant={selected ? 'callout' : 'subhead'}
              tone={selected ? 'default' : 'muted'}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill - 2,
  },
  disabled: { opacity: 0.4 },
});
