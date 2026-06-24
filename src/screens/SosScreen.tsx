import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { CheckCircleIcon, PhoneIcon, WarningIcon } from '../components/icons';
import { sosApi } from '../api/misc';
import { useProfile } from '../state/profileStore';
import { rideStore } from '../state/rideStore';
import { socketService } from '../services/socket';
import { getCurrentLocation } from '../services/geo';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

const TYPES = ['Medical Emergency', 'Accident', 'Natural Disaster', 'Other'];
type Phase = 'choose' | 'form' | 'countdown' | 'sent';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Sos'>;

export const SosScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useProfile();
  const [phase, setPhase] = useState<Phase>('choose');
  // 'call' = one-tap direct ambulance (no form); 'help' = detailed form.
  const [mode, setMode] = useState<'call' | 'help'>('call');
  const [type, setType] = useState('Medical Emergency');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [people, setPeople] = useState('');
  const [desc, setDesc] = useState('');
  const [seconds, setSeconds] = useState(5);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const coords = useRef<{ lat: number; lng: number } | null>(null);
  const sent = useRef(false);
  const [assigned, setAssigned] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Once the SOS is sent, wait for the dispatcher to assign an ambulance. The
  // backend pushes `booking:accepted` to this user the instant a crew is
  // dispatched; we also poll the active-SOS endpoint as a fallback. On
  // assignment we load the live ride and open the tracking screen.
  useEffect(() => {
    if (phase !== 'sent') return;
    let alive = true;
    const goTrack = async () => {
      const ride = await rideStore.loadActive().catch(() => null);
      if (alive && ride) {
        setAssigned(true);
        navigation.navigate('Tracking');
      }
    };
    void socketService.connect();
    const off = socketService.on('booking:accepted', () => void goTrack());
    void goTrack(); // in case it was assigned before the listener attached
    const poll = setInterval(goTrack, 10000);
    return () => {
      alive = false;
      off();
      clearInterval(poll);
    };
  }, [phase, navigation]);

  // Warm up GPS the moment the SOS screen opens — a first fix can take 5–15s,
  // far longer than the 5s countdown, so capturing only at countdown time
  // almost always fired before coordinates were ready ("Location unavailable").
  useEffect(() => {
    void getCurrentLocation().then((loc) => {
      if (loc) coords.current = { lat: loc.lat, lng: loc.lng };
    });
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setSeconds(5);
    sent.current = false;
    // Refresh the fix during the countdown too (keeps the latest position).
    void getCurrentLocation().then((loc) => {
      if (loc) coords.current = { lat: loc.lat, lng: loc.lng };
    });

    // Raise an SOS that lands in the admin SOS Dashboard — SOS Call →
    // "SOS Calls" tab, SOS Help → "SOS Forms" tab — NOT in Ambulance Requests.
    // The dispatcher then dispatches a crew from there.
    const sendSos = async () => {
      if (sent.current) return;
      // Location is MANDATORY for an SOS — without it the dispatcher has no
      // point to send a crew to, so the request can't be dispatched at all.
      // Resolve it FIRST; if the warm-up fix hasn't landed, make one final
      // awaited attempt (the 30s GPS cache makes this near-instant when a fix
      // already exists).
      setResolving(true);
      let loc = coords.current;
      if (!loc) {
        loc = await getCurrentLocation().catch(() => null);
        if (loc) coords.current = { lat: loc.lat, lng: loc.lng };
      }
      setResolving(false);

      // Hard block: no location → do NOT send. Surface a clear error and let
      // the user enable Location / retry. An undispatchable SOS is worse than
      // a blocked one (the patient would think help is coming when it isn't).
      if (!loc) {
        setPhase(mode === 'call' ? 'choose' : 'form');
        Alert.alert(
          'Location required',
          'We couldn’t get your location. An ambulance cannot be dispatched without it.\n\nPlease turn on Location (GPS), allow location access for HealWin, then try again.',
          [
            { text: 'Open settings', onPress: () => void Linking.openSettings().catch(() => undefined) },
            { text: 'Retry', onPress: () => setPhase('countdown') },
          ],
        );
        return;
      }

      sent.current = true;
      setPhase('sent');
      await sosApi
        .trigger({
          submissionType: mode === 'call' ? 'CALL' : 'FORM',
          type: mode === 'call' ? 'Medical Emergency' : type,
          name: name.trim() || profile.name || undefined,
          description: desc || undefined,
          address: 'Current location',
          location: { lat: loc.lat, lng: loc.lng },
        })
        .catch(() => undefined);
    };

    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          void sendSos();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase]);

  if (phase === 'choose') {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Emergency SOS" onBack={() => navigation.goBack()} />
        <View style={styles.chooseWrap}>
          <Text style={styles.chooseTitle}>How do you need help?</Text>

          {/* SOS Call — one tap, direct ambulance */}
          <Pressable
            style={({ pressed }) => [styles.chooseCard, styles.callCard, pressed && styles.pressed]}
            onPress={() => {
              setMode('call');
              setPhase('countdown');
            }}
          >
            <View style={[styles.chooseIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <PhoneIcon size={scale(26)} color={colors.textWhite} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.callTitle}>SOS Call</Text>
              <Text style={styles.callSub}>One tap — ambulance dispatched to your location right away.</Text>
            </View>
          </Pressable>

          {/* SOS Help — detailed form */}
          <Pressable
            style={({ pressed }) => [styles.chooseCard, styles.helpCard, pressed && styles.pressed]}
            onPress={() => {
              setMode('help');
              setPhase('form');
            }}
          >
            <View style={[styles.chooseIcon, { backgroundColor: '#EAF1FE' }]}>
              <WarningIcon size={scale(26)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.helpTitle}>SOS To Help</Text>
              <Text style={styles.helpSub}>Add patient name, type & details before dispatching.</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'sent') {
    return (
      <View style={styles.root}>
        <ScreenHeader title="SOS" onBack={() => navigation.popToTop()} />
        <View style={styles.center}>
          <CheckCircleIcon size={scale(96)} color={colors.creditGreen} />
          <Text style={styles.sentTitle}>SOS sent</Text>
          <Text style={styles.sentBody}>
            {assigned
              ? 'Ambulance assigned — opening live tracking…'
              : 'Our dispatch team has been notified and is finding the nearest ambulance. This screen updates live the moment a crew is assigned.'}
          </Text>
          <Pressable style={styles.primary} onPress={() => navigation.navigate('Tracking')}>
            <Text style={styles.primaryText}>Track ambulance</Text>
          </Pressable>
          <Pressable onPress={() => navigation.popToTop()}>
            <Text style={styles.secondaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'countdown') {
    return (
      <View style={[styles.root, styles.redBg]}>
        <View style={styles.center}>
          <View style={styles.countCircle}>
            <Text style={styles.countNum}>{seconds}</Text>
          </View>
          <Text style={styles.countText}>
            {resolving ? 'Getting your location…' : `Dispatching SOS in ${seconds}s…`}
          </Text>
          <Text style={styles.countSub}>Dispatch to your current location</Text>
          <Pressable style={styles.cancel} onPress={() => setPhase(mode === 'call' ? 'choose' : 'form')}>
            <Text style={styles.cancelText}>Cancel SOS</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="SOS To Help" onBack={() => setPhase('choose')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(110) }]}
      >
        <View style={[styles.banner, cardShadow]}>
          <WarningIcon size={scale(28)} />
          <Text style={styles.bannerText}>Dispatch an ambulance to your location immediately.</Text>
        </View>

        <Text style={styles.label}>Emergency Type *</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Field label="Name *" value={name} onChangeText={setName} placeholder="Your name" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="10-digit mobile" keyboardType="number-pad" maxLength={10} />
        <Field label="No. of People" value={people} onChangeText={setPeople} placeholder="e.g. 1" keyboardType="number-pad" maxLength={3} />

        <Text style={styles.label}>Describe the emergency…</Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Optional details"
          placeholderTextColor={colors.placeholder}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + verticalScale(10) }]}>
        <Pressable style={({ pressed }) => [styles.confirm, pressed && styles.pressed]} onPress={() => setPhase('countdown')}>
          <Text style={styles.confirmText}>Confirm SOS</Text>
        </Pressable>
      </View>
    </View>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}> = ({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength }) => (
  <View style={{ marginTop: verticalScale(14) }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  redBg: { backgroundColor: '#B3160E' },
  chooseWrap: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(16), gap: verticalScale(16) },
  chooseTitle: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack, marginBottom: verticalScale(4) },
  chooseCard: { flexDirection: 'row', alignItems: 'center', gap: scale(14), borderRadius: radius.card, padding: scale(18), ...cardShadow },
  chooseIcon: { width: scale(52), height: scale(52), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center' },
  callCard: { backgroundColor: colors.brandRed },
  callTitle: { fontFamily: fonts.bold, fontSize: scale(17), color: colors.textWhite },
  callSub: { fontFamily: fonts.medium, fontSize: scale(12), color: 'rgba(255,255,255,0.9)', marginTop: verticalScale(3) },
  helpCard: { backgroundColor: colors.surface },
  helpTitle: { fontFamily: fonts.bold, fontSize: scale(17), color: colors.textBlack },
  helpSub: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(3) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: verticalScale(16) },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  banner: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: '#FCE9E9', borderRadius: radius.card, padding: scale(16) },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: scale(13), color: colors.brandRedDark },
  label: { fontFamily: fonts.medium, fontSize: scale(13), color: '#4A4A4A', marginTop: verticalScale(16), marginBottom: verticalScale(8) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  chip: { paddingHorizontal: scale(14), height: verticalScale(34), borderRadius: scale(17), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brandRed },
  chipText: { fontFamily: fonts.medium, fontSize: scale(13), color: '#5B5B5B' },
  chipTextActive: { color: colors.textWhite },
  input: {
    height: verticalScale(46), borderRadius: scale(10), borderWidth: 1, borderColor: colors.inputBorder,
    backgroundColor: colors.surface, paddingHorizontal: scale(14), fontFamily: fonts.regular, fontSize: scale(14), color: colors.textBlack,
  },
  textarea: {
    height: verticalScale(90), borderRadius: scale(10), borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface,
    paddingHorizontal: scale(14), paddingTop: verticalScale(12), fontFamily: fonts.regular, fontSize: scale(14), color: colors.textBlack,
  },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingHorizontal: spacing.lg, paddingTop: verticalScale(12) },
  confirm: { height: verticalScale(52), borderRadius: scale(12), backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  confirmText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  countCircle: { width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: scale(3), borderColor: colors.textWhite, alignItems: 'center', justifyContent: 'center' },
  countNum: { fontFamily: fonts.bold, fontSize: scale(56), color: colors.textWhite },
  countText: { fontFamily: fonts.bold, fontSize: scale(20), color: colors.textWhite, marginTop: verticalScale(10) },
  countSub: { fontFamily: fonts.medium, fontSize: scale(13), color: 'rgba(255,255,255,0.85)' },
  cancel: { paddingHorizontal: scale(30), height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(20) },
  cancelText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.brandRed },
  sentTitle: { fontFamily: fonts.bold, fontSize: scale(22), color: colors.textBlack },
  sentBody: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, lineHeight: scale(20) },
  primary: { paddingHorizontal: scale(24), height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(10) },
  primaryText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  secondaryText: { fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(12) },
});
