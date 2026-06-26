import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { svgs } from '../svgAssets';
import { colors, fonts, scale, verticalScale } from '../theme';
import { floatingShadow } from '../theme/shadows';
import { useAuth } from '../state/authStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

/**
 * Startup / splash — shows the HealWin logo while the session is restored, then
 * routes to Home (logged in) or Login (guest). Waits for both a minimum display
 * time and the auth bootstrap to finish.
 */
export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { status } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => setMinTimePassed(true), 1400);
    return () => clearTimeout(t);
  }, [fade, scaleAnim]);

  // Navigate once BOTH the minimum splash time has elapsed AND auth resolved.
  // Driven purely by state (no stale closures), so whichever finishes last wins.
  useEffect(() => {
    if (!minTimePassed || status === 'loading') return;
    navigation.reset({
      index: 0,
      routes: [{ name: status === 'authed' ? 'Home' : 'Login' }],
    });
  }, [minTimePassed, status, navigation]);

  const LogoMark = svgs.logoMark;
  const Logo = svgs.logo;

  return (
    <View style={styles.root}>
      <Animated.View style={{ opacity: fade, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <View style={[styles.markWrap, floatingShadow]}>
          <LogoMark width={scale(96)} height={scale(96)} preserveAspectRatio="xMidYMid meet" />
        </View>
        <Logo width={scale(220)} height={scale(45)} preserveAspectRatio="xMidYMid meet" style={styles.wordmark} />
        <Text style={styles.tag}>Patient</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrap: {
    width: scale(132),
    height: scale(132),
    borderRadius: scale(28),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    marginTop: verticalScale(28),
  },
  tag: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.directionsBlue,
    marginTop: verticalScale(14),
    letterSpacing: 1,
  },
});
