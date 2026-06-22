import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { coinsApi } from '../api/misc';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MyCoins'>;
type Tab = 'earned' | 'spent';

interface Txn { id: string; title: string; date: string; amount: number; credit: boolean }

const mapTxn = (t: any, i: number): Txn => {
  const amt = t.coins ?? t.amount ?? 0;
  const credit = t.type === 'credit' || t.type === 'CREDIT' || t.direction === 'credit' || amt > 0;
  return {
    id: t._id || String(i),
    title: t.description || t.reason || t.title || (credit ? 'Coins earned' : 'Coins used'),
    date: t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
    amount: Math.abs(amt),
    credit,
  };
};

export const MyCoinsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [balance, setBalance] = React.useState<number | null>(null);
  const [tab, setTab] = React.useState<Tab>('earned');
  const [list, setList] = React.useState<Txn[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [amount, setAmount] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    coinsApi.balance().then((d) => setBalance(d?.balance ?? 0)).catch(() => setBalance(0));
    setLoading(true);
    (tab === 'earned' ? coinsApi.rewards() : coinsApi.redemptions())
      .then((l) => setList(l.map(mapTxn)))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [tab]);

  useFocusEffect(React.useCallback(() => load(), [load]));

  const transfer = async () => {
    const coins = Number(amount);
    if (!coins || coins < 100) {
      Alert.alert('Minimum 100 coins', 'Enter at least 100 coins to transfer to your wallet.');
      return;
    }
    if (balance != null && coins > balance) {
      Alert.alert('Not enough coins', `You have ${balance} coins.`);
      return;
    }
    setBusy(true);
    try {
      const res = await coinsApi.transferToWallet(coins);
      setAmount('');
      load();
      Alert.alert('Transferred', `₹${res?.amountCredited ?? coins} added to your wallet.`);
    } catch (e: any) {
      Alert.alert('Could not transfer', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="My Coins" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {/* Balance */}
        <View style={[styles.balanceCard, cardShadow]}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.balanceLabel}>Coin balance</Text>
          <Text style={styles.balanceValue}>{balance ?? '—'}</Text>
          <Text style={styles.note}>1 coin = ₹1 · transfer to wallet to spend</Text>
        </View>

        {/* Transfer to wallet */}
        <View style={[styles.transferCard, cardShadow]}>
          <Text style={styles.sectionLabel}>Transfer to wallet</Text>
          <View style={styles.transferRow}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="Coins (min 100)"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
            <Pressable disabled={busy} onPress={transfer} style={({ pressed }) => [styles.transferBtn, (pressed || busy) && styles.pressed]}>
              <Text style={styles.transferBtnText}>{busy ? '…' : 'Transfer'}</Text>
            </Pressable>
          </View>
        </View>

        {/* History tabs */}
        <View style={styles.tabs}>
          {(['earned', 'spent'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'earned' ? 'Earned' : 'Spent'}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(30) }} />
        ) : list.length === 0 ? (
          <Text style={styles.empty}>{tab === 'earned' ? 'No coins earned yet.' : 'No coins spent yet.'}</Text>
        ) : (
          list.map((t) => (
            <View key={t.id} style={[styles.row, cardShadow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t.title}</Text>
                {!!t.date && <Text style={styles.rowDate}>{t.date}</Text>}
              </View>
              <Text style={[styles.rowAmt, { color: t.credit ? '#2E9B2E' : colors.brandRedDark }]}>
                {t.credit ? '+' : '-'}{t.amount} 🪙
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(6) },
  balanceCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(22), alignItems: 'center' },
  coinIcon: { fontSize: scale(34) },
  balanceLabel: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted, marginTop: verticalScale(8) },
  balanceValue: { fontFamily: fonts.bold, fontSize: scale(34), color: colors.textBlack, marginTop: verticalScale(4) },
  note: { fontFamily: fonts.regular, fontSize: scale(11.5), color: colors.inkMuted, marginTop: verticalScale(8) },
  transferCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(16), marginTop: verticalScale(14) },
  sectionLabel: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.textBlack, marginBottom: verticalScale(10) },
  transferRow: { flexDirection: 'row', gap: scale(10) },
  input: { flex: 1, height: verticalScale(46), borderRadius: scale(10), borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.background, paddingHorizontal: scale(14), fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack },
  transferBtn: { paddingHorizontal: scale(20), height: verticalScale(46), borderRadius: scale(10), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  transferBtnText: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textWhite },
  tabs: { flexDirection: 'row', gap: scale(10), marginTop: verticalScale(20), marginBottom: verticalScale(12) },
  tab: { flex: 1, height: verticalScale(38), borderRadius: scale(19), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.directionsBlue },
  tabText: { fontFamily: fonts.semiBold, fontSize: scale(13), color: '#5B5B5B' },
  tabTextActive: { color: colors.textWhite },
  empty: { textAlign: 'center', marginTop: verticalScale(30), fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14), marginBottom: verticalScale(10) },
  rowTitle: { fontFamily: fonts.medium, fontSize: scale(13.5), color: colors.textBlack },
  rowDate: { fontFamily: fonts.regular, fontSize: scale(11), color: colors.inkMuted, marginTop: verticalScale(3) },
  rowAmt: { fontFamily: fonts.bold, fontSize: scale(14) },
});
