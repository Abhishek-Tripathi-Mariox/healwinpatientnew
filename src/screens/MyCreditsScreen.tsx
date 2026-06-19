import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, PaymentRow } from '../components';
import { FilterIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { walletApi } from '../api/misc';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

interface Payment {
  key: string;
  name: string;
  subtitle: string;
  amount: string;
}

const mapTxn = (t: any, i: number): Payment => {
  const amt = t.amount ?? 0;
  const credit = t.type === 'credit' || t.direction === 'credit' || amt > 0;
  return {
    key: t._id || String(i),
    name: t.description || t.title || t.type || 'Transaction',
    subtitle: t.createdAt
      ? new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '',
    amount: `${credit ? '+' : '-'}₹${Math.abs(amt)}`,
  };
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'MyCredits'>;

export const MyCreditsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState<number | null>(200);
  const [balance, setBalance] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const Wallet = svgs.wallet;
  const Cash = svgs.cash;

  // Refresh on focus so the balance/history update after a top-up.
  useFocusEffect(
    useCallback(() => {
      walletApi.balance().then((d) => setBalance(d?.balance ?? 0)).catch(() => setBalance(0));
      walletApi.transactions().then((list) => setPayments(list.map(mapTxn))).catch(() => setPayments([]));
    }, []),
  );

  const pickQuick = (val: number) => {
    setSelected(val);
    setAmount(String(val));
  };

  const addMoney = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid amount to add.');
      return;
    }
    // Dummy payment for now (no gateway) — the Payment screen credits the wallet.
    navigation.navigate('Payment', { amount: amt, title: 'Wallet top-up', purpose: 'wallet' });
  };

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>My Credits</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + verticalScale(24) },
        ]}
      >
        {/* Balance card */}
        <View style={[styles.balanceCard, cardShadow]}>
          <View style={styles.walletWrap} pointerEvents="none">
            <Wallet width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
          </View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <View style={styles.balanceRight}>
            <Cash width={scale(56)} height={scale(56)} preserveAspectRatio="xMidYMid meet" />
            <Text style={styles.balanceValue}>₹ {balance ?? '—'}</Text>
          </View>
        </View>

        {/* Add credits */}
        <Text style={styles.sectionLabel}>Add Credits</Text>
        <View style={[styles.addCard, cardShadow]}>
          <TextInput
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setSelected(null);
            }}
            placeholder="Enter Your Ammount"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            style={styles.input}
          />

          <View style={styles.chips}>
            {QUICK_AMOUNTS.map((val) => {
              const active = selected === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => pickQuick(val)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>₹{val}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={addMoney}
            style={({ pressed }) => [styles.addMoney, cardShadow, pressed && styles.pressed]}
          >
            <Text style={styles.addMoneyText}>Add Money</Text>
          </Pressable>
        </View>

        {/* Payment history */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionLabel}>Payment History</Text>
          <Pressable onPress={() => {}} hitSlop={8} accessibilityLabel="Filter">
            <FilterIcon size={scale(20)} color={colors.ink} />
          </Pressable>
        </View>

        {payments.length === 0 ? (
          <Text style={styles.emptyHistory}>No transactions yet</Text>
        ) : (
          payments.map((p) => (
            <PaymentRow
              key={p.key}
              name={p.name}
              subtitle={p.subtitle}
              amount={p.amount}
              style={styles.paymentRow}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(10),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(17),
    letterSpacing: -0.3,
    color: colors.textBlack,
    marginLeft: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(6),
  },

  /* Balance card */
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(96),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(197,197,197,0.5)',
    paddingHorizontal: scale(12),
  },
  walletWrap: {
    width: scale(110),
    height: '100%',
    justifyContent: 'center',
  },
  balanceLabel: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.textBlack,
    marginLeft: scale(4),
  },
  balanceRight: {
    alignItems: 'center',
  },
  balanceValue: {
    fontFamily: fonts.bold,
    fontSize: scale(26),
    color: colors.textBlack,
    marginTop: scale(2),
  },

  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: '#141414',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(12),
    marginLeft: scale(6),
  },

  /* Add credits card */
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(229,229,229,0.5)',
    padding: scale(16),
  },
  input: {
    height: verticalScale(41),
    borderRadius: scale(8),
    backgroundColor: colors.inputBg,
    paddingHorizontal: scale(16),
    fontFamily: fonts.regular,
    fontSize: scale(15),
    color: colors.textBlack,
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(18),
  },
  chip: {
    flex: 1,
    height: verticalScale(26),
    marginHorizontal: scale(4),
    borderRadius: scale(6),
    borderWidth: 0.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.inputBg,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.textBlack,
  },
  addMoney: {
    height: verticalScale(47),
    borderRadius: scale(8),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(229,229,229,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(18),
  },
  pressed: { opacity: 0.7 },
  addMoneyText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.textBlack,
  },

  /* History */
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: scale(6),
  },
  paymentRow: {
    marginBottom: verticalScale(15),
  },
  emptyHistory: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: verticalScale(10),
  },
});
