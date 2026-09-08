import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {colors, fonts, scale, spacing, verticalScale} from '../theme';
import {svgs} from '../svgAssets';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

/**
 * Entry screen for a user who is NOT logged in.
 *
 * An emergency must never be gated behind an OTP. This offers the two things
 * someone opening the app actually needs: call an ambulance right now, or sign
 * in for their records. SOS is deliberately the larger, first, unmissable
 * option — the login path is secondary.
 */
export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const Logo = svgs.logo;

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <Logo
          width={scale(200)}
          height={scale(42)}
          preserveAspectRatio="xMidYMid meet"
        />
        <Text style={styles.tag}>Emergency care, on call</Text>
      </View>

      <Pressable
        style={({pressed}) => [styles.sos, pressed && styles.pressed]}
        onPress={() => navigation.navigate('GuestSos')}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS — call an ambulance without logging in">
        <Text style={styles.sosIcon}>🚨</Text>
        <Text style={styles.sosTitle}>EMERGENCY SOS</Text>
        <Text style={styles.sosSub}>
          Call an ambulance now — no login needed
        </Text>
      </Pressable>

      <Pressable
        style={({pressed}) => [styles.login, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Login')}
        accessibilityRole="button">
        <Text style={styles.loginText}>Login / Sign up</Text>
      </Pressable>

      <Text style={styles.note}>
        Log in to book ambulances, view prescriptions, reports and bills.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  brand: {alignItems: 'center', marginBottom: verticalScale(40)},
  tag: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.inkMuted,
    marginTop: verticalScale(8),
  },
  sos: {
    backgroundColor: colors.brandRed,
    borderRadius: scale(18),
    paddingVertical: verticalScale(26),
    alignItems: 'center',
    shadowColor: colors.brandRed,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
  sosIcon: {fontSize: scale(34)},
  sosTitle: {
    fontFamily: fonts.bold,
    fontSize: scale(22),
    color: colors.textWhite,
    marginTop: verticalScale(6),
    letterSpacing: 0.5,
  },
  sosSub: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.textWhite,
    opacity: 0.9,
    marginTop: verticalScale(4),
  },
  login: {
    marginTop: verticalScale(18),
    height: verticalScale(52),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: colors.brandRed,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontFamily: fonts.bold,
    fontSize: scale(15),
    color: colors.brandRed,
  },
  pressed: {opacity: 0.85},
  note: {
    fontFamily: fonts.regular,
    fontSize: scale(11),
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: verticalScale(16),
  },
});
