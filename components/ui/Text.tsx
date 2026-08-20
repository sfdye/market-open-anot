import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native';
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

/**
 * Maps each app variant to the UIKit `UIFontTextStyle` ramp of the same name so iOS Dynamic Type
 * scales text through the real accessibility curve — `UIFontMetrics.scaledValueForValue` — rather
 * than the generic `fontSizeMultiplier` RN derives from `UIContentSizeCategory`.
 *
 * The base sizes in `typeScale` are kept; the ramp tells `UIFontMetrics` which text style's curve
 * to apply, and the resulting multiplier replaces the generic one inside the native text layer.
 * Android ignores the prop entirely, so behaviour there is unchanged.
 */
const DYNAMIC_TYPE_RAMP: Record<TypeVariant, NonNullable<RNTextProps['dynamicTypeRamp']>> = {
  display: 'largeTitle',
  title: 'title1',
  headline: 'headline',
  body: 'body',
  bodyStrong: 'headline',
  callout: 'callout',
  subhead: 'subheadline',
  footnote: 'footnote',
  overline: 'footnote',
};

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
}

/**
 * The only Text the app uses, so the type scale and the colour tones are the only options and
 * font scaling is never switched off.
 *
 * On iOS every variant carries a `dynamicTypeRamp`, so the native text layer measures with
 * `UIFontMetrics` and the layout grows to fit — the same curve Apple's own apps use at every
 * accessibility size. `maxFontSizeMultiplier` is left open: capping body copy is what makes
 * an app unusable at large system font sizes.
 */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      dynamicTypeRamp={Platform.OS === 'ios' ? DYNAMIC_TYPE_RAMP[variant] : undefined}
      style={[typeScale[variant], { color: theme.colors[TONE_KEY[tone]] }, style]}
    />
  );
}
