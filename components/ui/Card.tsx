import { View, type ViewProps } from 'react-native';
import { radius, space, useTheme } from '../../lib/theme';

export interface CardProps extends ViewProps {
  /** Sits on another card rather than on the screen background. */
  raised?: boolean;
  padded?: boolean;
}

export function Card({ raised = false, padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: raised ? theme.colors.surfaceRaised : theme.colors.surface,
          borderRadius: radius.card,
          padding: padded ? space.lg : 0,
        },
        theme.shadow,
        style,
      ]}
    />
  );
}
