import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type Palette, type TypeVariant, typeScale, useTheme } from '../../lib/theme';

type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'danger' | 'onStatus';

const TONE_KEY: Record<Tone, keyof Palette> = {
  default: 'text',
  muted: 'textMuted',
  faint: 'textFaint',
  accent: 'accent',
  danger: 'danger',
  onStatus: 'statusOn',
};

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
}

/**
 * The only Text the app uses, so the type scale and the colour tones are the only options and
 * font scaling is never switched off.
 *
 * `maxFontSizeMultiplier` is left open rather than defaulted: capping body copy is what makes
 * an app unusable at large system font sizes. Only text inside a container that cannot grow —
 * a status pill, a tab label — passes a cap.
 */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color: theme.colors[TONE_KEY[tone]] }, style]}
    />
  );
}
