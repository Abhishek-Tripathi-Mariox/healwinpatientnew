import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { AmbulanceOptionCard, BackButton } from '../components';
import { MapPinIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { ambulanceApi, AmbulanceQuote } from '../api/ambulance';
import { rideStore } from '../state/rideStore';
import { contactsStore } from '../state/contactsStore';
import { bookingDraftStore, useDraftPickup, useDraftDrop } from '../state/bookingDraftStore';
import { getCurrentLocation } from '../services/geo';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

/**
 * Map a backend ambulance type name to its scenic background + vehicle artwork.
 * Keeps the Figma visuals while the type list itself is fully data-driven.
 */
const artFor = (name: string): { Background: any; Vehicle: any } => {
  const n = name.toLowerCase();
  if (n.includes('advanced') || n.includes('als')) return { Background: svgs.bgAls, Vehicle: svgs.vehBls };
  if (n.includes('4') || n.includes('4x4') || n.includes('transport')) return { Background: svgs.bg4x4, Vehicle: svgs.veh4x4 };
  if (n.includes('rapid') || n.includes('rrv')) return { Background: svgs.bgRrv, Vehicle: svgs.vehRrv };
  if (n.includes('urbania') || n.includes('force')) return { Background: svgs.bgUrbania, Vehicle: svgs.vehUrbania };
  if (n.includes('hearse') || n.includes('mortuary')) return { Background: svgs.bgHearse, Vehicle: svgs.vehHearse };
  if (n.includes('basic') || n.includes('bls')) return { Background: svgs.bgBls, Vehicle: svgs.vehBls };
  return { Background: svgs.bgHearse, Vehicle: svgs.ambulanceCard };
};

const priceLabel = (amount?: number) =>
  amount != null ? `₹ ${Math.round(amount).toLocaleString('en-IN')}` : '—';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectAmbulance'>;

export const SelectAmbulanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const mapRef = React.useRef<MapView | null>(null);
  const [booking, setBooking] = React.useState(false);
  const [quotes, setQuotes] = React.useState<AmbulanceQuote[]>([]);
  const [loading, setLoading] = React.useState(true);
  // Live GPS — used as the pickup point when no explicit pickup was chosen.
  const [myLoc, setMyLoc] = React.useState<{ lat: number; lng: number } | null>(null);
  const pickupDraft = useDraftPickup();
  const dropDraft = useDraftDrop();

  React.useEffect(() => {
    getCurrentLocation().then((l) => l && setMyLoc(l)).catch(() => undefined);
  }, []);

  // Real coordinates for the map: explicit pickup/drop drafts win; pickup falls
  // back to live GPS so the map always shows the patient's actual location.
  const pickupCoord =
    pickupDraft?.lat != null && pickupDraft?.lng != null
      ? { lat: pickupDraft.lat, lng: pickupDraft.lng }
      : myLoc;
  const dropCoord =
    dropDraft?.lat != null && dropDraft?.lng != null
      ? { lat: dropDraft.lat, lng: dropDraft.lng }
      : null;

  // Keep both points framed as they resolve/change.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickupCoord && dropCoord) {
      map.fitToCoordinates(
        [
          { latitude: pickupCoord.lat, longitude: pickupCoord.lng },
          { latitude: dropCoord.lat, longitude: dropCoord.lng },
        ],
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true },
      );
    } else if (pickupCoord) {
      map.animateToRegion(
        { latitude: pickupCoord.lat, longitude: pickupCoord.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        350,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoord?.lat, pickupCoord?.lng, dropCoord?.lat, dropCoord?.lng]);

  // Load ambulance TYPES (always available — they're services, not live fleet)
  // and enrich with real distance-based fares when pickup/drop are known. The
  // type list never depends on fleet availability, so the patient always sees
  // options and can send the request; admin handles the actual assignment.
  const loadOptions = React.useCallback(async () => {
    setLoading(true);
    try {
      const dp = bookingDraftStore.getPickup();
      const dd = bookingDraftStore.getDrop();
      let pickup: { lat: number; lng: number; address?: string } | undefined =
        dp?.lat != null && dp?.lng != null ? { lat: dp.lat, lng: dp.lng, address: dp.address } : undefined;
      if (!pickup) {
        const loc = await getCurrentLocation().catch(() => null);
        if (loc) pickup = { lat: loc.lat, lng: loc.lng };
      }
      const drop =
        dd?.lat != null && dd?.lng != null ? { lat: dd.lat, lng: dd.lng, address: dd.address } : undefined;

      // Types first → list is never empty just because fares failed to compute.
      const types = await ambulanceApi.types();
      let merged: AmbulanceQuote[] = types.map((t) => ({ ...t, amount: t.priceFrom ?? 0 }));
      try {
        const q = await ambulanceApi.quotes(pickup, drop);
        if (q.length) merged = q;
      } catch {
        /* keep base types with their from-price */
      }
      setQuotes(merged);
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recompute whenever the screen regains focus (pickup/drop may have changed).
  useFocusEffect(
    React.useCallback(() => {
      loadOptions();
    }, [loadOptions]),
  );

  const book = async (typeCode: string) => {
    if (booking) return;
    setBooking(true);
    try {
      // Capture the patient's real coordinates so the backend can compute the
      // live distance to the assigned ambulance (falls back gracefully if the
      // user denies location).
      const loc = await getCurrentLocation();
      // Pickup chosen on the Plan screen (a saved address) overrides the label;
      // coordinates still come from live GPS when the saved address has none.
      const draft = bookingDraftStore.getPickup();
      const dropDr = bookingDraftStore.getDrop();
      const address =
        draft?.address || (loc ? 'Current location' : 'Location unavailable');
      // "Book for someone else": if a saved contact was chosen on the Plan
      // screen, send it so the crew/admin know who they're picking up.
      const recipient = contactsStore.getRecipient();
      await rideStore.book({
        type: typeCode,
        pickup: {
          lat: draft?.lat ?? loc?.lat ?? 0,
          lng: draft?.lng ?? loc?.lng ?? 0,
          address,
        },
        // Drop is optional — admin/crew can set it later if the patient skipped.
        ...(dropDr?.lat != null && dropDr?.lng != null
          ? { drop: { lat: dropDr.lat, lng: dropDr.lng, address: dropDr.address } }
          : {}),
        ...(recipient
          ? {
              // The recipient may be a saved contact or a family member —
              // send the matching id so the backend links it correctly.
              ...(recipient.source === 'family'
                ? { familyMemberId: recipient.id }
                : { contactId: recipient.id }),
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
            }
          : {}),
      });
      contactsStore.clearRecipient();
      bookingDraftStore.clearPickup();
      bookingDraftStore.clearDrop();
      navigation.navigate('Tracking');
    } catch (e: any) {
      Alert.alert('Booking failed', e?.message || 'Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Real map with the actual pickup → drop route */}
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: pickupCoord?.lat ?? 20.5937,
            longitude: pickupCoord?.lng ?? 78.9629,
            latitudeDelta: pickupCoord ? 0.02 : 5,
            longitudeDelta: pickupCoord ? 0.02 : 5,
          }}
          showsUserLocation
        >
          {pickupCoord && (
            <Marker
              coordinate={{ latitude: pickupCoord.lat, longitude: pickupCoord.lng }}
              title="Pickup"
              pinColor="green"
            />
          )}
          {dropCoord && (
            <Marker
              coordinate={{ latitude: dropCoord.lat, longitude: dropCoord.lng }}
              title="Drop"
              pinColor="red"
            />
          )}
          {pickupCoord && dropCoord && (
            <Polyline
              coordinates={[
                { latitude: pickupCoord.lat, longitude: pickupCoord.lng },
                { latitude: dropCoord.lat, longitude: dropCoord.lng },
              ]}
              strokeColor="#0B7A3B"
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Back button */}
        <View style={[styles.backWrap, { top: insets.top + verticalScale(8) }]}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      </View>

      {/* Ambulance details panel */}
      <View style={styles.panel}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose Ambulance</Text>

        {/* Pickup + Drop — both editable; request goes to admin on selection. */}
        <View style={styles.routeCard}>
          <Pressable
            style={styles.routeRow}
            onPress={() => navigation.navigate('PlanAmbulanceMap', { mode: 'pickup', next: 'select' })}
          >
            <MapPinIcon size={scale(16)} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {pickupDraft?.address || 'Current location (GPS)'}
              </Text>
            </View>
            <Text style={styles.routeEdit}>Edit</Text>
          </Pressable>
          <View style={styles.routeLine} />
          <Pressable
            style={styles.routeRow}
            onPress={() => navigation.navigate('PlanAmbulanceMap', { mode: 'drop', next: 'select' })}
          >
            <MapPinIcon size={scale(16)} color={colors.brandRedDark} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>Drop</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {dropDraft?.address || 'Tap to set drop (optional)'}
              </Text>
            </View>
            <Text style={styles.routeEdit}>{dropDraft ? 'Edit' : 'Add'}</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(20) }}
        >
          {loading ? (
            <ActivityIndicator color={colors.brandRedDark} style={{ marginTop: verticalScale(40) }} />
          ) : quotes.length === 0 ? (
            <Text style={styles.empty}>Ambulance service is being set up. Please try again shortly.</Text>
          ) : (
            quotes.map((q) => {
              const art = artFor(q.name);
              return (
                <AmbulanceOptionCard
                  key={q._id || q.code}
                  name={q.name}
                  price={priceLabel(q.amount ?? q.priceFrom)}
                  distance={q.etaMinutes ? `~${q.etaMinutes} min` : 'Final fare on distance'}
                  Background={art.Background}
                  Vehicle={art.Vehicle}
                  onBook={() => book(q.code)}
                  style={styles.card}
                />
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  mapArea: {
    height: '42%',
    backgroundColor: colors.avatarCircle,
  },
  backWrap: {
    position: 'absolute',
    left: spacing.lg,
  },
  panel: {
    flex: 1,
    marginTop: -verticalScale(16),
    backgroundColor: colors.surface,
    borderTopLeftRadius: scale(18),
    borderTopRightRadius: scale(18),
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(10),
    ...cardShadow,
  },
  handle: {
    alignSelf: 'center',
    width: scale(83),
    height: scale(4),
    borderRadius: scale(3),
    backgroundColor: '#3C3C3C',
    marginBottom: verticalScale(14),
  },
  title: {
    alignSelf: 'center',
    fontFamily: fonts.bold,
    fontSize: scale(14),
    color: colors.textBlack,
    marginBottom: verticalScale(14),
  },
  routeCard: {
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.dashBorder,
    backgroundColor: colors.dashBg,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    marginBottom: verticalScale(14),
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(8),
  },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(11),
    color: colors.inkMuted,
  },
  routeValue: {
    fontFamily: fonts.semiBold,
    fontSize: scale(13),
    color: colors.textBlack,
  },
  routeEdit: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.linkBlue,
  },
  routeLine: {
    height: 1,
    backgroundColor: colors.dashBorder,
    marginLeft: scale(26),
  },
  card: {
    marginBottom: verticalScale(20),
  },
  empty: {
    textAlign: 'center',
    marginTop: verticalScale(40),
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.inkMuted,
  },
});
