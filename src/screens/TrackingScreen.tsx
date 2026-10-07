import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline as MapPolyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Video from 'react-native-video';

import { BackButton } from '../components';
import { ChevronDownIcon, MapPinIcon, PersonIcon, PhoneIcon, RebookIcon } from '../components/icons';
import { rideStore, useActiveRide } from '../state/rideStore';
import { ambulanceApi } from '../api/ambulance';
import { socketService } from '../services/socket';
import { AppAlert } from '../services/appAlert';
import { CheckoutCancelled, payFor } from '../services/checkout';
import { useProfile } from '../state/profileStore';
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
  const [paying, setPaying] = useState(false);
  const profile = useProfile();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
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
    const reload = () => rideStore.loadActive().catch(() => undefined);
    const offAccepted = socketService.on('booking:accepted', reload);
    // Control-room edits (in-transit expenses added, payment marked) emit
    // booking:status — reload so the new bill shows without waiting for the poll.
    const offStatus = socketService.on('booking:status', reload);
    return () => {
      clearInterval(t);
      offAccepted();
      offStatus();
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

  // Keep the camera live on the ambulance. Before pickup, frame both the
  // ambulance and the pickup point so the patient can gauge how far it still
  // has to come; once the patient is onboard (ON_TRIP), stop re-including the
  // now-irrelevant pickup point — that was forcing the camera to zoom out to
  // fit it as the ambulance drove away, which read as the map not actually
  // following the ambulance. From ON_TRIP it just follows the ambulance.
  const amb = ride?.ambulance;
  const pickup = ride?.pickup;
  const drop = ride?.drop;
  const onTripCam = (ride?.status || '').toLowerCase() === 'on_trip';
  useEffect(() => {
    if (!amb?.lat || !amb?.lng) return;
    if (!onTripCam && pickup?.lat && pickup?.lng) {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: amb.lat, longitude: amb.lng },
          { latitude: pickup.lat, longitude: pickup.lng },
        ],
        { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true },
      );
    } else {
      mapRef.current?.animateToRegion(
        { latitude: amb.lat, longitude: amb.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        600,
      );
    }
  }, [amb?.lat, amb?.lng, pickup?.lat, pickup?.lng, onTripCam]);

  const distanceLabel = ride?.distanceKm != null ? `${ride.distanceKm} km away` : null;
  const etaLabel =
    ride?.eta && ride.eta !== '—'
      ? `Arriving in ${ride.eta}${distanceLabel ? ` · ${distanceLabel}` : ''}`
      : 'Locating ambulance…';
  const driverName = ride?.driver || 'Assigning…';
  const plate = ride?.vehicleNumber || '—';
  // SOS dispatches skip the pickup-OTP step (unlike a proper "Book Ambulance"
  // request) — the backend never mints one for SOS, so hide the row entirely
  // rather than showing a permanent "----" placeholder.
  const otp = ride?.otp || null;
  const pickupAddr = ride?.pickup?.address || 'Your location';

  // Status-aware header + chip so the screen reflects the real trip stage
  // instead of always reading "Ambulance is on the way". Covers both ambulance
  // requests (arrived/on_trip/completed) and SOS dispatches (on_scene/etc).
  const statusKey = (ride?.status || '').toLowerCase();
  const isCompleted = statusKey === 'completed';
  const isOnTrip = statusKey === 'on_trip';
  // Once the trip completes, give the customer a few seconds to see the fare
  // summary, then take them back to Home automatically — they shouldn't have
  // to know to tap "Done" themselves (that button still works for an
  // immediate manual exit, e.g. once they're done reviewing the bill).
  useEffect(() => {
    if (!isCompleted) return;
    const t = setTimeout(() => {
      rideStore.clear();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }, 6000);
    return () => clearTimeout(t);
  }, [isCompleted, navigation]);
  const hasArrived = statusKey === 'arrived' || statusKey === 'on_scene';
  const headerTitle = isCompleted
    ? 'Trip completed'
    : isOnTrip
      ? 'On the way to hospital'
      : hasArrived
        ? 'Ambulance has arrived'
        : 'Ambulance is on the way';
  const statusChipText = isCompleted
    ? '✅ Trip completed'
    : isOnTrip
      ? 'En route to hospital'
      : hasArrived
        ? 'Ambulance has arrived — share OTP'
        : etaLabel;

  // Once the trip is completed, the fare is recomputed from the actual route
  // driven (dispatch point → pickup → hospital) — prefer that over the
  // booking-time estimate everywhere it's available.
  const finalFareAmount = ride?.actualFareAmount ?? null;
  const charges = chargesFrom(finalFareAmount != null ? ride?.actualFareBreakdown : ride?.fareBreakdown);
  // In-transit medical expenses logged by the control room, billed on top.
  const expenses = ride?.inTransitExpenses ?? [];
  const ambulanceTotal = finalFareAmount ?? ride?.amount ?? ride?.fareBreakdown?.finalFare ?? null;
  const grandTotal =
    finalFareAmount != null
      ? finalFareAmount + (ride?.inTransitTotal ?? 0)
      : (ride?.grandTotal ?? ambulanceTotal);
  const totalLabel = grandTotal != null ? `₹${money(grandTotal)}` : null;
  const paid = ride?.paymentStatus === 'PAID';
  const media = ride?.patientMedia ?? [];

  /**
   * Pay the bill through the real gateway.
   *
   * The server prices the trip and creates the order; the customer pays in
   * Razorpay's own sheet. This used to POST to an endpoint that simply wrote
   * "PAID" on the ride — no money moved and no card was ever charged.
   */
  const onPay = async () => {
    if (!ride?.bookingId || paying || paid) return;
    setPaying(true);
    try {
      const started = await ambulanceApi.pay(ride.bookingId);
      const res = await payFor({
        purpose: started.purpose ?? 'ambulance_ride',
        refId: ride.bookingId,
        order: started.checkout ?? null,
        description: 'Ambulance trip',
        prefill: {
          name: profile.name || undefined,
          email: profile.email || undefined,
          contact: profile.phone || undefined,
        },
      });
      await rideStore.loadActive();
      if (res.pending) AppAlert.alert('Payment received', res.pending);
    } catch (e) {
      // Backing out of the sheet is a normal thing to do.
      if (e instanceof CheckoutCancelled) return;
      AppAlert.alert(
        'Payment failed',
        e instanceof Error
          ? e.message
          : 'The payment could not be completed. You can also pay the crew directly.',
      );
    } finally {
      setPaying(false);
    }
  };

  // A real ambulance is only "assigned" once a driver + vehicle are attached.
  // Until then we must NOT show the (dummy-looking) tracking map/driver card —
  // instead show a "finding an ambulance" waiting state.
  const assigned =
    !!ride &&
    ride.driver !== 'Assigning…' &&
    !!ride.vehicleNumber &&
    ride.status !== 'pending' &&
    ride.status !== 'searching';

  // A booking that has not been paid for is NOT being searched for. Saying
  // "finding the nearest ambulance" there would be the screen lying about
  // what the system is doing.
  const unpaidHold = !!ride?.awaitingPayment;

  if (!assigned) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}>
          <BackButton onPress={() => navigation.goBack()} />
          {/* Header must match the state: only say "Finding an ambulance" while a
              request is actually searching — not on the empty "no active request"
              screen (that contradiction is what looked wrong after a trip). */}
          <Text style={styles.title}>
            {!ride ? 'Tracking' : unpaidHold ? 'Payment pending' : 'Finding an ambulance'}
          </Text>
        </View>
        <View style={styles.waitWrap}>
          <View style={styles.pulse}>
            <MapPinIcon size={scale(40)} />
          </View>
          <Text style={styles.waitTitle}>
            {!ride
              ? 'No active request'
              : unpaidHold
              ? 'Pay to confirm your booking'
              : 'Request sent — finding the nearest ambulance'}
          </Text>
          <Text style={styles.waitSub}>
            {!ride
              ? 'Book an ambulance or raise an SOS to start tracking.'
              : unpaidHold
              ? 'Your booking is saved. We start looking for an ambulance as soon as the fare is paid. For an emergency, use SOS — that is dispatched immediately and billed afterwards.'
              : "We'll notify you the moment an ambulance is assigned. Live tracking opens then."}
          </Text>
          {unpaidHold && (
            <Pressable
              style={({ pressed }) => [styles.holdPayBtn, pressed && { opacity: 0.85 }]}
              disabled={paying}
              onPress={onPay}
            >
              <Text style={styles.holdPayText}>
                {paying ? 'Opening payment…' : `Pay ₹${money(ride?.amount)} now`}
              </Text>
            </Pressable>
          )}
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
          <Text style={styles.title}>{headerTitle}</Text>
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
            {drop?.lat != null && drop?.lng != null && (
              <Marker coordinate={{ latitude: drop.lat, longitude: drop.lng }} title="Hospital" pinColor="#D64545" />
            )}
            {/* Before pickup, line to the pickup point; once onboard, line to
                the hospital drop — matches whichever point the ambulance is
                actually heading toward. */}
            {amb?.lat != null &&
              (onTripCam && drop?.lat != null ? (
                <MapPolyline
                  coordinates={[
                    { latitude: amb.lat, longitude: amb.lng },
                    { latitude: drop.lat as number, longitude: drop.lng as number },
                  ]}
                  strokeColor="#1A1C1D"
                  strokeWidth={3}
                />
              ) : (
                pickup?.lat != null && (
                  <MapPolyline
                    coordinates={[
                      { latitude: amb.lat, longitude: amb.lng },
                      { latitude: pickup.lat as number, longitude: pickup.lng as number },
                    ]}
                    strokeColor="#1A1C1D"
                    strokeWidth={3}
                  />
                )
              ))}
          </MapView>

          {/* Status chip */}
          <View style={styles.statusWrap}>
            <View style={[styles.statusChip, cardShadow]}>
              <Text style={styles.statusText}>{statusChipText}</Text>
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

          {/* Patient photos/videos captured by the crew during transport. */}
          {media.length > 0 && (
            <>
              <Text style={styles.pickupTitle}>Patient photos/videos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                {media.map((m, i) => (
                  <Pressable key={m.url} style={styles.mediaThumbWrap} onPress={() => setViewerIndex(i)}>
                    {m.type === 'video' ? (
                      <View style={[styles.mediaThumb, styles.videoThumb]}>
                        <Text style={styles.videoThumbText}>▶</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: m.url }} style={styles.mediaThumb} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.divider} />
            </>
          )}

          {/* Payment */}
          <View style={styles.payRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>
                {paid
                  ? `Paid${totalLabel ? ` ${totalLabel}` : ''}`
                  : totalLabel
                    ? `Payment of ${totalLabel} pending`
                    : 'Fare will be confirmed on assignment'}
              </Text>
              <Text style={styles.paySub}>
                {paid ? 'Payment received. Thank you.' : 'Pay now, or pay the crew using Cash/UPI'}
              </Text>
            </View>
            {!expanded && totalLabel && !paid && (
              <Pressable style={styles.miniChip} onPress={onPay} disabled={paying}>
                <Text style={styles.miniChipText}>{paying ? 'Paying…' : 'Pay Now'}</Text>
              </Pressable>
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
            {!!otp && <Text style={styles.otp}>OTP : {otp}</Text>}
          </View>

          {/* Expanded breakup */}
          {expanded && (
            <View style={[styles.breakupCard, cardShadow]}>
              <Text style={styles.breakupTitle}>
                {finalFareAmount != null ? 'Ambulance Charge (Final — actual route)' : 'Ambulance Charge (Estimate)'}
              </Text>
              {finalFareAmount != null && ride?.actualDistanceKm != null && (
                <Text style={styles.chargeLabel}>
                  Billed for the full route driven: {ride.actualDistanceKm.toFixed(1)} km
                </Text>
              )}
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

              {/* In-transit medical expenses — shown as a separate section. */}
              {expenses.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>In-Transit Medical Expense</Text>
                  {expenses.map((e, i) => (
                    <View key={`${e.item}-${i}`} style={styles.chargeRow}>
                      <Text style={styles.chargeLabel}>{e.item}</Text>
                      <Text style={styles.chargeAmount}>
                        {`${e.qty} x ${money(e.rate)}    `}
                        {money(e.amount)}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <View style={[styles.chargeRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalAmount}>{totalLabel ?? '—'}</Text>
              </View>
            </View>
          )}

          {expanded && totalLabel && (
            <Pressable style={[styles.payNow, paid && styles.payNowPaid]} onPress={onPay} disabled={paying || paid}>
              <Text style={styles.payNowText}>{paid ? 'Paid' : paying ? 'Paying…' : `Pay ${totalLabel}`}</Text>
            </Pressable>
          )}

          {/* Trip finished — clear the ride and take the customer back to Home
              (reset the stack so they can't navigate back into the ended trip). */}
          {isCompleted && (
            <Pressable
              style={styles.doneBtn}
              onPress={() => {
                rideStore.clear();
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
              }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Full-screen patient media viewer */}
      <Modal
        visible={viewerIndex != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerIndex(null)}>
          {viewerIndex != null && media[viewerIndex] && (
            media[viewerIndex].type === 'video' ? (
              <Video
                source={{ uri: media[viewerIndex].url }}
                style={styles.viewerMedia}
                controls
                resizeMode="contain"
              />
            ) : (
              <Image source={{ uri: media[viewerIndex].url }} style={styles.viewerMedia} resizeMode="contain" />
            )
          )}
        </Pressable>
      </Modal>
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
  doneBtn: {
    marginTop: verticalScale(12), height: verticalScale(50), borderRadius: scale(12),
    backgroundColor: colors.payGreen, alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  waitTitle: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack, textAlign: 'center' },
  waitSub: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted, textAlign: 'center', lineHeight: scale(19) },
  waitBtn: {
    marginTop: verticalScale(8), paddingHorizontal: scale(26), height: verticalScale(46),
    borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center',
  },
  waitBtnText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  holdPayBtn: {
    marginTop: verticalScale(14), paddingHorizontal: scale(26), height: verticalScale(50),
    borderRadius: scale(12), backgroundColor: '#2E9B2E', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'stretch',
  },
  holdPayText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
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
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: scale(16),
    color: colors.textBlack,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(4),
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
  payNowPaid: {
    backgroundColor: colors.inkMuted,
  },
  payNowText: {
    fontFamily: fonts.bold,
    fontSize: scale(18),
    color: colors.textWhite,
  },
  mediaRow: {
    marginTop: verticalScale(10),
  },
  mediaThumbWrap: {
    marginRight: scale(10),
  },
  mediaThumb: {
    width: scale(72),
    height: scale(72),
    borderRadius: radius.card,
    backgroundColor: colors.avatarCircle,
  },
  videoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbText: {
    fontFamily: fonts.bold,
    fontSize: scale(22),
    color: colors.textPrimary,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerMedia: {
    width: '100%',
    height: '80%',
  },
});
