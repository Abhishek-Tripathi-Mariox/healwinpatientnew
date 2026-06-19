import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CheckCircleIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface PaymentRowProps {
  name: string;
  /** e.g. "Paid on 16 Oct, 10:05 AM" */
  subtitle: string;
  /** e.g. "-₹200" */
  amount: string;
  /** Tint for the amount (default = debit red). */
  amountColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * One payment-history row from the "My Credits" screen:
 * green check, payer name, paid-on subtitle, and the amount.
 */
export const PaymentRow: React.FC<PaymentRowProps> = ({
  name,
  subtitle,
  amount,
  amountColor = colors.brandRedDark,
  style,
}) => (
  <View style={[styles.row, cardShadow, style]}>
    <CheckCircleIcon size={scale(30)} color={colors.creditGreen} />
    <View style={styles.body}>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
    <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(64),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: scale(11),
  },
  body: {
    flex: 1,
    marginLeft: scale(12),
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: '#141414',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: '#999595',
    marginTop: scale(2),
  },
  amount: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
  },
});
