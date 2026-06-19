import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../components';
import { ClockIcon, PhoneIcon } from '../components/icons';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { floatingShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExecutiveCall'>;

export const ExecutiveCallScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.root}>
      <View style={[styles.backWrap, { top: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.center}>
        {/* Glossy green phone badge in concentric rings */}
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <View style={[styles.phone, floatingShadow]}>
              <PhoneIcon size={scale(54)} color={colors.textWhite} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>“Our Executive will call you shortly”</Text>

        <View style={styles.etaRow}>
          <ClockIcon size={scale(18)} color="#6B6A6A" />
          <Text style={styles.eta}>Estimated Time : 2:00 min</Text>
        </View>
      </View>
    </View>
  );
};

const RING_OUTER = scale(180);
const RING_INNER = scale(150);
const PHONE = scale(120);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  backWrap: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  ringOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    backgroundColor: '#EEF1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    backgroundColor: '#E6ECF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: PHONE,
    height: PHONE,
    borderRadius: PHONE / 2,
    backgroundColor: '#3DBE6B',
    borderWidth: scale(3),
    borderColor: '#2E9E55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: scale(17),
    color: '#0F0F0F',
    textAlign: 'center',
    marginTop: verticalScale(44),
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(16),
  },
  eta: {
    fontFamily: fonts.medium,
    fontSize: scale(16),
    color: '#6B6A6A',
  },
});
