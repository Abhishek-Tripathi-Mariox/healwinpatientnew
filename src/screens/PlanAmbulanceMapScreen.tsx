import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { BackButton } from '../components';
import { ChevronForwardIcon, MapPinIcon } from '../components/icons';
import { getCurrentLocation, reverseGeocode, searchPlaces, resolvePlace, type PlaceSuggestion } from '../services/geo';
import { bookingDraftStore } from '../state/bookingDraftStore';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow, floatingShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

// Sensible default view (centre of India) until the device location resolves.
const DEFAULT_REGION: Region = {
  latitude: 26.8467,
  longitude: 80.9462,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlanAmbulanceMap'>;

/**
 * Real interactive pickup picker: a Google map with a fixed centre pin. Pan the
 * map to place the pin, and the centre coordinate (reverse-geocoded to an
 * address) becomes the booking's pickup. "Locate me" recentres on live GPS.
 */
export const PlanAmbulanceMapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'PlanAmbulanceMap'>>();
  const mode = route.params?.mode ?? 'pickup';
  const next = route.params?.next ?? (mode === 'pickup' ? 'drop' : 'select');
  const isDrop = mode === 'drop';
  const mapRef = useRef<MapView | null>(null);

  const [center, setCenter] = useState({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude });
  const [address, setAddress] = useState<string>(
    isDrop ? 'Move the map to set your drop' : 'Move the map to set your pickup',
  );
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(true);

  // Manual address search (type-to-find) state.
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounce reverse-geocoding so we don't hammer the API while panning.
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce the forward search while the user types.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centre on the device's real location on first mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const loc = await getCurrentLocation();
      if (!alive) return;
      if (loc) {
        const r: Region = {
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCenter({ lat: loc.lat, lng: loc.lng });
        mapRef.current?.animateToRegion(r, 600);
        resolveAddress(loc.lat, loc.lng);
      }
      setLocating(false);
    })();
    return () => {
      alive = false;
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveAddress = (lat: number, lng: number) => {
    setResolving(true);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      const a = await reverseGeocode(lat, lng);
      setAddress(a || `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      setResolving(false);
    }, 500);
  };

  const onRegionChangeComplete = (r: Region) => {
    setCenter({ lat: r.latitude, lng: r.longitude });
    resolveAddress(r.latitude, r.longitude);
  };

  const locateMe = async () => {
    setLocating(true);
    const loc = await getCurrentLocation();
    if (loc) {
      const r: Region = {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(r, 600);
      setCenter({ lat: loc.lat, lng: loc.lng });
      resolveAddress(loc.lat, loc.lng);
    }
    setLocating(false);
  };

  // Type-to-search: debounce queries into the Places/Geocoding lookup.
  const onChangeQuery = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await searchPlaces(text);
      setSuggestions(res);
      setSearching(false);
    }, 350);
  };

  // Pick a typed-address suggestion: resolve to coords, move the map + pin
  // there, and treat it exactly like a panned pickup/drop point.
  const pickSuggestion = async (s: PlaceSuggestion) => {
    setSearching(true);
    const loc = await resolvePlace(s);
    setSearching(false);
    if (!loc) {
      setAddress('Could not locate that address — try another.');
      return;
    }
    setSuggestions([]);
    setQuery('');
    setCenter({ lat: loc.lat, lng: loc.lng });
    setAddress(loc.address || s.description);
    mapRef.current?.animateToRegion(
      { latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600,
    );
  };

  const confirm = () => {
    const loc = {
      address: resolving ? `Pinned location (${center.lat.toFixed(5)}, ${center.lng.toFixed(5)})` : address,
      lat: center.lat,
      lng: center.lng,
    };
    if (isDrop) bookingDraftStore.setDrop(loc);
    else bookingDraftStore.setPickup(loc);

    // pickup → drop picker → select; or straight to select when editing.
    if (next === 'drop') navigation.navigate('PlanAmbulanceMap', { mode: 'drop', next: 'select' });
    else navigation.navigate('SelectAmbulance');
  };

  return (
    <View style={styles.root}>
      {/* Real interactive map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* Fixed centre pin (the pickup point). Lifted so its tip marks the centre. */}
      <View pointerEvents="none" style={styles.centerPin}>
        <MapPinIcon size={scale(40)} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{isDrop ? 'Set drop location' : 'Set pickup location'}</Text>
      </View>

      {/* Manual address search — type to find a pickup/drop instead of panning. */}
      <View style={[styles.searchWrap, { top: insets.top + verticalScale(54) }]}>
        <View style={[styles.searchBar, floatingShadow]}>
          <MapPinIcon size={scale(18)} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder={isDrop ? 'Search drop address' : 'Search pickup address'}
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.directionsBlue} />
          ) : query.length > 0 ? (
            <Pressable onPress={() => onChangeQuery('')} hitSlop={8}>
              <Text style={styles.clearBtn}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        {suggestions.length > 0 && (
          <View style={[styles.suggestions, floatingShadow]}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: verticalScale(220) }}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.placeId || `${s.description}-${i}`}
                  onPress={() => pickSuggestion(s)}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                >
                  <MapPinIcon size={scale(15)} color={colors.inkMuted} />
                  <Text style={styles.suggestionText} numberOfLines={2}>{s.description}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Locate-me button */}
      <Pressable
        onPress={locateMe}
        accessibilityLabel="Use my location"
        style={({ pressed }) => [
          styles.locateBtn,
          floatingShadow,
          { bottom: insets.bottom + verticalScale(170) },
          pressed && styles.pressed,
        ]}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.directionsBlue} />
        ) : (
          <MapPinIcon size={scale(20)} color={colors.directionsBlue} />
        )}
      </Pressable>

      {/* Bottom: resolved address + confirm */}
      <View style={[styles.bottomCard, cardShadow, { paddingBottom: insets.bottom + verticalScale(16) }]}>
        <View style={styles.locationHead}>
          <MapPinIcon size={scale(17)} />
          <Text style={styles.locationTitle}>{isDrop ? 'Drop location' : 'Pickup location'}</Text>
        </View>
        <View style={styles.addressBox}>
          {resolving ? (
            <ActivityIndicator size="small" color={colors.inkMuted} />
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {address}
            </Text>
          )}
        </View>
        <Pressable
          onPress={confirm}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{isDrop ? 'Confirm drop' : next === 'drop' ? 'Confirm pickup → set drop' : 'Confirm pickup'}</Text>
          <ChevronForwardIcon size={scale(20)} color={colors.textWhite} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(17),
    letterSpacing: -0.3,
    color: colors.textBlack,
    marginLeft: spacing.md,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 4,
  },

  searchWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    height: verticalScale(46),
    borderRadius: scale(12),
    backgroundColor: colors.surface,
    paddingHorizontal: scale(14),
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: scale(14),
    letterSpacing: -0.3,
    color: colors.textBlack,
    padding: 0,
  },
  clearBtn: {
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.inkMuted,
  },
  suggestions: {
    marginTop: verticalScale(6),
    borderRadius: scale(12),
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dashBorder,
  },
  suggestionText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: scale(13),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },

  // The pin's tip sits at the exact map centre: shift up by ~half its height.
  centerPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -scale(20),
    marginTop: -scale(40),
  },

  locateBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: scale(18),
    borderTopRightRadius: scale(18),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(16),
  },
  locationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  locationTitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },
  addressBox: {
    minHeight: verticalScale(40),
    justifyContent: 'center',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: colors.dashBorder,
    backgroundColor: colors.dashBg,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    marginTop: verticalScale(12),
  },
  addressText: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    height: verticalScale(50),
    borderRadius: scale(12),
    backgroundColor: colors.directionsBlue,
    marginTop: verticalScale(16),
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: scale(16),
    color: colors.textWhite,
  },
  pressed: { opacity: 0.85 },
});
