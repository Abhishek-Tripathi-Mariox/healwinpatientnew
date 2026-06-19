import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { MapPinIcon } from '../components/icons';
import { addressStore, type Address } from '../state/addressStore';
import { authStore } from '../state/authStore';
import { getCurrentLocation, reverseGeocode, reverseGeocodeParts } from '../services/geo';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddressEdit'>;

const ADDRESS_TYPES: Address['addressType'][] = ['Home', 'Work', 'Other'];

export const AddressEditScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [f, setF] = useState({ line1: '', line2: '', city: '', state: '', pincode: '' });
  const [addressType, setAddressType] = useState<Address['addressType']>('Home');
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // Fill the form from the device's real GPS location (reverse-geocoded).
  const useCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setErr('');
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setErr('Could not get your location. Enable location permission and try again.');
        return;
      }
      // Pull structured fields straight from the geocoder so city/state/pincode
      // auto-fill correctly (not a fragile split of the formatted string).
      const parts = await reverseGeocodeParts(loc.lat, loc.lng);
      if (parts) {
        setF((s) => ({
          ...s,
          line1: parts.line1 || parts.formatted || s.line1,
          city: parts.city || s.city,
          state: parts.state || s.state,
          pincode: parts.pincode || s.pincode,
        }));
      } else {
        const addr = await reverseGeocode(loc.lat, loc.lng);
        setF((s) => ({
          ...s,
          line1: addr || `Lat ${loc.lat.toFixed(5)}, Lng ${loc.lng.toFixed(5)}`,
        }));
      }
    } catch (e: any) {
      setErr(e?.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const onSave = async () => {
    if (saving) return;
    if (!f.line1.trim() || !f.city.trim() || !f.pincode.trim()) {
      setErr('Address line 1, city and pincode are required.');
      return;
    }
    if (!/^\d{6}$/.test(f.pincode.trim())) {
      setErr('Enter a valid 6-digit pincode.');
      return;
    }
    setErr('');
    setSaving(true);
    try {
      // Backend requires a contact name + mobile on each address — take them
      // from the logged-in profile so the user doesn't have to re-enter them.
      const profile = authStore.getSnapshot().profile;
      await addressStore.add({
        ...f,
        addressType,
        fullName: profile?.fullName || 'Customer',
        mobileNumber: profile?.mobileNumber || '',
        isDefault,
      });
      navigation.goBack();
    } catch (e: any) {
      setErr(e?.message || 'Could not save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Add Address" onBack={() => navigation.goBack()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(30) }]}
      >
        <Pressable style={styles.locBtn} onPress={useCurrentLocation} disabled={locating}>
          <MapPinIcon size={scale(18)} />
          <Text style={styles.locText}>{locating ? 'Getting location…' : 'Use current location'}</Text>
        </Pressable>

        <Input label="Address line 1" value={f.line1} onChangeText={set('line1')} />
        <Input label="Address line 2" value={f.line2} onChangeText={set('line2')} />
        <Input label="City" value={f.city} onChangeText={set('city')} />
        <Input label="State" value={f.state} onChangeText={set('state')} />
        <Input label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} />

        <Text style={styles.label}>Address type</Text>
        <View style={styles.typeRow}>
          {ADDRESS_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setAddressType(t)}
              style={[styles.typeChip, addressType === t && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, addressType === t && styles.typeChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Set as default</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: colors.directionsBlue }} />
        </View>

        {!!err && <Text style={styles.err}>{err}</Text>}

        <Pressable disabled={saving} onPress={onSave} style={({ pressed }) => [styles.cta, (pressed || saving) && styles.pressed]}>
          <Text style={styles.ctaText}>{saving ? 'Saving…' : 'Save Address'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const Input: React.FC<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}> = ({ label, value, onChangeText, keyboardType = 'default', maxLength }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor={colors.placeholder}
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(8), alignSelf: 'flex-start', marginBottom: verticalScale(12) },
  locText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.directionsBlue },
  field: { marginBottom: verticalScale(12) },
  label: { fontFamily: fonts.medium, fontSize: scale(13), color: '#4A4A4A', marginBottom: verticalScale(6) },
  input: {
    height: verticalScale(46),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: scale(14),
    fontFamily: fonts.regular,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  typeRow: { flexDirection: 'row', gap: scale(10), marginBottom: verticalScale(6) },
  typeChip: {
    paddingHorizontal: scale(18),
    height: verticalScale(38),
    borderRadius: scale(19),
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: colors.directionsBlue, borderColor: colors.directionsBlue },
  typeChipText: { fontFamily: fonts.medium, fontSize: scale(13), color: '#5B5B5B' },
  typeChipTextActive: { color: colors.textWhite },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: verticalScale(6) },
  switchLabel: { fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack },
  err: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.brandRed, marginTop: verticalScale(8) },
  cta: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(22) },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
});
