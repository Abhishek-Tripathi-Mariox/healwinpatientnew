import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { CheckCircleIcon, WalletIcon } from '../components/icons';
import { AppAlert } from '../services/appAlert';
import {
  CheckoutCancelled,
  payFor,
  payFromWallet,
  topUpWallet,
} from '../services/checkout';
import { paymentsApi, type PayPurpose, type PayQuote } from '../api/payments';
import { useProfile } from '../state/profileStore';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type Rt = RouteProp<RootStackParamList, 'Payment'>;

/**
 * Payment.
 *
 * Every purpose here is real. The screen used to have a "generic" branch that
 * called nothing and rendered "₹X paid" — a success screen for a payment that
 * never happened. It is gone.
 *
 * For anything other than a wallet top-up the SERVER states the price: the
 * amount passed in is only what to show while the quote loads, and the amount
 * actually charged is the one the quote comes back with.
 */
export const PaymentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const title = params.title || 'Payment';
  const purpose = params.purpose || 'wallet';
  const refId = params.refId;
  const isTopUp = purpose === 'wallet';

  const profile = useProfile();
  const [quote, setQuote] = React.useState<PayQuote | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<'idle' | 'processing' | 'done'>('idle');
  // Set when the money was taken but the credit is still being confirmed, so
  // the success screen can say so instead of claiming it has landed.
  const [pendingNote, setPendingNote] = React.useState<string | null>(null);

  // The server's figure, once we have it. Until then the caller's estimate —
  // never the other way round.
  const amount = isTopUp ? params.amount : quote?.amount ?? params.amount;
  const walletBalance = quote?.walletBalance ?? 0;
  const canUseWallet = !isTopUp && walletBalance >= amount && amount > 0;

  React.useEffect(() => {
    if (isTopUp || !refId) return;
    let live = true;
    paymentsApi
      .quote(purpose as PayPurpose, refId)
      .then(q => live && setQuote(q))
      .catch(e => live && setQuoteError(e?.message || 'Could not load the amount due.'));
    return () => {
      live = false;
    };
  }, [isTopUp, purpose, refId]);

  const prefill = {
    name: profile.name || undefined,
    email: profile.email || undefined,
    contact: profile.phone || undefined,
  };

  const run = async (go: () => Promise<{ pending?: string }>) => {
    if (stage !== 'idle') return;
    setStage('processing');
    try {
      const res = await go();
      setPendingNote(res.pending ?? null);
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

  const pay = () =>
    run(async () => {
      if (isTopUp) return topUpWallet(params.amount, prefill);
      if (!refId) throw new Error('There is nothing to pay for here.');
      return payFor({
        purpose: purpose as PayPurpose,
        refId,
        description: quote?.description || title,
        prefill,
      });
    });

  const payByWallet = () =>
    run(async () => {
      if (!refId) throw new Error('There is nothing to pay for here.');
      return payFromWallet(purpose as PayPurpose, refId);
    });

  const nothingDue = !isTopUp && !!quote && quote.amount <= 0;

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
                : isTopUp
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
              <Text style={styles.amountLabel}>{quote?.description || title}</Text>
              <Text style={styles.amount}>₹{amount}</Text>
              {!!quote && quote.paid > 0 && (
                <Text style={styles.amountNote}>
                  ₹{quote.paid} of ₹{quote.total} already paid
                </Text>
              )}
            </View>

            <Text style={styles.note}>
              {quoteError
                ? quoteError
                : nothingDue
                ? 'This is fully paid — there is nothing left to pay.'
                : 'Secured by Razorpay. UPI, cards and net banking accepted.'}
            </Text>

            <View style={{ flex: 1 }} />

            {canUseWallet && (
              <Pressable
                onPress={payByWallet}
                disabled={stage === 'processing'}
                style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryCtaText}>
                  Pay from wallet (₹{walletBalance})
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={pay}
              disabled={stage === 'processing' || nothingDue || !!quoteError}
              style={({ pressed }) => [
                styles.cta,
                (pressed || stage === 'processing' || nothingDue || !!quoteError) && styles.pressed,
              ]}
            >
              {stage === 'processing' ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text style={styles.ctaText}>
                  {nothingDue ? 'Nothing to pay' : `Pay ₹${amount}`}
                </Text>
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
  amountNote: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(4) },
  note: { textAlign: 'center', fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(14) },
  cta: {
    height: verticalScale(52), borderRadius: scale(12), backgroundColor: colors.directionsBlue,
    alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(20),
    alignSelf: 'stretch', paddingHorizontal: scale(40),
  },
  secondaryCta: {
    height: verticalScale(48), borderRadius: scale(12), backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.directionsBlue,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
  },
  secondaryCtaText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.directionsBlue },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  successTitle: { fontFamily: fonts.bold, fontSize: scale(20), color: colors.textBlack, marginTop: verticalScale(18) },
  successSub: { fontFamily: fonts.regular, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(8), textAlign: 'center' },
});
