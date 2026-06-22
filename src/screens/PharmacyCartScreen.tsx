import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';

import { ScreenHeader } from '../components';
import { CheckCircleIcon, MapPinIcon, MinusIcon, PlusIcon, UploadCloudIcon } from '../components/icons';
import { cartStore, useCart } from '../state/cartStore';
import { useAddresses } from '../state/addressStore';
import { pharmacyApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PharmacyCart'>;

export const PharmacyCartScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const items = useCart();
  const addresses = useAddresses();
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const total = cartStore.total();
  const [placing, setPlacing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);

  const pickPrescription = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }).catch(() => null);
    const picked = res?.assets?.[0];
    if (!picked?.uri) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', { uri: picked.uri, type: picked.type || 'image/jpeg', name: picked.fileName || `rx_${Date.now()}.jpg` } as any);
      const out = await pharmacyApi.uploadPrescription(form);
      setPrescriptionUrl(out?.url || null);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const placeOrder = async () => {
    if (placing || items.length === 0) return;
    setPlacing(true);
    try {
      await pharmacyApi.createOrder({
        items: items.map((i) => ({ productId: i.product.id, qty: i.quantity })),
        addressId: def?.id,
        ...(prescriptionUrl ? { prescriptionUrl } : {}),
      });
      cartStore.clear?.();
      Alert.alert('Order placed', 'Your pharmacy order has been placed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Order failed', e?.message || 'Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="My Cart" onBack={() => navigation.goBack()} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Pressable style={styles.browse} onPress={() => navigation.goBack()}>
            <Text style={styles.browseText}>Browse Pharmacy</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="My Cart" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(100) }]}>
        <Text style={styles.section}>Items ({cartStore.count()})</Text>
        {items.map((i) => (
          <View key={i.product.id} style={[styles.item, cardShadow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{i.product.name}</Text>
              <Text style={styles.each}>₹{i.product.price} each</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => cartStore.remove(i.product.id)} hitSlop={6} style={styles.step}><MinusIcon size={scale(16)} color={colors.textWhite} /></Pressable>
              <Text style={styles.qty}>{i.quantity}</Text>
              <Pressable onPress={() => cartStore.add(i.product)} hitSlop={6} style={styles.step}><PlusIcon size={scale(16)} color={colors.textWhite} /></Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.section}>Delivery address</Text>
        <Pressable style={[styles.addr, cardShadow]} onPress={() => navigation.navigate('AddressList')}>
          <MapPinIcon size={scale(20)} />
          <Text style={styles.addrText} numberOfLines={2}>
            {def ? `${def.line1}, ${def.city}, ${def.state} - ${def.pincode}` : 'Add new address'}
          </Text>
        </Pressable>

        <Text style={styles.section}>Prescription (required for Rx)</Text>
        <Pressable style={[styles.upload, !!prescriptionUrl && styles.uploadDone]} onPress={pickPrescription} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.directionsBlue} />
          ) : prescriptionUrl ? (
            <>
              <CheckCircleIcon size={scale(26)} color={colors.creditGreen} />
              <Text style={styles.uploadText}>Prescription uploaded · tap to change</Text>
            </>
          ) : (
            <>
              <UploadCloudIcon size={scale(28)} color={colors.textPrimary} />
              <Text style={styles.uploadText}>Upload prescription</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + verticalScale(10) }]}>
        <Text style={styles.barTotal}>₹{total}</Text>
        <Pressable disabled={placing} style={({ pressed }) => [styles.place, (pressed || placing) && styles.pressed]} onPress={placeOrder}>
          <Text style={styles.placeText}>{placing ? 'Placing…' : 'Place Order'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: verticalScale(16) },
  emptyText: { fontFamily: fonts.medium, fontSize: scale(15), color: colors.inkMuted },
  browse: { paddingHorizontal: scale(22), height: verticalScale(46), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  browseText: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textWhite },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  section: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack, marginTop: verticalScale(20), marginBottom: verticalScale(12) },
  item: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14), marginBottom: verticalScale(12) },
  name: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.textBlack },
  each: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(4) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: scale(10), backgroundColor: colors.directionsBlue, borderRadius: scale(8), paddingHorizontal: scale(8), height: verticalScale(32) },
  step: { width: scale(20), alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.bold, fontSize: scale(13), color: colors.textWhite, minWidth: scale(14), textAlign: 'center' },
  addr: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(16) },
  addrText: { flex: 1, fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack },
  upload: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(12), height: verticalScale(55), borderRadius: scale(12), borderWidth: 1, borderColor: colors.dashBorder, borderStyle: 'dashed', backgroundColor: colors.dashBg },
  uploadDone: { borderColor: colors.creditGreen, borderStyle: 'solid', backgroundColor: '#F0F8F0' },
  uploadText: { fontFamily: fonts.medium, fontSize: scale(15), color: colors.textBlack },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingHorizontal: spacing.lg, paddingTop: verticalScale(12) },
  barTotal: { fontFamily: fonts.bold, fontSize: scale(18), color: colors.textBlack },
  place: { paddingHorizontal: scale(28), height: verticalScale(48), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  placeText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
});
