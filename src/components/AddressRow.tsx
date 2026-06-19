import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MapPinIcon } from './icons';
import { colors, fonts, scale, verticalScale } from '../theme';

export interface AddressRowProps {
  title: string;
  address: string;
  /** Optional distance shown under the pin (e.g. "100 km"). */
  distance?: string;
  /** Show a hairline divider under the row. */
  divider?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A saved/suggested address row used on the "Plan your Ambulance" screens:
 * red map pin (+ optional distance) on the left, title + address on the right.
 */
export const AddressRow: React.FC<AddressRowProps> = ({
  title,
  address,
  distance,
  divider = true,
  onPress,
  style,
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null, style]}
  >
    <View style={styles.left}>
      <MapPinIcon size={scale(18)} />
      {!!distance && <Text style={styles.distance}>{distance}</Text>}
    </View>

    <View style={styles.body}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.address} numberOfLines={1}>
        {address}
      </Text>
      {divider && <View style={styles.divider} />}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: verticalScale(8),
  },
  pressed: { opacity: 0.6 },
  left: {
    width: scale(48),
    alignItems: 'center',
  },
  distance: {
    fontFamily: fonts.medium,
    fontSize: scale(10),
    color: colors.addrTitle,
    marginTop: verticalScale(4),
  },
  body: {
    flex: 1,
    paddingBottom: verticalScale(8),
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: scale(10),
    color: colors.addrTitle,
  },
  address: {
    fontFamily: fonts.medium,
    fontSize: scale(10),
    color: colors.addrText,
    marginTop: verticalScale(3),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E2E2',
    marginTop: verticalScale(8),
  },
});
