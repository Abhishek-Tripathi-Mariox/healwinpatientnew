import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader, SlotPicker, type Slot, type SlotSelection } from '../components';
import { DoctorIcon, StarIcon } from '../components/icons';
import { doctorsApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

interface DoctorDetail {
  id: string; name: string; speciality: string; experienceYears: number;
  rating: number; reviewCount: number; fee: number;
}
type Nav = NativeStackNavigationProp<RootStackParamList, 'DoctorDetail'>;
type Rt = RouteProp<RootStackParamList, 'DoctorDetail'>;

export const DoctorDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<SlotSelection | null>(null);
  const [booking, setBooking] = useState(false);

  const fetchSlots = React.useCallback(
    (date: string) => doctorsApi.slots(params.id, date) as Promise<Slot[]>,
    [params.id],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await doctorsApi.detail(params.id);
        if (!active) return;
        setDoctor({
          id: d._id || d.id,
          name: d.name || '',
          speciality: d.speciality || '',
          experienceYears: d.experienceYears ?? 0,
          rating: d.rating ?? 0,
          reviewCount: d.reviewCount ?? 0,
          fee: d.consultationFee ?? d.fee ?? 0,
        });
      } catch {
        if (active) setDoctor(null);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  const bookConsult = async () => {
    if (booking || !picked) return;
    setBooking(true);
    try {
      await doctorsApi.book({ doctorId: params.id, date: picked.date, slot: picked.time, teleconsult: true });
      Alert.alert('Appointment booked', `Your consultation is scheduled for ${picked.label}.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not book', e?.message || 'Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Doctor Details" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Doctor Details" onBack={() => navigation.goBack()} />
        <Text style={styles.empty}>Doctor not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Doctor Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(110) }]}>
        <View style={[styles.card, cardShadow]}>
          <View style={styles.avatar}>
            <DoctorIcon size={scale(34)} />
          </View>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.spec}>{doctor.speciality}</Text>
          <View style={styles.metaRow}>
            <StarIcon size={scale(14)} />
            <Text style={styles.meta}>{doctor.rating.toFixed(1)} ({doctor.reviewCount})</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.meta}>{doctor.experienceYears} yrs exp</Text>
          </View>
        </View>

        <Text style={styles.section}>Pick an appointment slot</Text>
        <SlotPicker fetchSlots={fetchSlots} value={picked} onChange={setPicked} />
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + verticalScale(10) }]}>
        <Text style={styles.fee}>₹{doctor.fee}</Text>
        <Pressable
          disabled={booking || !picked}
          onPress={bookConsult}
          style={({ pressed }) => [styles.book, !picked && styles.bookDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.bookText}>
            {booking ? 'Booking…' : !picked ? 'Select a time slot' : 'Book Consultation'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(15), color: colors.inkMuted, marginTop: verticalScale(40) },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(20) },
  avatar: { width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: '#EAF1FE', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack, marginTop: verticalScale(12) },
  spec: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted, marginTop: verticalScale(4) },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(8) },
  meta: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.metaGray },
  dot: { color: colors.metaGray },
  section: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack, marginTop: verticalScale(24), marginBottom: verticalScale(12) },
  noSlots: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  slot: { paddingHorizontal: scale(16), height: verticalScale(40), borderRadius: scale(10), borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  slotActive: { backgroundColor: colors.directionsBlue, borderColor: colors.directionsBlue },
  slotText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack },
  slotTextActive: { color: colors.textWhite },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingHorizontal: spacing.lg, paddingTop: verticalScale(12) },
  fee: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack },
  book: { paddingHorizontal: scale(24), height: verticalScale(48), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  bookDisabled: { backgroundColor: '#A9BEE6' },
  pressed: { opacity: 0.85 },
  bookText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
});
