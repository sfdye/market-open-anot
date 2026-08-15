import { View } from 'react-native';
import { radius, space, useTheme } from '../../lib/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface NoticeProps {
  children: string;
  icon?: IconName;
}

/** The amber strip used for "showing cached data" and other things the user should notice once. */
export function Notice({ children, icon = 'warning' }: NoticeProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.banner,
        borderWidth: 1,
        backgroundColor: theme.colors.noticeBg,
        borderColor: theme.colors.noticeBorder,
      }}
    >
      <Icon name={icon} size={18} color="statusWarn" />
      <Text variant="subhead" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
