import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '../components';
import { ChevronForwardIcon } from '../components/icons';
import { bookingsApi, UiBooking } from '../api/bookings';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

export type Booking = UiBooking;

type Tab = 'active' | 'past';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Bookings'>;

export const BookingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('active');
  const [items, setItems] = useState<UiBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      bookingsApi
        .list()
        .then((res) => active && setItems(res))
        .catch(() => active && setItems([]))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  const list = items.filter((b) => (tab === 'active' ? b.status === 'active' : b.status !== 'active'));

  return (
    <View style={styles.root}>
      <ScreenHeader title="My Bookings" onBack={() => navigation.goBack()} />

      <View style={styles.tabs}>
        {(['active', 'past'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'active' ? 'Active' : 'Past'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {loading ? (
          <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
        ) : list.length === 0 ? (
          <Text style={styles.empty}>{tab === 'active' ? 'No active bookings' : 'No past bookings'}</Text>
        ) : (
          list.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => navigation.navigate('BookingDetail', { id: b.id })}
              style={({ pressed }) => [styles.card, cardShadow, pressed && styles.pressed]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.type}>{b.type}</Text>
                <Text style={styles.meta}>{b.date}</Text>
                <View style={styles.row}>
                  <Text style={styles.amount}>₹{b.amount}</Text>
                  <View style={[styles.statusChip, statusStyle(b.status)]}>
                    <Text style={[styles.statusText, { color: statusColor(b.status) }]}>{label(b.status)}</Text>
                  </View>
                </View>
              </View>
              <ChevronForwardIcon size={scale(20)} color="#B9C2C9" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const label = (s: Booking['status']) => (s === 'active' ? 'Active' : s === 'completed' ? 'Completed' : 'Cancelled');
const statusColor = (s: Booking['status']) => (s === 'completed' ? '#2E9B2E' : s === 'cancelled' ? colors.brandRedDark : colors.directionsBlue);
const statusStyle = (s: Booking['status']) => ({ backgroundColor: s === 'completed' ? '#E6F4E6' : s === 'cancelled' ? '#FCE9E9' : '#EAF1FE' });

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: scale(14), paddingHorizontal: spacing.lg, marginBottom: verticalScale(6) },
  tab: { width: scale(89), height: verticalScale(35), borderRadius: scale(15), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.tabActive },
  tabText: { fontFamily: fonts.semiBold, fontSize: scale(14), color: '#5B5B5B' },
  tabTextActive: { color: '#262626' },
  list: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(14), gap: verticalScale(14) },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(40) },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(16) },
  pressed: { opacity: 0.9 },
  type: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack },
  meta: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(5) },
  row: { flexDirection: 'row', alignItems: 'center', gap: scale(12), marginTop: verticalScale(10) },
  amount: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack },
  statusChip: { borderRadius: scale(6), paddingHorizontal: scale(10), paddingVertical: verticalScale(3) },
  statusText: { fontFamily: fonts.semiBold, fontSize: scale(11) },
});
