import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { CheckCircleIcon, WalletIcon } from '../components/icons';
import { walletApi } from '../api/misc';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type Rt = RouteProp<RootStackParamList, 'Payment'>;

/**
 * MOCK payment screen — no real gateway yet. It simulates a successful payment
 * so the flows (wallet top-up, booking/order pay) work end-to-end. For wallet
 * top-ups it actually credits the wallet via /wallet/add; everything else just
 * shows success. Swap the `pay()` body for Razorpay when the gateway is wired.
 */
export const PaymentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const amount = params.amount;
  const title = params.title || 'Payment';
  const purpose = params.purpose || 'generic';

  const [stage, setStage] = React.useState<'idle' | 'processing' | 'done'>('idle');

  const pay = async () => {
    if (stage !== 'idle') return;
    setStage('processing');
    try {
      // Simulate gateway processing.
      await new Promise((r) => setTimeout(r, 1200));
      if (purpose === 'wallet') {
        await walletApi.addMoney(amount);
      }
      setStage('done');
    } catch {
      setStage('idle');
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Payment" onBack={() => navigation.goBack()} />

      <View style={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {stage === 'done' ? (
          <View style={styles.center}>
            <CheckCircleIcon size={scale(72)} color="#2E9B2E" />
            <Text style={styles.successTitle}>Payment successful</Text>
            <Text style={styles.successSub}>
              {purpose === 'wallet' ? `₹${amount} added to your wallet.` : `₹${amount} paid for ${title}.`}
            </Text>
            <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.amountCard, cardShadow]}>
              <View style={styles.amountIcon}>
                <WalletIcon size={scale(22)} color={colors.directionsBlue} />
              </View>
              <Text style={styles.amountLabel}>{title}</Text>
              <Text style={styles.amount}>₹{amount}</Text>
            </View>

            <Text style={styles.note}>Demo mode — no real payment is charged.</Text>

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={pay}
              disabled={stage === 'processing'}
              style={({ pressed }) => [styles.cta, (pressed || stage === 'processing') && styles.pressed]}
            >
              {stage === 'processing' ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text style={styles.ctaText}>Pay ₹{amount}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: verticalScale(20) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  amountCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(22), alignItems: 'center' },
  amountIcon: {
    width: scale(48), height: scale(48), borderRadius: scale(24),
    backgroundColor: `${colors.directionsBlue}1A`, alignItems: 'center', justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  amountLabel: { fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted },
  amount: { fontFamily: fonts.bold, fontSize: scale(34), color: colors.textBlack, marginTop: verticalScale(6) },
  note: { textAlign: 'center', fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(14) },
  cta: {
    height: verticalScale(52), borderRadius: scale(12), backgroundColor: colors.directionsBlue,
    alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(20),
    alignSelf: 'stretch', paddingHorizontal: scale(40),
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  successTitle: { fontFamily: fonts.bold, fontSize: scale(20), color: colors.textBlack, marginTop: verticalScale(18) },
  successSub: { fontFamily: fonts.regular, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(8), textAlign: 'center' },
});
