import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, CentreCard, CentreFilter, CentreTag, FilterSheet } from '../components';
import { ListIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { centresApi } from '../api/catalog';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

const TAGS: Record<CentreFilter, CentreTag> = {
  centre: { label: 'HealWin Centre', bg: colors.tagCentreBg, color: colors.tagCentreText },
  enrolled: { label: 'HealWin Verified', bg: colors.tagVerifiedBg, color: colors.tagVerifiedText },
  other: { label: 'Other Hospital', bg: colors.tagOtherBg, color: colors.tagOtherText },
};

interface Centre {
  key: string;
  name: string;
  location: string;
  rating: string;
  distance: string;
  kind: CentreFilter;
  lat?: number;
  lng?: number;
}

const mapCentre = (c: any): Centre => {
  const coords = c.location?.coordinates; // [lng, lat]
  return {
    key: c._id || c.id,
    name: c.name || '',
    location: c.address || [c.district, c.state].filter(Boolean).join(', ') || '',
    rating: c.rating != null ? String(c.rating) : '—',
    distance: c.distanceKm != null ? `${c.distanceKm} km` : c.distance || '',
    // The locator centre's `type` drives the filter bucket. (Older flags
    // isHealwinCentre/isVerified are kept as a fallback.)
    kind:
      c.type === 'healwin_operated' || c.isHealwinCentre
        ? 'centre'
        : c.type === 'healwin_approved' || c.isVerified
          ? 'enrolled'
          : 'other',
    lat: coords?.[1] ?? c.lat,
    lng: coords?.[0] ?? c.lng,
  };
};

// Open Google Maps directions to the centre (by coords, or name as fallback).
const openDirections = (c: Centre) => {
  const url =
    c.lat != null && c.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${c.location}`)}`;
  Linking.openURL(url).catch(() => undefined);
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'CentresList'>;

export const CentresListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<CentreFilter>('enrolled');
  const [centres, setCentres] = useState<Centre[]>([]);

  useEffect(() => {
    centresApi
      .list()
      .then((list) => setCentres(list.map(mapCentre).filter((c) => c.key)))
      .catch(() => setCentres([]));
  }, []);

  // Apply the chosen filter (HealWin Centre / Enrolled / Other Hospital).
  const shown = centres.filter((c) => c.kind === filter);

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setSheetOpen(true)}
          hitSlop={8}
          accessibilityLabel="Filter centres"
          style={[styles.listBtn, cardShadow]}
        >
          <ListIcon size={scale(20)} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}
      >
        {shown.length === 0 ? (
          <Text style={styles.empty}>No {TAGS[filter].label} found.</Text>
        ) : (
          shown.map((c) => (
            <CentreCard
              key={c.key}
              Thumb={svgs.centreThumb}
              name={c.name}
              location={c.location}
              rating={c.rating}
              distance={c.distance}
              tag={TAGS[c.kind]}
              onDirections={() => openDirections(c)}
              style={styles.card}
            />
          ))
        )}
      </ScrollView>

      <FilterSheet
        visible={sheetOpen}
        selected={filter}
        onSelect={setFilter}
        onClose={() => setSheetOpen(false)}
      />
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
  listBtn: {
    width: scale(40),
    height: scale(31),
    borderRadius: scale(5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(6),
  },
  card: {
    marginBottom: verticalScale(24),
  },
  empty: {
    textAlign: 'center',
    marginTop: verticalScale(50),
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.inkMuted,
  },
});
