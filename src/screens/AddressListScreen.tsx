import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Fab, ScreenHeader } from '../components';
import { MapPinIcon } from '../components/icons';
import { addressStore, useAddresses } from '../state/addressStore';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddressList'>;

export const AddressListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const addresses = useAddresses();

  // Refresh whenever the screen gains focus (mount + after adding an address).
  useFocusEffect(
    React.useCallback(() => {
      addressStore.load().catch(() => undefined);
    }, []),
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Saved Addresses" onBack={() => navigation.goBack()} />

      {addresses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No addresses saved</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(90) }]}>
          {addresses.map((a) => (
            <View key={a.id} style={[styles.card, cardShadow]}>
              <MapPinIcon size={scale(22)} />
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.line1}>{a.line1}</Text>
                  {a.isDefault && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.rest}>
                  {a.line2 ? a.line2 + '\n' : ''}
                  {a.city}, {a.state} - {a.pincode}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Fab
        icon="plus"
        onPress={() => navigation.navigate('AddressEdit')}
        accessibilityLabel="Add address"
        style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: scale(15), color: colors.inkMuted },
  list: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(6), gap: verticalScale(14) },
  card: {
    flexDirection: 'row',
    gap: scale(12),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: scale(16),
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  line1: { flex: 1, fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  badge: { backgroundColor: '#EAF1FE', borderRadius: scale(6), paddingHorizontal: scale(8), paddingVertical: verticalScale(2) },
  badgeText: { fontFamily: fonts.medium, fontSize: scale(10), color: colors.directionsBlue },
  rest: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(5), lineHeight: scale(17) },
  fab: { position: 'absolute', right: spacing.lg },
});
