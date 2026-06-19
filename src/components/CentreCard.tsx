import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { DirectionsArrowIcon, StarIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface CentreTag {
  label: string;
  bg: string;
  color: string;
}

export interface CentreCardProps {
  /** Thumbnail photo as an SVG component. */
  Thumb: React.FC<SvgProps>;
  name: string;
  location: string;
  rating: string;
  distance: string;
  tag: CentreTag;
  onDirections?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A healthcare-centre card from the centres list (Figma 5:844 / 5:914):
 * thumbnail, name, location, rating · distance, a category tag, and a
 * blue "Directions" button.
 */
export const CentreCard: React.FC<CentreCardProps> = ({
  Thumb,
  name,
  location,
  rating,
  distance,
  tag,
  onDirections,
  style,
}) => (
  <View style={[styles.card, cardShadow, style]}>
    <View style={styles.top}>
      <View style={styles.thumb}>
        <Thumb width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {location}
        </Text>
        <View style={styles.ratingRow}>
          <StarIcon size={scale(15)} />
          <Text style={styles.rating}>{rating}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.distance}>{distance}</Text>
        </View>
      </View>
    </View>

    <View style={styles.bottom}>
      <View style={[styles.tag, { backgroundColor: tag.bg }]}>
        <Text style={[styles.tagText, { color: tag.color }]} numberOfLines={1}>
          {tag.label}
        </Text>
      </View>
      <Pressable
        onPress={onDirections}
        style={({ pressed }) => [styles.directions, pressed && styles.pressed]}
      >
        <DirectionsArrowIcon size={scale(18)} color={colors.textWhite} />
        <Text style={styles.directionsText}>Directions</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    height: verticalScale(172),
    backgroundColor: colors.surface,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: colors.cardLine,
    padding: scale(11),
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
  },
  thumb: {
    width: scale(91),
    height: scale(86),
    borderRadius: scale(10),
    overflow: 'hidden',
    backgroundColor: colors.avatarCircle,
  },
  info: {
    flex: 1,
    marginLeft: scale(18),
    paddingTop: scale(4),
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  location: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.metaGray,
    marginTop: verticalScale(6),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
  },
  rating: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.ratingText,
    marginLeft: scale(4),
  },
  dot: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.metaGray,
    marginHorizontal: scale(6),
  },
  distance: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.metaGray,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    flex: 1,
    height: verticalScale(39),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  tagText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
  },
  directions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    width: scale(152),
    height: verticalScale(48),
    borderRadius: scale(8),
    backgroundColor: colors.directionsBlue,
  },
  pressed: { opacity: 0.85 },
  directionsText: {
    fontFamily: fonts.bold,
    fontSize: scale(15),
    color: colors.textWhite,
  },
});
