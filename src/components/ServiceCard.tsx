import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronForwardIcon, IconProps } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface ServiceCardProps {
  title: string;
  subtitle: string;
  Icon: React.FC<IconProps>;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * "What are you looking for?" service option (Hospital / Pharmacy):
 * colored illustration + title + subtitle + chevron.
 */
export const ServiceCard: React.FC<ServiceCardProps> = ({ title, subtitle, Icon, onPress, style }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, cardShadow, pressed && styles.pressed, style]}
  >
    <View style={styles.iconWrap}>
      <Icon size={scale(64)} />
    </View>
    <View style={styles.body}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
    <ChevronForwardIcon size={scale(22)} color="#9A9A9A" />
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(104),
    backgroundColor: colors.surface,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: colors.cardLine,
    paddingHorizontal: scale(16),
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: scale(74),
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: scale(12),
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: scale(24),
    color: colors.serviceTitle,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: scale(10),
    color: colors.lorem,
    marginTop: scale(4),
  },
});
