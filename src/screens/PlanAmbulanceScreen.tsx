import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AddressRow, BackButton, ContactSheet } from '../components';
import { ChevronForwardIcon, DestMarkerIcon, MapPinIcon, OriginMarkerIcon, PersonIcon } from '../components/icons';
import { contactsStore, useSavedContacts, useSelectedRecipient } from '../state/contactsStore';
import { familyStore, useFamilyMembers } from '../state/familyStore';
import { addressStore, useAddresses, Address } from '../state/addressStore';
import { bookingDraftStore, useDraftPickup } from '../state/bookingDraftStore';
import { resolvePlace } from '../services/geo';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

/** Build a single-line, human-readable address from a saved Address. */
const formatAddress = (a: Address): string =>
  [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');

type Mode = 'now' | 'me';
type Nav = NativeStackNavigationProp<RootStackParamList, 'PlanAmbulance'>;

export const PlanAmbulanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<Mode>('now');
  const [contactOpen, setContactOpen] = useState(false);
  const contacts = useSavedContacts();
  const familyMembers = useFamilyMembers();
  const recipient = useSelectedRecipient();
  const addresses = useAddresses();
  const pickup = useDraftPickup();
  const [resolving, setResolving] = useState<string | null>(null);

  // Saved addresses are stored as text only (no coordinates). When one is
  // chosen for pickup we forward-geocode it so the map + live distance work —
  // otherwise the pickup has no position and nothing shows on the map.
  const pickSavedAddress = async (a: Address) => {
    const text = formatAddress(a);
    bookingDraftStore.setPickup({ address: text }); // show immediately
    setResolving(a.id);
    try {
      const loc = await resolvePlace({ description: text });
      if (loc?.lat != null) {
        bookingDraftStore.setPickup({ address: loc.address || text, lat: loc.lat, lng: loc.lng });
      }
    } catch {
      /* keep the text-only pickup */
    } finally {
      setResolving(null);
    }
  };

  // Keep the saved-contacts + family + saved-addresses lists fresh on focus
  // (e.g. after adding one on the respective add screen).
  useFocusEffect(
    React.useCallback(() => {
      contactsStore.load().catch(() => undefined);
      familyStore.load().catch(() => undefined);
      addressStore.load().catch(() => undefined);
    }, []),
  );

  // Reflect the toggle: "for someone else" only when a recipient is selected.
  useEffect(() => {
    setMode(recipient ? 'me' : 'now');
  }, [recipient]);

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Plan your Ambulance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: verticalScale(90) }]}
      >
        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => {
              setMode('now');
              contactsStore.clearRecipient();
            }}
            style={[styles.pill, mode === 'now' ? styles.pillActive : styles.pillIdle]}
          >
            <MapPinIcon size={scale(15)} color={mode === 'now' ? colors.textWhite : colors.brandRed} />
            <Text style={[styles.pillText, mode === 'now' && styles.pillTextActive]}>For Me</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('me');
              setContactOpen(true);
            }}
            style={[styles.pill, mode === 'me' ? styles.pillActive : styles.pillIdle]}
          >
            <PersonIcon size={scale(15)} color={mode === 'me' ? colors.textWhite : colors.textPrimary} />
            <Text style={[styles.pillText, mode === 'me' && styles.pillTextActive]}>For Someone</Text>
          </Pressable>
        </View>

        {/* Selected recipient banner */}
        {recipient ? (
          <Pressable style={[styles.recipientCard, cardShadow]} onPress={() => setContactOpen(true)}>
            <View style={styles.recipientIcon}>
              <PersonIcon size={scale(18)} color={colors.directionsBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{recipient.name}</Text>
              <Text style={styles.recipientPhone}>{recipient.phone}</Text>
            </View>
            <Text style={styles.recipientChange}>Change</Text>
          </Pressable>
        ) : null}

        {/* Pickup / Drop card — reflects the real chosen pickup. */}
        <View style={[styles.routeCard, cardShadow]}>
          <View style={styles.routeRow}>
            <OriginMarkerIcon size={scale(15)} />
            <Text style={styles.routeValue} numberOfLines={2}>
              {pickup?.address || 'Current location (GPS)'}
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <DestMarkerIcon size={scale(14)} />
            <Text style={styles.routeLabel}>Drop Location — set on the next screen</Text>
          </View>
        </View>

        {/* Saved addresses (real, from the backend) */}
        <Text style={styles.sectionLabel}>Choose a pickup address</Text>
        <View style={[styles.listCard, cardShadow]}>
          {/* Always offer the live GPS option first. */}
          <AddressRow
            title="Use current location"
            address="Pick up where you are right now (GPS)"
            divider={addresses.length > 0}
            onPress={() => bookingDraftStore.setPickup(null)}
          />
          {addresses.map((a, i) => (
            <AddressRow
              key={a.id}
              title={a.isDefault ? 'Home (Default)' : 'Saved address'}
              address={resolving === a.id ? 'Locating…' : formatAddress(a)}
              divider={i < addresses.length - 1}
              onPress={() => pickSavedAddress(a)}
            />
          ))}
          {addresses.length === 0 && (
            <Text style={styles.emptyHint}>No saved addresses yet — add one to reuse it here.</Text>
          )}
        </View>

        {/* Manage / add addresses (real screen). */}
        <Pressable style={styles.cityLink} onPress={() => navigation.navigate('AddressList')}>
          <Text style={styles.cityText}>Manage saved addresses</Text>
          <ChevronForwardIcon size={scale(16)} color={colors.linkBlue} />
        </Pressable>
      </ScrollView>

      {/* Bottom button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + verticalScale(10) }]}>
        <Pressable
          onPress={() => navigation.navigate('PlanAmbulanceMap', { mode: 'pickup', next: 'select' })}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Search address or set on map</Text>
        </Pressable>
      </View>

      <ContactSheet
        visible={contactOpen}
        onClose={() => setContactOpen(false)}
        contacts={contacts}
        familyMembers={familyMembers}
        selectedId={recipient?.id}
        onSelect={(c) => contactsStore.setRecipient({ ...c, source: 'contact' })}
        onSelectFamily={(m) =>
          // Reuse the recipient slot for a family member; `source: 'family'`
          // makes the booking send familyMemberId instead of contactId.
          contactsStore.setRecipient({
            id: m.id,
            name: m.name,
            phone: m.phone || '',
            relation: m.relation,
            source: 'family',
          })
        }
        onAddNew={() => navigation.navigate('AddContact')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: scale(18),
    letterSpacing: -0.3,
    color: colors.textBlack,
    marginLeft: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(8),
  },

  /* toggle */
  toggleRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    width: scale(126),
    height: verticalScale(36),
    borderRadius: scale(20),
  },
  pillActive: {
    backgroundColor: colors.planBlue,
    borderWidth: 0.3,
    borderColor: '#969696',
  },
  pillIdle: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.toggleBorder,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },
  pillTextActive: { color: colors.textWhite },

  /* selected recipient */
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginTop: verticalScale(14),
  },
  recipientIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.avatarCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientName: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  recipientPhone: {
    fontFamily: fonts.regular,
    fontSize: scale(12),
    color: colors.inkMuted,
    marginTop: verticalScale(2),
  },
  recipientChange: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.directionsBlue,
  },

  /* route card */
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#CDCDCD',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(16),
    marginTop: verticalScale(20),
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  routeLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: scale(13),
    letterSpacing: -0.3,
    color: '#666666',
  },
  routeValue: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: scale(13),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: '#4A4A4A',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
  },
  emptyHint: {
    fontFamily: fonts.regular,
    fontSize: scale(12),
    color: colors.inkMuted,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(8),
    textAlign: 'center',
  },
  routeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D9D9D9',
    marginVertical: verticalScale(12),
    marginLeft: scale(30),
  },

  /* list card */
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(8),
    marginTop: verticalScale(20),
  },

  cityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(22),
    marginLeft: scale(8),
  },
  cityText: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.linkBlue,
  },

  /* footer */
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(8),
    backgroundColor: colors.background,
  },
  cta: {
    height: verticalScale(48),
    borderRadius: scale(12),
    backgroundColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: scale(18),
    color: colors.textWhite,
  },
});
