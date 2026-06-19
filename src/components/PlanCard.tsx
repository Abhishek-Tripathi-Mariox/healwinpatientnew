import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ShieldBadgeIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface PlanCardProps {
  tier: 'silver' | 'gold';
  /** Benefit bullet points (benefits variant). */
  bullets?: string[];
  /** Key/value info lines (active-plan variant). */
  info?: { label: string; value: string }[];
  style?: StyleProp<ViewStyle>;
}

/**
 * HealWin membership plan card — bullet benefits OR active-plan info, with a
 * silver/gold shield badge on the right. (Figma 5:1345 / 5:1370 / 5:1395.)
 */
export const PlanCard: React.FC<PlanCardProps> = ({ tier, bullets, info, style }) => {
  const shield =
    tier === 'gold'
      ? { color: colors.shieldGold, light: colors.shieldGoldLight }
      : { color: colors.shieldSilver, light: colors.shieldSilverLight };

  return (
    <View style={[styles.card, cardShadow, style]}>
      <View style={styles.body}>
        {bullets?.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.dot}>{'•'}</Text>
            <Text style={styles.bullet}>{b}</Text>
          </View>
        ))}
        {info?.map((row) => (
          <Text key={row.label} style={styles.info}>
            {row.label} : {row.value}
          </Text>
        ))}
      </View>
      <ShieldBadgeIcon size={scale(86)} color={shield.color} light={shield.light} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: verticalScale(139),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(178,172,172,0.5)',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(14),
  },
  body: {
    flex: 1,
    paddingRight: scale(8),
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(6),
  },
  dot: {
    fontFamily: fonts.regular,
    fontSize: scale(10),
    color: colors.textBlack,
    marginRight: scale(6),
    lineHeight: scale(15),
  },
  bullet: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: scale(10),
    lineHeight: scale(15),
    color: colors.textBlack,
  },
  info: {
    fontFamily: fonts.regular,
    fontSize: scale(10),
    lineHeight: scale(22),
    color: colors.textBlack,
  },
});
