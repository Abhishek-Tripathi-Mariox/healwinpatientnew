import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, HospitalMapCard, TripCard } from '../components';
import { bookingsApi } from '../api/bookings';
import { centresApi } from '../api/catalog';
import { FilterIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { getCurrentLocation, distanceKm as calcDistance, etaMinutesFromKm } from '../services/geo';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

interface Trip {
  key: string;
  title: string;
  dateTime: string;
  amount: string;
  status?: string;
}

interface NearestCentre {
  name: string;
  distance: string;
  duration: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'NearbyAmbulances'>;

export const NearbyAmbulancesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [nearest, setNearest] = useState<NearestCentre | null>(null);

  // Past-trip history from the user's real bookings.
  useEffect(() => {
    bookingsApi
      .list()
      .then((list) =>
        setTrips(
          list.map((b) => ({
            key: b.id,
            title: b.type,
            dateTime: b.date,
            amount: `₹${b.amount}`,
            status: b.status === 'cancelled' ? 'Cancelled' : b.status === 'completed' ? 'Completed' : undefined,
          })),
        ),
      )
      .catch(() => setTrips([]));
  }, []);

  // Nearest real hospital/centre to the user's live location.
  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await getCurrentLocation().catch(() => null);
      const list = await centresApi
        .list(me ? { lat: me.lat, lng: me.lng } : {})
        .catch(() => [] as any[]);
      const c: any = list?.[0];
      if (!alive || !c) return;
      const coords = c.location?.coordinates; // [lng, lat]
      const lat = coords?.[1] ?? c.lat;
      const lng = coords?.[0] ?? c.lng;
      const km = c.distanceKm ?? (me && lat != null ? calcDistance(me, { lat, lng }) : null);
      const eta = etaMinutesFromKm(km);
      setNearest({
        name: c.name || 'Nearest hospital',
        distance: km != null ? `${km} km away` : '',
        duration: eta != null ? `${eta} mins` : '',
        phone: c.phone || c.contactNumber || undefined,
        lat,
        lng,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openDirections = () => {
    if (nearest?.lat == null || nearest?.lng == null) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`,
    ).catch(() => undefined);
  };
  const callCentre = () => {
    if (!nearest?.phone) return;
    Linking.openURL(`tel:${nearest.phone}`).catch(() => undefined);
  };

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Nearby Ambulances</Text>
        <Pressable
          onPress={() => {}}
          hitSlop={8}
          accessibilityLabel="Filter"
          style={[styles.filterBtn, cardShadow]}
        >
          <FilterIcon size={scale(20)} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + verticalScale(24) },
        ]}
      >
        {nearest && (
          <HospitalMapCard
            Map={svgs.tripMap}
            hospitalName={nearest.name}
            distance={nearest.distance}
            duration={nearest.duration}
            onDirection={openDirections}
            onCall={callCentre}
          />
        )}

        <Text style={styles.sectionLabel}>Your Trips</Text>

        {trips.map((t) => (
          <TripCard
            key={t.key}
            title={t.title}
            dateTime={t.dateTime}
            amount={t.amount}
            status={t.status}
            Vehicle={svgs.ambulanceSearch}
            onRebook={() => {}}
            style={styles.tripCard}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: verticalScale(10),
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold, // Figma: ExtraBold
    fontSize: scale(18),
    color: colors.ink,
  },
  filterBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(6),
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.ink,
    marginTop: verticalScale(22),
    marginBottom: verticalScale(12),
    marginLeft: scale(4),
  },
  tripCard: {
    marginBottom: verticalScale(16),
  },
});
