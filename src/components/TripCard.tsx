import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { RebookIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface TripCardProps {
  title: string;
  /** e.g. "12 Sept · 7:18 pm" */
  dateTime: string;
  /** e.g. "₹200.00" */
  amount: string;
  /** Optional status, e.g. "Cancelled". */
  status?: string;
  /** Ambulance illustration as an SVG component. */
  Vehicle: React.FC<SvgProps>;
  onRebook?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A past-trip / booking-history card from the "Your Trip" screen.
 * Avatar disc + vehicle illustration, name, date/time, fare (+ status),
 * and a "Rebook" pill on the right.
 */
export const TripCard: React.FC<TripCardProps> = ({
  title,
  dateTime,
  amount,
  status,
  Vehicle,
  onRebook,
  style,
}) => (
  <View style={[styles.card, cardShadow, style]}>
    <View style={styles.disc}>
      <Vehicle width="86%" height="86%" preserveAspectRatio="xMidYMid meet" />
    </View>

    <View style={styles.body}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {dateTime}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {amount}
        {status ? `   ·   ${status}` : ''}
      </Text>
    </View>

    <Pressable
      onPress={onRebook}
      accessibilityRole="button"
      accessibilityLabel={`Rebook ${title}`}
      style={({ pressed }) => [styles.rebook, cardShadow, pressed && styles.pressed]}
    >
      <RebookIcon size={scale(13)} color={colors.brandRedDark} />
      <Text style={styles.rebookLabel}>Rebook</Text>
    </Pressable>
  </View>
);

const DISC = scale(90);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(113),
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: scale(12),
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    backgroundColor: colors.avatarCircle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    marginLeft: scale(10),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(18),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: scale(11),
    color: colors.ink,
    marginTop: scale(3),
  },
  rebook: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    height: scale(26),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  rebookLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.brandRedDark,
  },
});
