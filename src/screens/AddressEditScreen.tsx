import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
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
  const route = useRoute<RouteProp<RootStackParamList, 'AddressEdit'>>();
  const editing = route.params?.address;
  const profile = authStore.getSnapshot().profile;

  const [f, setF] = useState({
    line1: editing?.line1 || '',
    line2: editing?.line2 || '',
    city: editing?.city || '',
    state: editing?.state || '',
    pincode: editing?.pincode || '',
    // Backend requires a contact mobile on each address — editable, prefilled
    // from the address being edited or the logged-in profile.
    mobile: editing?.mobileNumber || profile?.mobileNumber || '',
  });
  const [addressType, setAddressType] = useState<Address['addressType']>(editing?.addressType || 'Home');
  const [isDefault, setIsDefault] = useState(!!editing?.isDefault);
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
        if (addr) {
          setF((s) => ({ ...s, line1: addr }));
        } else {
          // Don't dump raw lat/long into the address line — ask the user to
          // type it (the reverse-geocode needs a valid backend Google key).
          setErr('Could not read your address automatically. Please type it in.');
        }
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
    if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) {
      setErr('Enter a valid 10-digit mobile number for this address.');
      return;
    }
    setErr('');
    setSaving(true);
    try {
      const payload = {
        line1: f.line1,
        line2: f.line2,
        city: f.city,
        state: f.state,
        pincode: f.pincode,
        addressType,
        fullName: profile?.fullName || 'Customer',
        mobileNumber: f.mobile.trim(),
        isDefault,
      };
      if (editing) await addressStore.update(editing.id, payload);
      else await addressStore.add(payload);
      navigation.goBack();
    } catch (e: any) {
      setErr(e?.message || 'Could not save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={editing ? 'Edit Address' : 'Add Address'} onBack={() => navigation.goBack()} />
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
        <Input label="Contact mobile" value={f.mobile} onChangeText={set('mobile')} keyboardType="number-pad" maxLength={10} />

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
