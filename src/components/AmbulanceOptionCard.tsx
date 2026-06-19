import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface AmbulanceOptionCardProps {
  name: string;
  price: string; // e.g. "₹ 2000.55"
  distance: string; // e.g. "2.5 km away"
  /** Scenic background SVG. */
  Background: React.FC<SvgProps>;
  /** Ambulance illustration SVG. */
  Vehicle: React.FC<SvgProps>;
  onBook?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A selectable ambulance option from "Ambulance Details" (Figma 5:1150):
 * scenic background, vehicle illustration on the left, name, price,
 * distance, a "Book Now" pill and a "Prices may vary" note.
 */
export const AmbulanceOptionCard: React.FC<AmbulanceOptionCardProps> = ({
  name,
  price,
  distance,
  Background,
  Vehicle,
  onBook,
  style,
}) => (
  <View style={[styles.card, cardShadow, style]}>
    <Background
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]}
    />

    {/* Vehicle illustration (left, bleeds) */}
    <View style={styles.vehicleWrap} pointerEvents="none">
      <Vehicle width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
    </View>

    <Text style={styles.name} numberOfLines={2}>
      {name}
    </Text>

    <View style={styles.right}>
      <Text style={styles.price}>{price}</Text>
      <Text style={styles.distance}>{distance}</Text>
      <Pressable
        onPress={onBook}
        style={({ pressed }) => [styles.book, cardShadow, pressed && styles.pressed]}
      >
        <Text style={styles.bookText}>Book Now</Text>
      </Pressable>
      <Text style={styles.note}>Prices may vary</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    height: verticalScale(124),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  vehicleWrap: {
    position: 'absolute',
    left: scale(-6),
    bottom: verticalScale(4),
    width: scale(160),
    height: verticalScale(110),
    justifyContent: 'center',
  },
  name: {
    position: 'absolute',
    left: scale(30),
    top: verticalScale(16),
    width: scale(220),
    fontFamily: fonts.bold,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  right: {
    position: 'absolute',
    right: scale(20),
    top: verticalScale(16),
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  distance: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.textBlack,
    marginTop: verticalScale(6),
  },
  book: {
    width: scale(85),
    height: verticalScale(28),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
  },
  pressed: { opacity: 0.7 },
  bookText: {
    fontFamily: fonts.bold,
    fontSize: scale(12),
    color: colors.brandRedDark,
  },
  note: {
    fontFamily: fonts.semiBold,
    fontSize: scale(10),
    color: colors.textBlack,
    marginTop: verticalScale(6),
  },
});
