import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { bookingsApi, toUiBooking, UiBooking, timelineLabel, fmtTimelineTime } from '../api/bookings';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BookingDetail'>;
type Rt = RouteProp<RootStackParamList, 'BookingDetail'>;

export const BookingDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const [booking, setBooking] = useState<UiBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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
  const cancelledByLabel =
    booking.cancelledBy === 'patient'
      ? 'You'
      : booking.cancelledBy === 'admin' || booking.cancelledBy === 'system'
        ? 'Control room'
        : booking.cancelledBy === 'driver'
          ? 'Driver'
          : 'Cancelled';

  const rows: [string, string][] = [
    ['Booking ID', booking.id],
    ['Type', booking.type],
    ['Date & time', booking.date],
    ...(booking.pickupAddress ? [['Pickup', booking.pickupAddress] as [string, string]] : []),
    ...(booking.dropAddress ? [['Drop', booking.dropAddress] as [string, string]] : []),
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
            <Text style={styles.cancelTitle}>Cancelled by {cancelledByLabel}</Text>
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
