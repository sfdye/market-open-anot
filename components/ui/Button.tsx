import { Pressable, View, type PressableProps } from 'react-native';
import { HIT_SIZE, radius, space, useTheme } from '../../lib/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'destructive' | 'plain';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  icon?: IconName;
  /** Fill the available width. Default for primary, off for the rest. */
  block?: boolean;
}

export function Button({ title, variant = 'primary', icon, block, ...rest }: ButtonProps) {
  const theme = useTheme();
  const filled = variant === 'primary';
  const tone = variant === 'destructive' ? 'danger' : filled ? 'onStatus' : 'accent';
  const color = variant === 'destructive' ? theme.colors.danger : theme.colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      // No opacity animation: a Pressable that dims on touch is the native affordance, and
      // it costs nothing at this size.
      style={({ pressed }) => ({
        minHeight: HIT_SIZE,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: (block ?? filled) ? 'stretch' : 'flex-start',
        backgroundColor: filled ? theme.colors.accent : 'transparent',
        borderWidth: variant === 'plain' ? 0 : 1,
        borderColor: filled ? theme.colors.accent : color,
        opacity: pressed ? 0.6 : 1,
      })}
      {...rest}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {!!icon && <Icon name={icon} size={19} color={filled ? theme.colors.statusOn : color} />}
        <Text variant="callout" tone={tone}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
