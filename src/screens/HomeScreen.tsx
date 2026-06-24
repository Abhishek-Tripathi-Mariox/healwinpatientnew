import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AmbulanceTypeCard, BottomNav, Button, Card, Dots, DriverOnWayCard, Header, TabKey } from '../components';
import { svgs } from '../svgAssets';
import { rideStore, useActiveRide } from '../state/rideStore';
import { socketService } from '../services/socket';
import { ambulanceApi, AmbulanceType } from '../api/ambulance';
import { artFor, FALLBACK_DESCRIPTION } from '../utils/ambulanceArt';
import { homeApi } from '../api/misc';
import { notificationsApi } from '../api/notifications';
import { useProfile } from '../state/profileStore';
import type { RootStackParamList } from '../navigation/types';
import LocateHealthcareCard from '../../assets/svg/homepagerename.svg';
import {
  colors,
  fonts,
  scale,
  screen,
  spacing,
  textStyles,
  verticalScale,
} from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Promo {
  key: string;
  titleTop: string;
  titleBold: string[];
  cta: string;
  target: string;
}

const PROMO_W = screen.width - spacing.md * 2;
// Full-width cards (same as the promo/Locate cards) so a single type doesn't
// leave empty space on the right; multiple types page horizontally.
const VEH_CARD_W = PROMO_W;

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [promoIndex, setPromoIndex] = useState(0);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<AmbulanceType[]>([]);
  const [unread, setUnread] = useState(0);
  const ride = useActiveRide();
  const profile = useProfile();

  // Real unread-notification count drives the bell's red dot (no hardcoded dot).
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      notificationsApi
        .list()
        .then((r) => alive && setUnread(r.unreadCount || 0))
        .catch(() => alive && setUnread(0));
      return () => {
        alive = false;
      };
    }, []),
  );

  // Admin-managed home promo cards (no hardcoded copy).
  useEffect(() => {
    let alive = true;
    homeApi
      .promos()
      .then((list) =>
        alive &&
        setPromos(
          list.map((p) => ({
            key: p._id,
            titleTop: p.titleTop,
            titleBold: Array.isArray(p.titleBold) ? p.titleBold : [],
            cta: p.cta || 'Book Now',
            target: p.target,
          })),
        ),
      )
      .catch(() => alive && setPromos([]));
    return () => {
      alive = false;
    };
  }, []);

  // "Know Your Life Support Vehicle" — admin-managed ambulance types (single
  // source of truth: Types & Pricing). Educational carousel on the home screen.
  useEffect(() => {
    let alive = true;
    ambulanceApi
      .types()
      .then((list) => alive && setVehicleTypes(list))
      .catch(() => alive && setVehicleTypes([]));
    return () => {
      alive = false;
    };
  }, []);

  // Reflect the live active booking on the home "driver on the way" card.
  // Also reset the bottom-nav highlight back to Home — otherwise tapping
  // "Family care" (which navigates away) leaves it highlighted after returning.
  useFocusEffect(
    useCallback(() => {
      setActiveTab('home');
      rideStore.loadActive().catch(() => undefined);
    }, []),
  );

  // Live ETA on the "driver on the way" card — subscribe to the ambulance's
  // position so the ETA/distance update in real time, not only on refocus.
  const bookingId = ride?.bookingId;
  useEffect(() => {
    if (!bookingId) return;
    void socketService.connect();
    socketService.trackBooking(bookingId);
    const onLoc = (d: any) => {
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

  const goToAmbulanceTypes = () => navigation.navigate('AmbulanceTypes');
  const goToPlan = () => navigation.navigate('PlanAmbulance');

  const onPromoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPromoIndex(Math.round(e.nativeEvent.contentOffset.x / (PROMO_W + spacing.md)));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + verticalScale(8), paddingBottom: verticalScale(120) },
        ]}
      >
        {/* ── Brand ────────────────────────────────────────── */}
        <View style={styles.brandRow}>
          <svgs.logo width={scale(120)} height={scale(25)} preserveAspectRatio="xMidYMid meet" />
        </View>

        {/* ── Header ───────────────────────────────────────── */}
        <Header
          name={profile.name}
          Avatar={svgs.avatar}
          photoUri={profile.photo || undefined}
          hasNotification={unread > 0}
          onAvatarPress={() => navigation.navigate('Profile')}
          onBellPress={() => navigation.navigate('Notifications')}
        />

        {/* ── "Where To?" search card ──────────────────────── */}
        <Card
          style={styles.searchCard}
          contentStyle={styles.searchInner}
          onPress={goToPlan}
        >
          <svgs.ambulanceSearch
            width={scale(96)}
            height={scale(44)}
            preserveAspectRatio="xMidYMid meet"
          />
          <Text style={styles.whereTo}>Where To ?</Text>
        </Card>

        {/* ── Promo carousel (swipeable) ───────────────────── */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={PROMO_W + spacing.md}
          snapToAlignment="start"
          onScroll={onPromoScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.promoScroll}
        >
          {promos.map((p, i) => (
            <Card
              key={p.key}
              style={[styles.promoCard, { width: PROMO_W, marginRight: i < promos.length - 1 ? spacing.md : 0 }]}
              Background={svgs.forestBg}
              backgroundOpacity={0.9}
              scrim
              onPress={() => navigation.navigate(p.target as never)}
            >
              <View style={styles.promoTextBlock}>
                <Text style={styles.promoTitleRegular}>{p.titleTop}</Text>
                {p.titleBold.map((line) => (
                  <Text key={line} style={styles.promoTitleBold}>
                    {line}
                  </Text>
                ))}
                <Button
                  label={p.cta}
                  variant="outline"
                  color={colors.brandRed}
                  textColor={colors.brandRed}
                  style={styles.bookNow}
                  onPress={() => navigation.navigate(p.target as never)}
                />
              </View>
              <View style={styles.promoAmbulance} pointerEvents="none">
                <svgs.ambulanceCard width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
              </View>
            </Card>
          ))}
        </ScrollView>

        {/* ── Carousel dots ────────────────────────────────── */}
        {promos.length > 0 && (
          <Dots count={promos.length} activeIndex={Math.min(promoIndex, promos.length - 1)} />
        )}

        {/* ── Ambulance types carousel (vehicle right, text + Book Now left) ── */}
        {vehicleTypes.length > 0 && (
          <View style={styles.vehSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={VEH_CARD_W + spacing.md}
              snapToAlignment="start"
              contentContainerStyle={styles.vehScroll}
            >
              {vehicleTypes.map((t) => {
                const art = artFor(t.name);
                return (
                  <AmbulanceTypeCard
                    key={t._id || t.code}
                    title={t.name}
                    description={t.description || FALLBACK_DESCRIPTION}
                    Background={art.Background}
                    Vehicle={art.Vehicle}
                    imageSide="right"
                    titleSize={t.name.length > 18 ? scale(15) : scale(16)}
                    onPress={goToPlan}
                    onBook={goToPlan}
                    style={styles.vehCard}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Promo card 2: Locate Healthcare Centre ───────── */}
        <Card
          style={styles.locateCard}
          onPress={() => navigation.navigate('ServiceSelect')}
        >
          <LocateHealthcareCard
            width="100%"
            height="100%"
            viewBox="1.503 10.776 374.497 306.224"
            preserveAspectRatio="xMidYMid slice"
          />
        </Card>

        {/* ── Driver on the way (after booking) ─────────────── */}
        {ride && (
          <DriverOnWayCard
            eta={ride.eta}
            Map={svgs.trackMap}
            onPress={() => navigation.navigate('Tracking')}
            style={styles.driverCard}
          />
        )}
      </ScrollView>

      {/* ── Bottom navigation (fixed) ──────────────────────── */}
      <View style={[styles.navContainer, { paddingBottom: insets.bottom + verticalScale(8) }]}>
        <BottomNav
          active={activeTab}
          onTabPress={(t) => {
            setActiveTab(t);
            if (t === 'family') navigation.navigate('Membership');
          }}
          onSosPress={() => navigation.navigate('Sos')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 0,
  },
  brandRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(10),
  },

  /* Search card */
  searchCard: {
    height: verticalScale(64),
    marginHorizontal: spacing.md,
    marginTop: verticalScale(18),
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  searchAmbulance: {
    width: scale(96),
    height: scale(44),
  },
  whereTo: {
    ...textStyles.whereTo,
    color: colors.textBlack,
    marginLeft: spacing.sm,
  },

  /* Promo carousel */
  promoScroll: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(20),
  },
  vehSection: {
    marginTop: verticalScale(18),
  },
  vehScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(4),
  },
  vehCard: {
    width: VEH_CARD_W,
    marginHorizontal: 0,
    marginBottom: 0,
    marginRight: spacing.md,
  },
  promoCard: {
    height: verticalScale(161),
    justifyContent: 'center',
  },
  promoTextBlock: {
    paddingLeft: spacing.lg,
    paddingTop: verticalScale(14),
    width: '58%',
  },
  promoTitleRegular: {
    fontFamily: textStyles.welcome.fontFamily, // Poppins regular
    fontSize: scale(20),
    lineHeight: scale(28),
    color: colors.textWhite,
  },
  promoTitleBold: {
    ...textStyles.name, // Poppins bold 24
    fontSize: scale(24),
    lineHeight: scale(30),
    color: colors.textWhite,
  },
  bookNow: {
    marginTop: verticalScale(10),
  },
  promoAmbulance: {
    position: 'absolute',
    right: scale(-6),
    bottom: verticalScale(6),
    width: scale(210),
    height: verticalScale(120),
  },

  /* Promo card 2 */
  locateCard: {
    // Match the SVG's content bounds (374.497 × 306.224, top blank cropped via
    // viewBox) so the card fills with no empty strip at the top.
    height: Math.round(PROMO_W * (306.224 / 374.497)),
    marginHorizontal: spacing.md,
    marginTop: verticalScale(14),
  },
  locateHeading: {
    textAlign: 'right',
    paddingTop: verticalScale(14),
    paddingRight: spacing.xl,
  },
  locateRegular: {
    fontFamily: textStyles.welcome.fontFamily,
    fontSize: scale(24),
    lineHeight: scale(34),
    color: colors.textPrimary,
  },
  locateAccent: {
    fontFamily: textStyles.name.fontFamily, // Poppins bold
    fontSize: scale(26),
    lineHeight: scale(34),
    color: colors.brandRedDark,
  },
  hospital: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Driver on the way */
  driverCard: {
    marginHorizontal: spacing.md,
    marginTop: verticalScale(16),
  },

  /* Bottom nav */
  navContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
