import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, ServiceCard } from '../components';
import { HospitalBuildingIcon, PharmacyIcon } from '../components/icons';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const LOREM = 'Lorem ipsum dolor sit amet, consectetur.';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ServiceSelect'>;

export const ServiceSelectScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}
      >
        <Text style={styles.title}>What are you looking for ?</Text>
        <Text style={styles.subtitle}>Choose a Service to continue</Text>

        <ServiceCard
          title="Hospital"
          subtitle={LOREM}
          Icon={HospitalBuildingIcon}
          onPress={() => navigation.navigate('CentresList')}
          style={styles.card}
        />
        <ServiceCard
          title="Pharmacy"
          subtitle={LOREM}
          Icon={PharmacyIcon}
          onPress={() => navigation.navigate('CentresList')}
          style={styles.card}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(36),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(22),
    color: colors.textBlack,
  },
  subtitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.serviceSub,
    marginTop: verticalScale(8),
    marginBottom: verticalScale(28),
  },
  card: {
    marginBottom: verticalScale(24),
  },
});
