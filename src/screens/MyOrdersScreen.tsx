import React from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader, SlotPicker, type Slot, type SlotSelection } from '../components';
import { doctorsApi, labApi, pharmacyApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MyOrders'>;
type Tab = 'consultations' | 'lab' | 'pharmacy';

interface Item {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  cancellable: boolean;
  doctorId?: string; // for fetching this doctor's slots on reschedule
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'consultations', label: 'Consultations' },
  { key: 'lab', label: 'Lab Tests' },
  { key: 'pharmacy', label: 'Pharmacy' },
];

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const humanStatus = (s: string) =>
  (s || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const isCancelled = (s: string) => s === 'CANCELLED';
const isDone = (s: string) => ['COMPLETED', 'DELIVERED', 'REPORT_READY'].includes(s);

const statusTone = (s: string) =>
  isCancelled(s) ? colors.brandRedDark : isDone(s) ? '#2E9B2E' : colors.directionsBlue;

const mapConsultation = (c: any): Item => ({
  id: c._id,
  title: c.doctorName ? `Dr. ${c.doctorName}` : 'Consultation',
  subtitle: [c.speciality, c.slotLabel ? `🕒 ${c.slotLabel}` : fmtDate(c.createdAt)].filter(Boolean).join(' · '),
  amount: c.fee ?? 0,
  status: c.status,
  cancellable: !['COMPLETED', 'CANCELLED'].includes(c.status),
  doctorId: c.doctorId ? String(c.doctorId) : undefined,
});

const mapLab = (b: any): Item => ({
  id: b._id,
  title: (b.tests || []).map((t: any) => t.name).join(', ') || 'Lab tests',
  subtitle: [b.slotLabel ? `🕒 ${b.slotLabel}` : b.slot, fmtDate(b.createdAt)].filter(Boolean).join(' · '),
  amount: b.totalAmount ?? 0,
  status: b.status,
  cancellable: !['REPORT_READY', 'CANCELLED'].includes(b.status),
});

const mapPharmacy = (o: any): Item => ({
  id: o._id,
  title: (o.items || []).map((i: any) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ') || 'Pharmacy order',
  subtitle: fmtDate(o.createdAt),
  amount: o.totalAmount ?? 0,
  status: o.status,
  cancellable: !['DELIVERED', 'CANCELLED'].includes(o.status),
});

export const MyOrdersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = React.useState<Tab>('consultations');
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cancelling, setCancelling] = React.useState<string | null>(null);
  // Reschedule modal state.
  const [rescheduleItem, setRescheduleItem] = React.useState<Item | null>(null);
  const [picked, setPicked] = React.useState<SlotSelection | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Slots for the reschedule sheet — doctor's slots for consults, lab slots otherwise.
  const fetchSlots = React.useCallback(
    (date: string): Promise<Slot[]> =>
      (tab === 'consultations' && rescheduleItem?.doctorId
        ? doctorsApi.slots(rescheduleItem.doctorId, date)
        : labApi.slots(date)) as Promise<Slot[]>,
    [tab, rescheduleItem?.doctorId],
  );

  const load = React.useCallback(async (which: Tab) => {
    setLoading(true);
    try {
      if (which === 'consultations') setItems((await doctorsApi.consultations()).map(mapConsultation));
      else if (which === 'lab') setItems((await labApi.bookings()).map(mapLab));
      else setItems((await pharmacyApi.orders()).map(mapPharmacy));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load(tab);
    }, [load, tab]),
  );

  const onCancel = (item: Item) => {
    Alert.alert('Cancel this?', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(item.id);
          try {
            if (tab === 'consultations') await doctorsApi.cancelConsultation(item.id);
            else if (tab === 'lab') await labApi.cancelBooking(item.id);
            else await pharmacyApi.cancelOrder(item.id);
            await load(tab);
          } catch {
            Alert.alert('Could not cancel', 'Please try again.');
          } finally {
            setCancelling(null);
          }
        },
      },
    ]);
  };

  const openReschedule = (item: Item) => {
    setPicked(null);
    setRescheduleItem(item);
  };

  const saveReschedule = async () => {
    if (!rescheduleItem || !picked || saving) return;
    setSaving(true);
    try {
      if (tab === 'consultations') await doctorsApi.rescheduleConsultation(rescheduleItem.id, picked.date, picked.time);
      else await labApi.rescheduleBooking(rescheduleItem.id, picked.date, picked.time);
      setRescheduleItem(null);
      setPicked(null);
      await load(tab);
      Alert.alert('Rescheduled', `Updated to ${picked.label}.`);
    } catch (e: any) {
      Alert.alert('Could not reschedule', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="My Orders" onBack={() => navigation.goBack()} />

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Nothing here yet.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(30) }]}>
          {items.map((it) => (
            <View key={it.id} style={[styles.card, cardShadow]}>
              <View style={styles.cardTop}>
                <Text style={styles.title} numberOfLines={2}>{it.title}</Text>
                <View style={[styles.badge, { backgroundColor: `${statusTone(it.status)}1A` }]}>
                  <Text style={[styles.badgeText, { color: statusTone(it.status) }]}>{humanStatus(it.status)}</Text>
                </View>
              </View>
              {!!it.subtitle && <Text style={styles.subtitle}>{it.subtitle}</Text>}
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>{it.amount > 0 ? `₹${it.amount}` : '—'}</Text>
                <View style={styles.actions}>
                  {it.cancellable && tab !== 'pharmacy' && (
                    <Pressable onPress={() => openReschedule(it)}>
                      <Text style={styles.reschedule}>Reschedule</Text>
                    </Pressable>
                  )}
                  {it.cancellable && (
                    <Pressable onPress={() => onCancel(it)} disabled={cancelling === it.id}>
                      <Text style={styles.cancel}>{cancelling === it.id ? 'Cancelling…' : 'Cancel'}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Reschedule slot picker */}
      <Modal
        visible={!!rescheduleItem}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleItem(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRescheduleItem(null)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + verticalScale(16) }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            Reschedule {tab === 'consultations' ? 'consultation' : 'sample collection'}
          </Text>
          <SlotPicker fetchSlots={fetchSlots} value={picked} onChange={setPicked} />
          <Pressable
            disabled={!picked || saving}
            onPress={saveReschedule}
            style={({ pressed }) => [styles.confirm, (!picked || saving) && styles.confirmDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.confirmText}>
              {saving ? 'Saving…' : picked ? `Confirm — ${picked.label}` : 'Select a slot'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: scale(8), paddingHorizontal: spacing.lg, paddingTop: verticalScale(8), paddingBottom: verticalScale(6) },
  tab: { flex: 1, height: verticalScale(36), borderRadius: scale(18), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.directionsBlue },
  tabText: { fontFamily: fonts.semiBold, fontSize: scale(12), color: '#5B5B5B' },
  tabTextActive: { color: colors.textWhite },
  empty: { textAlign: 'center', marginTop: verticalScale(50), fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted },
  list: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8), gap: verticalScale(12) },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(16) },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: scale(10) },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  badge: { borderRadius: scale(6), paddingHorizontal: scale(9), paddingVertical: verticalScale(3) },
  badgeText: { fontFamily: fonts.semiBold, fontSize: scale(10) },
  subtitle: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(6) },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: verticalScale(12) },
  amount: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack },
  actions: { flexDirection: 'row', alignItems: 'center', gap: scale(18) },
  reschedule: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.directionsBlue },
  cancel: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.brandRedDark },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.background,
    borderTopLeftRadius: scale(18), borderTopRightRadius: scale(18),
    paddingHorizontal: spacing.lg, paddingTop: verticalScale(10),
  },
  handle: { alignSelf: 'center', width: scale(90), height: scale(4), borderRadius: scale(3), backgroundColor: '#C9CDD2', marginBottom: verticalScale(14) },
  sheetTitle: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack, marginBottom: verticalScale(12) },
  confirm: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(18) },
  confirmDisabled: { backgroundColor: '#A9BEE6' },
  confirmText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  pressed: { opacity: 0.85 },
});
