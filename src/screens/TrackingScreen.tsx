import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline as MapPolyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { BackButton } from '../components';
import { ChevronDownIcon, MapPinIcon, PersonIcon, PhoneIcon, RebookIcon } from '../components/icons';
import { rideStore, useActiveRide } from '../state/rideStore';
import { socketService } from '../services/socket';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

import type { FareBreakdown } from '../api/ambulance';

interface Charge {
  label: string;
  qty: string;
  amount: string;
}

const money = (n?: number | null) =>
  n != null ? Math.round(n).toLocaleString('en-IN') : '0';

/**
 * Build the price-breakup rows from the real, server-computed fare breakdown.
 * Only non-zero lines are shown so the receipt stays clean.
 */
const chargesFrom = (b?: FareBreakdown | null): Charge[] => {
  if (!b) return [];
  const rows: Charge[] = [];
  if (b.baseFare) rows.push({ label: 'Base Fare', qty: '', amount: money(b.baseFare) });
  if (b.distanceCharge) rows.push({ label: 'Distance Charge', qty: '', amount: money(b.distanceCharge) });
  if (b.timeCharge) rows.push({ label: 'Time Charge', qty: '', amount: money(b.timeCharge) });
  if (b.surgeCharge) rows.push({ label: 'Surge', qty: '', amount: money(b.surgeCharge) });
  if (b.addonCharges) rows.push({ label: 'Add-ons', qty: '', amount: money(b.addonCharges) });
  if (b.loadingUnloadingCharge) rows.push({ label: 'Loading / Unloading', qty: '', amount: money(b.loadingUnloadingCharge) });
  if (b.tollCharges) rows.push({ label: 'Tolls', qty: '', amount: money(b.tollCharges) });
  if (b.gstAmount) rows.push({ label: `GST${b.gstPercentage ? ` (${b.gstPercentage}%)` : ''}`, qty: '', amount: money(b.gstAmount) });
  if (b.totalDiscount) rows.push({ label: 'Discount', qty: '', amount: `-${money(b.totalDiscount)}` });
  return rows;
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tracking'>;

export const TrackingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [expanded, setExpanded] = useState(false);
  const ride = useActiveRide();
  const mapRef = useRef<MapView | null>(null);

  // Refresh the active ride on open and poll while tracking (poll is the
  // fallback; the live socket push below updates distance in real time).
  useEffect(() => {
    rideStore.loadActive().catch(() => undefined);
    const t = setInterval(() => rideStore.loadActive().catch(() => undefined), 15000);

    // The moment an ambulance is dispatched/assigned, the backend emits
    // `booking:accepted` (with the dispatchId + OTP) — reload immediately so
    // the patient sees live tracking + OTP without waiting for the 15s poll.
    void socketService.connect();
    const offAccepted = socketService.on('booking:accepted', () =>
      rideStore.loadActive().catch(() => undefined),
    );
    return () => {
      clearInterval(t);
      offAccepted();
    };
  }, []);

  // Live ambulance position → recompute distance/ETA the instant it moves.
  const bookingId = ride?.bookingId;
  useEffect(() => {
    if (!bookingId) return;
    void socketService.connect();
    socketService.trackBooking(bookingId);
    const onLoc = (d: any) => {
      // Event carries requestId (booking) or dispatchId (SOS) — match either.
      const eid = d?.requestId || d?.dispatchId;
      if (eid && eid !== bookingId) return;
      if (typeof d?.lat === 'number' && typeof d?.lng === 'number') {
        rideStore.applyLocation(d.lat, d.lng, d.distanceKm ?? null, d.etaMinutes ?? null);
      }
    };
    const offA = socketService.on('ambulance:location', onLoc);
    const offD = socketService.on('driver:location', (d: any) =>
      onLoc(d?.location ? { ...d, ...d.location } : d),
    );
    return () => {
      socketService.stopTrackBooking(bookingId);
      offA();
      offD();
    };
  }, [bookingId]);

  // Keep the camera on the live ambulance — and frame the pickup too when we
  // have both — every time the position updates over the socket.
  const amb = ride?.ambulance;
  const pickup = ride?.pickup;
  useEffect(() => {
    if (!amb?.lat || !amb?.lng) return;
    if (pickup?.lat && pickup?.lng) {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: amb.lat, longitude: amb.lng },
          { latitude: pickup.lat, longitude: pickup.lng },
        ],
        { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true },
      );
    } else {
      mapRef.current?.animateToRegion(
        { latitude: amb.lat, longitude: amb.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    }
  }, [amb?.lat, amb?.lng, pickup?.lat, pickup?.lng]);

  const distanceLabel = ride?.distanceKm != null ? `${ride.distanceKm} km away` : null;
  const etaLabel =
    ride?.eta && ride.eta !== '—'
      ? `Arriving in ${ride.eta}${distanceLabel ? ` · ${distanceLabel}` : ''}`
      : 'Locating ambulance…';
  const driverName = ride?.driver || 'Assigning…';
  const plate = ride?.vehicleNumber || '—';
  const otp = ride?.otp || '----';
  const pickupAddr = ride?.pickup?.address || 'Your location';

  // Real, server-computed fare. No hardcoded charges.
  const charges = chargesFrom(ride?.fareBreakdown);
  const grandTotal = ride?.amount ?? ride?.fareBreakdown?.finalFare ?? null;
  const totalLabel = grandTotal != null ? `₹${money(grandTotal)}` : null;

  // A real ambulance is only "assigned" once a driver + vehicle are attached.
  // Until then we must NOT show the (dummy-looking) tracking map/driver card —
  // instead show a "finding an ambulance" waiting state.
  const assigned =
    !!ride &&
    ride.driver !== 'Assigning…' &&
    !!ride.vehicleNumber &&
    ride.status !== 'pending' &&
    ride.status !== 'searching';

  if (!assigned) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Finding an ambulance</Text>
        </View>
        <View style={styles.waitWrap}>
          <View style={styles.pulse}>
            <MapPinIcon size={scale(40)} />
          </View>
          <Text style={styles.waitTitle}>
            {ride ? 'Request sent — finding the nearest ambulance' : 'No active request'}
          </Text>
          <Text style={styles.waitSub}>
            {ride
              ? "We'll notify you the moment an ambulance is assigned. Live tracking opens then."
              : 'Book an ambulance or raise an SOS to start tracking.'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.waitBtn, pressed && { opacity: 0.85 }]}
            onPress={() => rideStore.loadActive().catch(() => undefined)}
          >
            <Text style={styles.waitBtnText}>Refresh</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(24) }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Ambulance is on the way</Text>
        </View>

        {/* Live map: real ambulance + pickup markers, camera follows movement. */}
        <View style={styles.mapArea}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: amb?.lat ?? pickup?.lat ?? 26.8467,
              longitude: amb?.lng ?? pickup?.lng ?? 80.9462,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {amb?.lat != null && amb?.lng != null && (
              <Marker coordinate={{ latitude: amb.lat, longitude: amb.lng }} title="Ambulance" description={driverName}>
                <View style={styles.ambMarker}>
                  <MapPinIcon size={scale(22)} color={colors.textWhite} />
                </View>
              </Marker>
            )}
            {pickup?.lat != null && pickup?.lng != null && (
              <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" pinColor="#2E9E5B" />
            )}
            {amb?.lat != null && pickup?.lat != null && (
              <MapPolyline
                coordinates={[
                  { latitude: amb.lat, longitude: amb.lng },
                  { latitude: pickup.lat as number, longitude: pickup.lng as number },
                ]}
                strokeColor="#1A1C1D"
                strokeWidth={3}
              />
            )}
          </MapView>

          {/* Status chip */}
          <View style={styles.statusWrap}>
            <View style={[styles.statusChip, cardShadow]}>
              <Text style={styles.statusText}>{etaLabel}</Text>
            </View>
            <Pressable
              style={[styles.refreshBtn, cardShadow]}
              onPress={() => rideStore.loadActive().catch(() => undefined)}
            >
              <RebookIcon size={scale(15)} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Details sheet */}
        <View style={styles.sheet}>
          {/* Pickup */}
          <View style={styles.pickupRow}>
            <MapPinIcon size={scale(20)} />
            <Text style={styles.pickupTitle}>Pickup</Text>
            {!!distanceLabel && (
              <View style={styles.miniChip}>
                <Text style={styles.miniChipText}>{distanceLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.pickupAddrRow}>
            <View style={styles.smallDot} />
            <Text style={styles.pickupAddr}>{pickupAddr}</Text>
          </View>

          <View style={styles.divider} />

          {/* Driver */}
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <PersonIcon size={scale(28)} color={colors.textPrimary} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverLabel}>Driver Details</Text>
              <View style={styles.driverLine}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.plate}>
                  <Text style={styles.plateText}>{plate}</Text>
                </View>
              </View>
            </View>
            <Pressable style={[styles.callBtn, cardShadow]} onPress={() => {}}>
              <PhoneIcon size={scale(18)} color={colors.callGreen} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Payment */}
          <View style={styles.payRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>
                {totalLabel ? `Payment of ${totalLabel} pending` : 'Fare will be confirmed on assignment'}
              </Text>
              <Text style={styles.paySub}>Pay now, or pay the crew using Cash/UPI</Text>
            </View>
            {!expanded && totalLabel && (
              <View style={styles.miniChip}>
                <Text style={styles.miniChipText}>Pay Now</Text>
              </View>
            )}
          </View>

          {/* View price breakup toggle */}
          <View style={styles.breakupToggleRow}>
            <Pressable style={styles.breakupToggle} onPress={() => setExpanded((v) => !v)}>
              <View style={styles.toggleCircle}>
                <ChevronDownIcon size={scale(16)} color={colors.textWhite} />
              </View>
              <Text style={styles.breakupText}>view price breakup</Text>
            </Pressable>
            <Text style={styles.otp}>OTP : {otp}</Text>
          </View>

          {/* Expanded breakup */}
          {expanded && (
            <View style={[styles.breakupCard, cardShadow]}>
              <Text style={styles.breakupTitle}>Ambulance Charge</Text>
              {charges.length === 0 ? (
                <Text style={styles.chargeLabel}>Fare is being calculated…</Text>
              ) : (
                charges.map((c) => (
                  <View key={c.label} style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>{c.label}</Text>
                    <Text style={styles.chargeAmount}>
                      {c.qty ? `${c.qty}    ` : ''}
                      {c.amount}
                    </Text>
                  </View>
                ))
              )}
              <View style={[styles.chargeRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalAmount}>{totalLabel ?? '—'}</Text>
              </View>
            </View>
          )}

          {expanded && totalLabel && (
            <Pressable style={styles.payNow} onPress={() => {}}>
              <Text style={styles.payNowText}>Pay {totalLabel}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  waitWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: verticalScale(14) },
  pulse: {
    width: scale(96), height: scale(96), borderRadius: scale(48),
    backgroundColor: colors.avatarCircle, alignItems: 'center', justifyContent: 'center',
  },
  waitTitle: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack, textAlign: 'center' },
  waitSub: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted, textAlign: 'center', lineHeight: scale(19) },
  waitBtn: {
    marginTop: verticalScale(8), paddingHorizontal: scale(26), height: verticalScale(46),
    borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center',
  },
  waitBtnText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(20),
    letterSpacing: -0.3,
    color: colors.textBlack,
    marginLeft: spacing.md,
  },

  mapArea: {
    height: verticalScale(340),
    backgroundColor: colors.avatarCircle,
  },
  pin: { position: 'absolute' },
  ambMarker: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.textWhite,
  },
  statusWrap: {
    position: 'absolute',
    top: verticalScale(8),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: spacing.lg,
  },
  statusChip: {
    backgroundColor: colors.surface,
    borderRadius: scale(5),
    paddingHorizontal: scale(16),
    height: verticalScale(27),
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.trackInk,
  },
  refreshBtn: {
    width: scale(29),
    height: verticalScale(27),
    borderRadius: scale(5),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: {
    marginTop: -verticalScale(18),
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: '#DDD7D7',
    borderRadius: scale(18),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(18),
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  pickupTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: scale(17),
    color: colors.trackInk,
  },
  miniChip: {
    backgroundColor: colors.chipPinkBg,
    borderRadius: scale(4),
    paddingHorizontal: scale(12),
    height: verticalScale(24),
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  miniChipText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.brandRedDark,
  },
  pickupAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginLeft: scale(5),
    marginTop: verticalScale(8),
  },
  smallDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#E2342B',
  },
  pickupAddr: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.addrTitle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D9D9D9',
    marginVertical: verticalScale(16),
    marginHorizontal: -spacing.lg,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: colors.avatarCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: scale(14),
  },
  driverLabel: {
    fontFamily: fonts.semiBold,
    fontSize: scale(17),
    color: colors.textBlack,
  },
  driverLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(4),
  },
  driverName: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.addrTitle,
  },
  plate: {
    backgroundColor: colors.plateBg,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
  },
  plateText: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: '#5F5F5F',
  },
  callBtn: {
    width: scale(35),
    height: scale(35),
    borderRadius: scale(8),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  payTitle: {
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.trackInk,
  },
  paySub: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.trackInk,
    marginTop: verticalScale(4),
  },
  breakupToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(16),
  },
  breakupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  toggleCircle: {
    width: scale(25),
    height: scale(25),
    borderRadius: scale(13),
    backgroundColor: colors.textBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakupText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  otp: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.textBlack,
  },

  breakupCard: {
    backgroundColor: '#FFFEFE',
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: scale(15),
    padding: scale(20),
    marginTop: verticalScale(18),
  },
  breakupTitle: {
    fontFamily: fonts.bold,
    fontSize: scale(22),
    color: colors.textBlack,
    marginBottom: verticalScale(16),
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E6E6',
  },
  chargeLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(16),
    color: '#6A6969',
  },
  chargeAmount: {
    fontFamily: fonts.medium,
    fontSize: scale(16),
    color: '#6A6969',
  },
  totalRow: {
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(16),
    color: colors.textBlack,
  },
  totalAmount: {
    fontFamily: fonts.medium,
    fontSize: scale(16),
    color: colors.textBlack,
  },
  payNow: {
    height: verticalScale(47),
    borderRadius: scale(15),
    backgroundColor: colors.payGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(18),
    marginBottom: verticalScale(8),
  },
  payNowText: {
    fontFamily: fonts.bold,
    fontSize: scale(18),
    color: colors.textWhite,
  },
});
