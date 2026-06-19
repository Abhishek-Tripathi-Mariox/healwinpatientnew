import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SvgProps } from 'react-native-svg';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface AmbulanceTypeCardProps {
  title: string;
  description: string;
  /** Scenic background SVG component. */
  Background: React.FC<SvgProps>;
  /** Vehicle cut-out SVG component. */
  Vehicle: React.FC<SvgProps>;
  /** Which side the vehicle sits on. Text aligns to the opposite side. */
  imageSide?: 'left' | 'right';
  /** Optional override for the title font size (Figma uses 16–18). */
  titleSize?: number;
  /** Background image opacity (Figma 0.64–0.9). */
  backgroundOpacity?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * One ambulance-type card from the "Type of Ambulance" screen.
 * A scenic background with a vehicle cut-out on one side and a title +
 * description on the other. Vehicle bleeds slightly past the card edge.
 */
export const AmbulanceTypeCard: React.FC<AmbulanceTypeCardProps> = ({
  title,
  description,
  Background,
  Vehicle,
  imageSide = 'left',
  titleSize = scale(18),
  backgroundOpacity = 0.85,
  onPress,
  style,
}) => {
  const vehicleOnLeft = imageSide === 'left';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.wrap, pressed && onPress ? styles.pressed : null, style]}
    >
      {/* Rounded surface holds the bg + scrim and casts the shadow */}
      <View style={[styles.surface, cardShadow]}>
        <Background
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={[StyleSheet.absoluteFillObject, { opacity: backgroundOpacity }]}
        />
        <View style={styles.scrim} />
      </View>

      {/* Vehicle cut-out (bleeds past the card edge) */}
      <View
        pointerEvents="none"
        style={[styles.vehicleWrap, vehicleOnLeft ? styles.vehicleLeft : styles.vehicleRight]}
      >
        <Vehicle width="100%" height="118%" preserveAspectRatio="xMidYMid meet" />
      </View>

      {/* Text on the opposite side */}
      <View style={[styles.textBlock, vehicleOnLeft ? styles.textRight : styles.textLeft]}>
        <Text
          style={[styles.title, { fontSize: titleSize, textAlign: vehicleOnLeft ? 'right' : 'left' }]}
        >
          {title}
        </Text>
        <Text
          style={[styles.desc, { textAlign: vehicleOnLeft ? 'right' : 'left' }]}
          numberOfLines={4}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
};

const CARD_HEIGHT = verticalScale(161);

const styles = StyleSheet.create({
  wrap: {
    height: CARD_HEIGHT,
    marginHorizontal: spacing.md,
    marginBottom: verticalScale(28),
  },
  pressed: { opacity: 0.92 },
  surface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.card,
    backgroundColor: colors.textPrimary,
    overflow: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  vehicleWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '60%',
    justifyContent: 'center',
  },
  vehicleLeft: { left: scale(-14) },
  vehicleRight: { right: scale(-14) },
  textBlock: {
    position: 'absolute',
    top: verticalScale(20),
    width: '52%',
  },
  textLeft: { left: spacing.lg },
  textRight: { right: spacing.lg },
  title: {
    fontFamily: fonts.bold,
    lineHeight: scale(24),
    color: colors.textWhite,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  desc: {
    fontFamily: fonts.bold,
    fontSize: scale(12),
    lineHeight: scale(18),
    color: colors.textWhite,
    marginTop: verticalScale(8),
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
