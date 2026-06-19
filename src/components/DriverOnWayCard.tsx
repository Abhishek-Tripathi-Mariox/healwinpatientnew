import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { ClockIcon, ExternalLinkIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface DriverOnWayCardProps {
  eta: string; // e.g. "23 min"
  /** Mini map preview SVG. */
  Map: React.FC<SvgProps>;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Driver is on the way" card shown on Home after a booking (Figma 5:672):
 * title + ETA + a green time pill, with a mini map preview that opens tracking.
 */
export const DriverOnWayCard: React.FC<DriverOnWayCardProps> = ({ eta, Map, onPress, style }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, cardShadow, pressed && styles.pressed, style]}
  >
    <View style={styles.left}>
      <Text style={styles.title}>Driver is on the way</Text>
      <Text style={styles.sub}>Estimated Time of Arrival</Text>
      <View style={styles.pill}>
        <ClockIcon size={scale(15)} color={colors.textWhite} />
        <Text style={styles.pillText}>{eta}</Text>
      </View>
    </View>

    <View style={styles.mapWrap}>
      <Map width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      <View style={styles.linkBadge}>
        <ExternalLinkIcon size={scale(13)} color={colors.textPrimary} />
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(122),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(178,172,172,0.5)',
    paddingHorizontal: scale(18),
  },
  pressed: { opacity: 0.92 },
  left: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: scale(18),
    color: colors.textBlack,
  },
  sub: {
    fontFamily: fonts.semiBold,
    fontSize: scale(13),
    color: colors.textBlack,
    marginTop: verticalScale(6),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    alignSelf: 'flex-start',
    backgroundColor: colors.payGreen,
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    height: verticalScale(28),
    marginTop: verticalScale(12),
  },
  pillText: {
    fontFamily: fonts.bold,
    fontSize: scale(13),
    color: colors.textWhite,
  },
  mapWrap: {
    width: scale(100),
    height: scale(78),
    borderRadius: scale(10),
    overflow: 'hidden',
    marginLeft: scale(12),
    backgroundColor: colors.avatarCircle,
  },
  linkBadge: {
    position: 'absolute',
    top: scale(5),
    right: scale(5),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
