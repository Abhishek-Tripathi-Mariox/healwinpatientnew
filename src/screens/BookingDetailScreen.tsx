import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { bookingsApi, toUiBooking, UiBooking, timelineLabel, fmtTimelineTime } from '../api/bookings';
import { reverseGeocode } from '../services/geo';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BookingDetail'>;
type Rt = RouteProp<RootStackParamList, 'BookingDetail'>;

// Pull "lat, lng" out of a label like "Pinned location (26.84670, 80.94620)".
const coordsOf = (a?: string): { lat: number; lng: number } | null => {
  const m = a?.match(/(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};
// A bare-coordinates label (no real place name) we should reverse-geocode.
const isCoordsLabel = (a?: string): a is string => !!a && /^pinned location/i.test(a) && !!coordsOf(a);

export const BookingDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const [booking, setBooking] = useState<UiBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  // Reverse-geocoded place names for older bookings whose pickup/drop were saved
  // as raw "Pinned location (lat, lng)" labels — keyed by the original label.
  const [resolvedAddr, setResolvedAddr] = useState<Record<string, string>>({});

  const submitRating = async (stars: number) => {
    if (!booking || ratingBusy) return;
    setRatingBusy(true);
    try {
      const updated = await bookingsApi.rate(booking.id, stars);
      setBooking(toUiBooking(updated as any));
    } catch (e: any) {
      Alert.alert('Could not submit rating', e?.message || 'Please try again.');
    } finally {
      setRatingBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    bookingsApi
      .detail(params.id)
      .then((b) => active && setBooking(toUiBooking(b)))
      .catch(() => active && setBooking(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.id]);

  // Turn any raw-coordinate pickup/drop labels into real place names for
  // display (reverse geocode runs server-side). Newer bookings already store a
  // proper address, so this only kicks in for older coords-only ones.
  useEffect(() => {
    if (!booking) return;
    let active = true;
    const labels = [booking.pickupAddress, booking.dropAddress].filter(isCoordsLabel);
    labels.forEach(async (label) => {
      const c = coordsOf(label);
      if (!c) return;
      const name = await reverseGeocode(c.lat, c.lng);
      if (active && name) setResolvedAddr((prev) => ({ ...prev, [label]: name }));
    });
    return () => {
      active = false;
    };
  }, [booking]);

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Booking Details" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Booking Details" onBack={() => navigation.goBack()} />
        <Text style={styles.empty}>Booking not found</Text>
      </View>
    );
  }

  const cancelled = booking.status === 'cancelled';
  const by = String(booking.cancelledBy || '').toLowerCase();
  // Empty when we don't know who cancelled — the title then reads just
  // "Cancelled" instead of the confusing "Cancelled by Cancelled".
  const cancelledByLabel =
    by === 'patient' || by === 'user'
      ? 'You'
      : by === 'admin' || by === 'system' || by === 'control room'
        ? 'Control room'
        : by === 'driver'
          ? 'Driver'
          : '';

  // Prefer a reverse-geocoded place name over a raw-coords label when we have
  // one; otherwise show the stored address. Drop the "Move the map…" placeholder.
  const display = (a?: string) => (a && resolvedAddr[a]) || a;
  const realAddr = (a?: string) => (a && !/^move the map/i.test(a) ? a : undefined);
  const pickupAddress = realAddr(display(booking.pickupAddress));
  const dropAddress = realAddr(display(booking.dropAddress));

  const rows: [string, string][] = [
    ['Booking ID', booking.id],
    ['Type', booking.type],
    ['Date & time', booking.date],
    ...(pickupAddress ? [['Pickup', pickupAddress] as [string, string]] : []),
    ...(dropAddress ? [['Drop', dropAddress] as [string, string]] : []),
    ...(booking.recipientName ? [['Booked for', booking.recipientName] as [string, string]] : []),
    ...(booking.recipientPhone ? [['Contact', booking.recipientPhone] as [string, string]] : []),
    ['Driver', booking.driverName],
    ['Vehicle', booking.vehicleNumber ?? '—'],
    ['Status', booking.status[0].toUpperCase() + booking.status.slice(1)],
  ];

  const payable = cancelled ? booking.cancellationCharge : booking.amount;

  // Patient can cancel an in-progress booking (not completed/cancelled).
  const canCancel = !cancelled && booking.rawStatus !== 'completed';
  const willCharge = ['assigned', 'arrived', 'on_trip'].includes(booking.rawStatus);

  const onCancel = () => {
    if (cancelling || !booking) return;
    Alert.alert(
      'Cancel booking?',
      willCharge
        ? 'An ambulance is already assigned, so a cancellation charge will apply.'
        : 'Are you sure you want to cancel this booking? No charge applies yet.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const updated = await bookingsApi.cancel(booking.id);
              const ui = toUiBooking(updated as any);
              setBooking(ui);
              if (ui.cancellationCharge > 0) {
                Alert.alert('Booking cancelled', `A cancellation charge of ₹${ui.cancellationCharge} applies.`);
              }
            } catch {
              Alert.alert('Could not cancel', 'Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Booking Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(40) }]}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.id}>{booking.type}</Text>
          <Text style={styles.sub}>ID: {booking.id}</Text>
          <View style={styles.divider} />
          {rows.map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.k}>{k}</Text>
              <Text style={styles.v} numberOfLines={2}>{v}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          {!cancelled && booking.discountAmount > 0 && (
            <>
              <View style={styles.row}>
                <Text style={styles.k}>Fare</Text>
                <Text style={styles.v}>₹{booking.grossAmount ?? booking.amount + booking.discountAmount}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.k}>Promo{booking.promoCode ? ` (${booking.promoCode})` : ''}</Text>
                <Text style={[styles.v, styles.discountV]}>−₹{booking.discountAmount}</Text>
              </View>
            </>
          )}
          <View style={styles.row}>
            <Text style={styles.totalK}>{cancelled ? 'Trip fare' : 'Amount'}</Text>
            <Text style={[styles.totalV, cancelled && styles.struck]}>₹{booking.amount}</Text>
          </View>
          {cancelled && (
            <View style={styles.row}>
              <Text style={styles.totalK}>Cancellation charge</Text>
              <Text style={[styles.totalV, booking.cancellationCharge > 0 ? styles.charge : undefined]}>
                {booking.cancellationCharge > 0 ? `₹${booking.cancellationCharge}` : 'No charge'}
              </Text>
            </View>
          )}
        </View>

        {/* What happened — lifecycle timeline */}
        {booking.timeline.length > 0 && (
          <View style={[styles.card, styles.cardGap, cardShadow]}>
            <Text style={styles.sectionTitle}>What happened</Text>
            {booking.timeline.map((s, i) => {
              const last = i === booking.timeline.length - 1;
              const isCancel = s.status === 'cancelled';
              return (
                <View key={`${s.status}-${i}`} style={styles.tlRow}>
                  <View style={styles.tlRail}>
                    <View style={[styles.tlDot, isCancel && styles.tlDotCancel]} />
                    {!last && <View style={styles.tlLine} />}
                  </View>
                  <View style={styles.tlBody}>
                    <Text style={[styles.tlLabel, isCancel && styles.tlLabelCancel]}>
                      {timelineLabel(s.status)}
                    </Text>
                    {!!s.at && <Text style={styles.tlTime}>{fmtTimelineTime(s.at)}</Text>}
                    {!!s.note && <Text style={styles.tlNote}>{s.note}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Cancellation summary */}
        {cancelled && (
          <View style={[styles.cancelCard, cardShadow]}>
            <Text style={styles.cancelTitle}>
              {cancelledByLabel ? `Cancelled by ${cancelledByLabel}` : 'Cancelled'}
            </Text>
            {!!booking.cancelReason && <Text style={styles.cancelReason}>{booking.cancelReason}</Text>}
            {booking.cancellationCharge > 0 ? (
              <Text style={styles.cancelChargeNote}>
                A cancellation charge of ₹{booking.cancellationCharge} applies because an ambulance was
                already assigned.
              </Text>
            ) : (
              <Text style={styles.cancelChargeNote}>No cancellation charge was applied.</Text>
            )}
          </View>
        )}

        {/* Rate the completed trip */}
        {booking.rawStatus === 'completed' && (
          <View style={[styles.card, styles.cardGap, cardShadow]}>
            <Text style={styles.sectionTitle}>{booking.rating ? 'Your rating' : 'Rate this trip'}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} disabled={!!booking.rating || ratingBusy} onPress={() => submitRating(s)} hitSlop={4}>
                  <Text style={[styles.star, s <= (booking.rating || 0) && styles.starOn]}>★</Text>
                </Pressable>
              ))}
            </View>
            {!booking.rating && <Text style={styles.rateHint}>Tap a star to rate the crew and service.</Text>}
          </View>
        )}

        {payable > 0 && (
          <Pressable
            onPress={() =>
              navigation.navigate('Payment', {
                amount: payable,
                title: cancelled ? 'Cancellation charge' : `${booking.type} booking`,
              })
            }
            style={({ pressed }) => [styles.pay, pressed && styles.pressed]}
          >
            <Text style={styles.payText}>
              {cancelled ? `Pay cancellation charge ₹${payable}` : `Pay ₹${payable}`}
            </Text>
          </Pressable>
        )}

        {canCancel && (
          <Pressable
            onPress={onCancel}
            disabled={cancelling}
            style={({ pressed }) => [styles.cancelBtn, (pressed || cancelling) && styles.pressed]}
          >
            <Text style={styles.cancelBtnText}>{cancelling ? 'Cancelling…' : 'Cancel booking'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(15), color: colors.inkMuted, marginTop: verticalScale(40) },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(18) },
  cardGap: { marginTop: verticalScale(14) },
  id: { fontFamily: fonts.bold, fontSize: scale(17), color: colors.textBlack },
  sub: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(4) },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E2E2', marginVertical: verticalScale(14) },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(7) },
  k: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
  v: { flex: 1, textAlign: 'right', marginLeft: scale(12), fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack },
  totalK: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack },
  totalV: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textBlack },
  struck: { textDecorationLine: 'line-through', color: colors.inkMuted, fontFamily: fonts.medium },
  discountV: { color: '#0B7A3B', fontFamily: fonts.semiBold },
  charge: { color: colors.brandRedDark },
  // Timeline
  sectionTitle: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack, marginBottom: verticalScale(12) },
  tlRow: { flexDirection: 'row' },
  tlRail: { width: scale(22), alignItems: 'center' },
  tlDot: { width: scale(11), height: scale(11), borderRadius: scale(6), backgroundColor: colors.directionsBlue, marginTop: verticalScale(3) },
  tlDotCancel: { backgroundColor: colors.brandRedDark },
  tlLine: { flex: 1, width: 2, backgroundColor: '#E2E2E2', marginVertical: verticalScale(2) },
  tlBody: { flex: 1, paddingBottom: verticalScale(14), marginLeft: scale(10) },
  tlLabel: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.textBlack },
  tlLabelCancel: { color: colors.brandRedDark },
  tlTime: { fontFamily: fonts.regular, fontSize: scale(11), color: colors.inkMuted, marginTop: verticalScale(2) },
  tlNote: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.textBlack, marginTop: verticalScale(3) },
  // Cancellation card
  stars: { flexDirection: 'row', gap: scale(8) },
  star: { fontSize: scale(30), color: '#D7DCE2' },
  starOn: { color: '#F5A623' },
  rateHint: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(8) },
  cancelCard: { backgroundColor: '#FCECEC', borderRadius: radius.card, padding: scale(16), marginTop: verticalScale(14) },
  cancelTitle: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.brandRedDark },
  cancelReason: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack, marginTop: verticalScale(6) },
  cancelChargeNote: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(8) },
  pay: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(20) },
  pressed: { opacity: 0.85 },
  payText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  cancelBtn: {
    height: verticalScale(50),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: colors.brandRedDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
  },
  cancelBtnText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.brandRedDark },
});
