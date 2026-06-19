import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BellIcon, CheckCircleIcon, IconProps, MapPinIcon, PhoneIcon } from '../components/icons';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

interface Perm {
  key: string;
  title: string;
  desc: string;
  Icon: React.FC<IconProps>;
}

const PERMS: Perm[] = [
  { key: 'loc', title: 'Location', desc: 'So we can dispatch an ambulance to you', Icon: MapPinIcon },
  { key: 'notif', title: 'Notifications', desc: 'Live updates on your booking & arrival', Icon: BellIcon },
  { key: 'call', title: 'Phone', desc: 'One-tap calling to driver & helpline', Icon: PhoneIcon },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [granted, setGranted] = useState<Record<string, boolean>>({});

  return (
    <View style={[styles.root, { paddingTop: insets.top + verticalScale(30), paddingBottom: insets.bottom + verticalScale(20) }]}>
      <View style={styles.body}>
        <Text style={styles.title}>Before we begin</Text>
        <Text style={styles.sub}>HealWin needs a few permissions to keep you safe.</Text>

        <View style={{ marginTop: verticalScale(24), gap: verticalScale(14) }}>
          {PERMS.map((p) => {
            const on = !!granted[p.key];
            return (
              <Pressable
                key={p.key}
                onPress={() => setGranted((g) => ({ ...g, [p.key]: !g[p.key] }))}
                style={[styles.card, cardShadow]}
              >
                <View style={styles.iconWrap}>
                  <p.Icon size={scale(22)} color={colors.directionsBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardDesc}>{p.desc}</Text>
                </View>
                {on ? (
                  <CheckCircleIcon size={scale(24)} color={colors.creditGreen} />
                ) : (
                  <View style={styles.toggleOff} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={styles.note}>You can change these later in system settings.</Text>
        <Pressable
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  body: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: scale(24), color: colors.textBlack },
  sub: { fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(8) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: scale(16),
  },
  iconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: '#EAF1FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack },
  cardDesc: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(3) },
  toggleOff: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: colors.inputBorder,
  },
  note: { textAlign: 'center', fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginBottom: verticalScale(12) },
  cta: { height: verticalScale(52), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
});
