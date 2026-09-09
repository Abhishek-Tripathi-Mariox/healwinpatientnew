import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { CheckCircleIcon, WalletIcon } from '../components/icons';
import { AppAlert } from '../services/appAlert';
import { CheckoutCancelled, topUpWallet } from '../services/checkout';
import { useProfile } from '../state/profileStore';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type Rt = RouteProp<RootStackParamList, 'Payment'>;

/**
 * Payment.
 *
 * Wallet top-ups are REAL: the server creates a Razorpay order, the customer
 * pays in Razorpay's own sheet, and the server credits only what the gateway
 * confirms it captured. Card details never reach this app.
 *
 * Other purposes (booking/order pay) are still settled elsewhere in the flow
 * and only show confirmation here — that is unchanged.
 */
export const PaymentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const amount = params.amount;
  const title = params.title || 'Payment';
  const purpose = params.purpose || 'generic';

  const profile = useProfile();
  const [stage, setStage] = React.useState<'idle' | 'processing' | 'done'>('idle');
  // Set when the money was taken but the credit is still being confirmed, so
  // the success screen can say so instead of claiming it has landed.
  const [pendingNote, setPendingNote] = React.useState<string | null>(null);

  const pay = async () => {
    if (stage !== 'idle') return;
    setStage('processing');
    try {
      if (purpose === 'wallet') {
        const res = await topUpWallet(amount, {
          name: profile.name || undefined,
          email: profile.email || undefined,
          contact: profile.phone || undefined,
        });
        setPendingNote(res.pending ?? null);
      }
      setStage('done');
    } catch (e) {
      setStage('idle');
      // Backing out of the sheet is a normal thing to do, not an error worth
      // an alert.
      if (e instanceof CheckoutCancelled) return;
      AppAlert.alert(
        'Payment failed',
        e instanceof Error ? e.message : 'The payment could not be completed.',
      );
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Payment" onBack={() => navigation.goBack()} />

      <View style={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {stage === 'done' ? (
          <View style={styles.center}>
            <CheckCircleIcon size={scale(72)} color="#2E9B2E" />
            <Text style={styles.successTitle}>
              {pendingNote ? 'Payment received' : 'Payment successful'}
            </Text>
            <Text style={styles.successSub}>
              {pendingNote
                ? pendingNote
                : purpose === 'wallet'
                ? `₹${amount} added to your wallet.`
                : `₹${amount} paid for ${title}.`}
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

            <Text style={styles.note}>
              {purpose === 'wallet'
                ? 'Secured by Razorpay. UPI, cards and net banking accepted.'
                : 'Payment is collected at the time of service.'}
            </Text>

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
