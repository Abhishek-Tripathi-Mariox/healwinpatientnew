import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {guestSosApi} from '../api/misc';
import {getCurrentLocation} from '../services/geo';
import {isValidMobile, onlyDigits} from '../utils/validation';
import {colors, fonts, scale, spacing, verticalScale} from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuestSos'>;

/** India's national emergency number — same as the website's SOS panel. */
const EMERGENCY_NUMBER = '112';
const COUNTDOWN_SECONDS = 5;

/**
 * Emergency SOS for someone who is NOT logged in.
 *
 * Mirrors the website's SOS panel: confirm -> 5s cancellable countdown ->
 * the alert is posted to the control room AND the phone dialler opens. No
 * login, no form to fill — in an emergency the only required action is
 * confirming you meant it.
 *
 * Location is fetched on mount and refreshed when the countdown starts, so
 * whatever position we have is the freshest available at the moment it fires.
 */
export const GuestSosScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [phase, setPhase] = useState<'confirm' | 'counting' | 'sent'>(
    'confirm',
  );
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [locReady, setLocReady] = useState(false);
  // The control room needs a number to call back on — a caller who cannot be
  // reached is a caller who cannot be helped, so mobile is required. The name
  // is a nicety and stays optional.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const phoneOk = isValidMobile(phone);
  const callerRef = useRef({name: '', phone: ''});
  useEffect(() => {
    callerRef.current = {name: name.trim(), phone: onlyDigits(phone)};
  }, [name, phone]);

  const coords = useRef<{lat: number; lng: number} | null>(null);
  const cancelled = useRef(false);
  const fired = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshLocation = useCallback(async () => {
    const loc = await getCurrentLocation().catch(() => null);
    if (loc) {
      coords.current = {lat: loc.lat, lng: loc.lng};
      setLocReady(true);
    }
  }, []);

  // Start locating immediately so a position is ready before they confirm.
  useEffect(() => {
    refreshLocation();
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [refreshLocation]);

  /**
   * Fire once. Guarded by a ref because the countdown effect can re-run, and a
   * duplicate emergency wastes an ambulance.
   */
  const fireSOS = useCallback(() => {
    if (fired.current || cancelled.current) {
      return;
    }
    fired.current = true;

    // Fire-and-forget: never make the caller wait on the network before the
    // dialler opens. The server resolves the address from these coordinates.
    guestSosApi
      .call({
        name: callerRef.current.name || undefined,
        phone: callerRef.current.phone,
        latitude: coords.current?.lat,
        longitude: coords.current?.lng,
      })
      .catch(() => undefined);

    setPhase('sent');
    Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => undefined);
  }, []);

  const startCountdown = () => {
    cancelled.current = false;
    fired.current = false;
    setCountdown(COUNTDOWN_SECONDS);
    setPhase('counting');
    refreshLocation(); // freshest fix at the moment it matters
    timer.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          if (timer.current) {
            clearInterval(timer.current);
          }
          timer.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // Fire outside the state updater, once the countdown actually reaches zero.
  useEffect(() => {
    if (phase === 'counting' && countdown === 0) {
      fireSOS();
    }
  }, [phase, countdown, fireSOS]);

  const cancel = () => {
    cancelled.current = true;
    if (timer.current) {
      clearInterval(timer.current);
    }
    timer.current = null;
    setPhase('confirm');
    setCountdown(COUNTDOWN_SECONDS);
  };

  if (phase === 'counting') {
    return (
      <View style={[styles.root, styles.alarm]}>
        <Text style={styles.countLabel}>Calling emergency help in</Text>
        <Text style={styles.count}>{countdown}</Text>
        <Text style={styles.countSub}>
          Your location is being shared with our control room.
        </Text>
        <Pressable style={styles.cancelBtn} onPress={cancel}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'sent') {
    return (
      <View style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneTitle}>Emergency alert sent</Text>
          <Text style={styles.doneSub}>
            Our control room has your location and is arranging help. If the
            call did not start, dial {EMERGENCY_NUMBER} now.
          </Text>
          <Pressable
            style={styles.callBtn}
            onPress={() =>
              Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => undefined)
            }>
            <Text style={styles.callText}>📞 Call {EMERGENCY_NUMBER}</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryText}>
              Login to track this request
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.center}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>🚨</Text>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.sub}>
          We will alert our control room with your location and start a call to{' '}
          {EMERGENCY_NUMBER}. You get {COUNTDOWN_SECONDS} seconds to cancel.
        </Text>

        <Text style={locReady ? styles.locOk : styles.locWait}>
          {locReady ? '📍 Location ready' : 'Getting your location…'}
        </Text>

        <View style={styles.form}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name (optional)"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
          <TextInput
            value={phone}
            onChangeText={t => setPhone(onlyDigits(t))}
            placeholder="Mobile number (required)"
            placeholderTextColor={colors.inkMuted}
            keyboardType="phone-pad"
            maxLength={10}
            style={[styles.input, !!phone && !phoneOk && styles.inputBad]}
          />
          <Text style={styles.helper}>
            {phone && !phoneOk
              ? 'Enter a valid 10-digit mobile number.'
              : 'The control room will call you back on this number.'}
          </Text>
        </View>

        <Pressable
          style={({pressed}) => [
            styles.sosBtn,
            !phoneOk && styles.sosBtnDisabled,
            pressed && phoneOk && {opacity: 0.85},
          ]}
          onPress={startCountdown}
          disabled={!phoneOk}
          accessibilityRole="button"
          accessibilityState={{disabled: !phoneOk}}
          accessibilityLabel="Send emergency SOS">
          <Text style={styles.sosText}>SEND SOS</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Go back</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  alarm: {
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  icon: {fontSize: scale(56)},
  title: {
    fontFamily: fonts.bold,
    fontSize: scale(24),
    color: colors.ink,
    marginTop: verticalScale(8),
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: verticalScale(10),
    lineHeight: verticalScale(19),
  },
  locOk: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.creditGreen,
    marginTop: verticalScale(16),
  },
  locWait: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.inkMuted,
    marginTop: verticalScale(16),
  },
  form: {width: '100%', marginTop: verticalScale(18)},
  input: {
    backgroundColor: colors.surface,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: colors.dashBorder,
    paddingHorizontal: scale(14),
    height: verticalScale(48),
    fontFamily: fonts.regular,
    fontSize: scale(14),
    color: colors.ink,
    marginBottom: verticalScale(10),
  },
  inputBad: {borderColor: colors.brandRed},
  helper: {
    fontFamily: fonts.regular,
    fontSize: scale(11),
    color: colors.inkMuted,
    textAlign: 'center',
  },
  sosBtnDisabled: {opacity: 0.45},
  sosBtn: {
    marginTop: verticalScale(24),
    backgroundColor: colors.brandRed,
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandRed,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  sosText: {
    fontFamily: fonts.bold,
    fontSize: scale(26),
    color: colors.textWhite,
    letterSpacing: 1,
  },
  countLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(16),
    color: colors.textWhite,
    opacity: 0.9,
  },
  count: {
    fontFamily: fonts.bold,
    fontSize: scale(96),
    color: colors.textWhite,
    lineHeight: scale(110),
  },
  countSub: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.textWhite,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  cancelBtn: {
    marginTop: verticalScale(40),
    backgroundColor: colors.surface,
    paddingHorizontal: scale(48),
    height: verticalScale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bold,
    fontSize: scale(17),
    color: colors.brandRed,
    letterSpacing: 1,
  },
  doneIcon: {fontSize: scale(52)},
  doneTitle: {
    fontFamily: fonts.bold,
    fontSize: scale(21),
    color: colors.ink,
    marginTop: verticalScale(10),
  },
  doneSub: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: verticalScale(8),
  },
  callBtn: {
    marginTop: verticalScale(24),
    backgroundColor: colors.brandRed,
    paddingHorizontal: scale(26),
    height: verticalScale(52),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  callText: {
    fontFamily: fonts.bold,
    fontSize: scale(15),
    color: colors.textWhite,
  },
  secondary: {marginTop: verticalScale(16)},
  secondaryText: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.linkBlue,
  },
});
