import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { BellIcon } from './icons';
import { colors, radius, scale, spacing, textStyles } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface HeaderProps {
  name: string;
  greeting?: string;
  /** Fallback avatar as an SVG component (used when there's no real photo). */
  Avatar: React.FC<SvgProps>;
  /** The user's real profile photo URL — takes precedence over Avatar. */
  photoUri?: string;
  /** Show the small red unread dot on the bell. */
  hasNotification?: boolean;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
}

/**
 * Top header: circular avatar + greeting + notification bell.
 * Figma: avatar 60x54 (rounded 91px), "Welcome," 12px, name 24px bold,
 * bell in a 50x50 white circle with shadow.
 */
export const Header: React.FC<HeaderProps> = ({
  name,
  greeting = 'Welcome,',
  Avatar,
  photoUri,
  hasNotification = true,
  onAvatarPress,
  onBellPress,
}) => {
  return (
    <View style={styles.row}>
      <Pressable onPress={onAvatarPress} hitSlop={8} style={styles.avatar}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatarImg} />
        ) : (
          <Avatar width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        )}
      </Pressable>

      <View style={styles.textBlock}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <Pressable onPress={onBellPress} hitSlop={8} style={[styles.bell, cardShadow]}>
        <BellIcon size={scale(22)} color={colors.textPrimary} />
        {hasNotification && <View style={styles.badge} />}
      </Pressable>
    </View>
  );
};

const AVATAR = scale(54);
const BELL = scale(50);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.avatar,
    borderWidth: 1,
    borderColor: colors.avatarBorder,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  textBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  greeting: {
    ...textStyles.welcome,
    color: colors.textPrimary,
  },
  name: {
    ...textStyles.name,
    color: colors.textPrimary,
    marginTop: scale(2),
  },
  bell: {
    width: BELL,
    height: BELL,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: scale(12),
    right: scale(13),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: colors.brandRed,
  },
});
