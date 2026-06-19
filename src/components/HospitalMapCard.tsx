import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { PhoneIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface HospitalMapCardProps {
  /** Map preview as an SVG component. */
  Map: React.FC<SvgProps>;
  hospitalName: string;
  distance: string; // e.g. "2.5 km away"
  duration: string; // e.g. "10 mins"
  onDirection?: () => void;
  onCall?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The map + hospital card at the top of the "Nearby Ambulances" screen.
 * Map preview, hospital name, distance · duration, and Direction / Call actions.
 */
export const HospitalMapCard: React.FC<HospitalMapCardProps> = ({
  Map,
  hospitalName,
  distance,
  duration,
  onDirection,
  onCall,
  style,
}) => (
  <View style={[styles.card, cardShadow, style]}>
    <View style={styles.mapFrame}>
      <Map width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
    </View>

    <Text style={styles.name}>{hospitalName}</Text>
    <Text style={styles.meta}>
      {distance}   ·   {duration}
    </Text>

    <View style={styles.actions}>
      <Pressable
        onPress={onDirection}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionLabel}>Direction</Text>
      </Pressable>
      <Pressable
        onPress={onCall}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <PhoneIcon size={scale(18)} color={colors.callGreen} />
        <Text style={styles.actionLabel}>Call</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(178,172,172,0.5)',
    padding: scale(10),
  },
  mapFrame: {
    height: verticalScale(200),
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  name: {
    fontFamily: fonts.bold, // Figma: ExtraBold
    fontSize: scale(14),
    color: colors.ink,
    marginTop: verticalScale(14),
    marginLeft: scale(8),
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.ink,
    marginTop: verticalScale(4),
    marginLeft: scale(8),
  },
  actions: {
    flexDirection: 'row',
    gap: scale(11),
    marginTop: verticalScale(14),
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    gap: scale(8),
    height: verticalScale(48),
    borderRadius: scale(8),
    backgroundColor: colors.softPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.ink,
  },
});
