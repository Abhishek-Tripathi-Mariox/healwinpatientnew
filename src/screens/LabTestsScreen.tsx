import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppAlert } from '../services/appAlert';
import { CheckoutCancelled, payFor } from '../services/checkout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader, SlotPicker, type Slot, type SlotSelection } from '../components';
import { CheckCircleIcon, FlaskIcon, SearchIcon } from '../components/icons';
import { labApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

interface LabTest {
  id: string;
  name: string;
  price: number;
  mrp: number;
  sampleType: string;
  reportHours: number;
}

const mapTest = (t: any): LabTest => ({
  id: t._id || t.id,
  name: t.name || '',
  price: t.price ?? 0,
  mrp: t.mrp ?? t.price ?? 0,
  sampleType: t.sampleType || '—',
  reportHours: t.reportHours ?? 24,
});

type Nav = NativeStackNavigationProp<RootStackParamList, 'LabTests'>;

export const LabTestsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [booking, setBooking] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<SlotSelection | null>(null);

  const fetchSlots = React.useCallback((date: string) => labApi.slots(date) as Promise<Slot[]>, []);

  useEffect(() => {
    labApi
      .tests()
      .then((list) => setTests(list.map(mapTest).filter((t) => t.id)))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tests.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  const chosen = tests.filter((t) => selected[t.id]);
  const total = chosen.reduce((n, t) => n + t.price, 0);

  /**
   * Book and pay.
   *
   * The button has always said "Book & Pay"; until now it only booked. The
   * server creates the booking and prices it in one call, and the checkout it
   * hands back is opened straight away — so the slot and the payment are one
   * action, the way the label promised.
   */
  const bookTests = async () => {
    if (booking || chosen.length === 0 || !picked) return;
    setBooking(true);
    const slotLabel = picked.label;
    try {
      const created = await labApi.book({
        testIds: chosen.map((t) => t.id),
        date: picked.date,
        slot: picked.time,
      });
      setPickerOpen(false);
      setPicked(null);
      setSelected({});

      const res = await payFor({
        purpose: 'lab_booking',
        refId: created._id,
        order: created.checkout ?? null,
        description: 'Lab tests',
      });
      AppAlert.alert(
        'Booking confirmed',
        res.pending
          ? `${res.pending} Home sample collection is scheduled for ${slotLabel}.`
          : `Paid. Home sample collection scheduled for ${slotLabel}.`,
      );
    } catch (e: any) {
      if (e instanceof CheckoutCancelled) {
        // The booking exists and is unpaid — say where to finish it rather
        // than leaving the customer thinking nothing happened.
        AppAlert.alert(
          'Booking saved — payment pending',
          'Your slot is held. Complete the payment from Lab Tests in your bookings to confirm it.',
        );
        return;
      }
      AppAlert.alert('Could not book', e?.message || 'Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Lab Tests" onBack={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <View style={[styles.search, cardShadow]}>
          <SearchIcon size={scale(20)} color="#979797" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tests (e.g. CBC, Lipid, Thyroid)"
            placeholderTextColor="#979797"
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(110) }]}>
        {loading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No tests available</Text>
        ) : (
          filtered.map((t) => {
            const on = !!selected[t.id];
            return (
              <Pressable
                key={t.id}
                onPress={() => setSelected((s) => ({ ...s, [t.id]: !s[t.id] }))}
                style={[styles.card, cardShadow]}
              >
                <View style={styles.flask}>
                  <FlaskIcon size={scale(22)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.meta}>Sample: {t.sampleType}  ·  Report in {t.reportHours}h</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{t.price}</Text>
                    <Text style={styles.mrp}>₹{t.mrp}</Text>
                  </View>
                </View>
                {on ? (
                  <CheckCircleIcon size={scale(24)} color={colors.creditGreen} />
                ) : (
                  <View style={styles.add}><Text style={styles.addText}>Add</Text></View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {chosen.length > 0 && (
        <View style={[styles.bar, { paddingBottom: insets.bottom + verticalScale(10) }]}>
          <View>
            <Text style={styles.barCount}>{chosen.length} test(s)</Text>
            <Text style={styles.barTotal}>₹{total}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.book, pressed && styles.pressed]} onPress={() => setPickerOpen(true)}>
            <Text style={styles.bookText}>Book & Pay</Text>
          </Pressable>
        </View>
      )}

      {/* Sample-collection slot picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + verticalScale(16) }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Pick a sample collection time</Text>
          <SlotPicker fetchSlots={fetchSlots} value={picked} onChange={setPicked} />
          <Pressable
            disabled={!picked || booking}
            onPress={bookTests}
            style={({ pressed }) => [styles.confirm, (!picked || booking) && styles.bookDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.bookText}>
              {booking ? 'Booking…' : picked ? `Confirm — ${picked.label}` : 'Select a slot'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: verticalScale(10) },
  search: { flexDirection: 'row', alignItems: 'center', gap: scale(10), height: verticalScale(46), backgroundColor: colors.surface, borderRadius: scale(14), paddingHorizontal: scale(14) },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack, padding: 0 },
  list: { paddingHorizontal: spacing.lg, gap: verticalScale(12) },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(40) },
  card: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14) },
  flask: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: '#EAF1FE', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  meta: { fontFamily: fonts.regular, fontSize: scale(11), color: colors.inkMuted, marginTop: verticalScale(4) },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: verticalScale(6) },
  price: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textBlack },
  mrp: { fontFamily: fonts.regular, fontSize: scale(12), color: '#A6ADB4', textDecorationLine: 'line-through' },
  add: { paddingHorizontal: scale(14), height: verticalScale(30), borderRadius: scale(8), borderWidth: 1, borderColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.directionsBlue },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingHorizontal: spacing.lg, paddingTop: verticalScale(12) },
  barCount: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.inkMuted },
  barTotal: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack },
  book: { paddingHorizontal: scale(28), height: verticalScale(48), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  bookText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  bookDisabled: { backgroundColor: '#A9BEE6' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,20,24,0.4)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.background,
    borderTopLeftRadius: scale(26), borderTopRightRadius: scale(26),
    paddingHorizontal: spacing.lg, paddingTop: verticalScale(12),
    ...cardShadow,
  },
  handle: { alignSelf: 'center', width: scale(44), height: scale(5), borderRadius: scale(3), backgroundColor: '#D8DBE0', marginBottom: verticalScale(16) },
  sheetTitle: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack, marginBottom: verticalScale(12) },
  confirm: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(18) },
});
