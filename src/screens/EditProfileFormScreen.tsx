import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';

import { BackButton } from '../components';
import { EditIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { profileStore, useProfile } from '../state/profileStore';
import { authApi } from '../api/auth';
import { authStore } from '../state/authStore';
import { onlyDigits, isValidName, NAME_ERROR } from '../utils/validation';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

const GENDERS = ['Male', 'Female', 'Other'];
const ID_TYPES = ['Aadhar', 'PAN', 'Passport', 'Driving Licence'];

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProfileForm'>;

export const EditProfileFormScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useProfile();
  const Avatar = svgs.avatar;

  // Pre-fill the form with the current profile values.
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  const pickPhoto = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, selectionLimit: 1 });
      if (res.didCancel || !res.assets?.length) return;
      const a = res.assets[0];
      if (!a.uri) return;
      setPicked({
        uri: a.uri,
        name: a.fileName || `profile_${Date.now()}.jpg`,
        type: a.type || 'image/jpeg',
      });
    } catch {
      setError('Could not open the gallery.');
    }
  };

  const onSave = async () => {
    if (saving) return;
    if (!isValidName(form.name)) {
      setError(NAME_ERROR);
      return;
    }
    setError('');
    setSaving(true);
    // Optimistic local update so the UI reflects edits immediately.
    profileStore.update({ ...form, ...(picked ? { photo: picked.uri } : {}) });
    try {
      await authApi.updateProfile({
        fullName: form.name,
        email: form.email,
        gender: form.gender,
        age: form.age,
        idType: form.idType,
        idNumber: form.idNumber,
        image: picked ?? undefined,
      });
      await authStore.refreshProfile().catch(() => undefined);
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message || 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const photoUri = picked?.uri || profile.photo || '';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(40) }}
      >
        {/* Header band */}
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}>
          <View style={styles.headerBar}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: scale(40) }} />
          </View>
          <Pressable style={styles.avatarWrap} onPress={pickPhoto}>
            <View style={styles.avatar}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImg} />
              ) : (
                <Avatar width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
              )}
            </View>
            <View style={styles.avatarBadge}>
              <EditIcon size={scale(14)} color={colors.textWhite} />
            </View>
          </Pressable>
          <Pressable onPress={pickPhoto}>
            <Text style={styles.changePhoto}>Change photo</Text>
          </Pressable>
          <Text style={styles.name}>{form.name || 'Your name'}</Text>
        </View>

        <View style={styles.form}>
          <Field label="Full Name">
            <TextInput value={form.name} onChangeText={set('name')} placeholder="Full name" placeholderTextColor={colors.placeholder} style={styles.input} />
          </Field>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Chip key={g} label={g} active={form.gender === g} onPress={() => set('gender')(g)} />
            ))}
          </View>

          <Field label="Age">
            <TextInput value={form.age} onChangeText={set('age')} placeholder="Age" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={3} style={styles.input} />
          </Field>

          <Text style={styles.label}>ID Type</Text>
          <View style={styles.chips}>
            {ID_TYPES.map((t) => (
              <Chip key={t} label={t} active={form.idType === t} onPress={() => set('idType')(t)} />
            ))}
          </View>

          <Field label="ID Number">
            <TextInput value={form.idNumber} onChangeText={set('idNumber')} placeholder="ID number" placeholderTextColor={colors.placeholder} style={styles.input} />
          </Field>

          <Field label="Phone">
            <TextInput value={form.phone} onChangeText={(t) => set('phone')(onlyDigits(t))} placeholder="Phone" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={10} style={styles.input} />
          </Field>

          <Field label="Email">
            <TextInput value={form.email} onChangeText={set('email')} placeholder="Email" placeholderTextColor={colors.placeholder} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={saving} onPress={onSave} style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

const AVATAR = scale(96);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.profileCardBg,
    borderBottomLeftRadius: scale(18),
    borderBottomRightRadius: scale(18),
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(18),
    alignItems: 'center',
  },
  headerBar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: scale(18), color: colors.textBlack },
  avatarWrap: { marginTop: verticalScale(8) },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  changePhoto: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.directionsBlue, marginTop: verticalScale(8) },
  name: { fontFamily: fonts.semiBold, fontSize: scale(18), color: colors.textBlack, marginTop: verticalScale(10) },
  form: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(18) },
  field: { marginBottom: verticalScale(14) },
  label: { fontFamily: fonts.medium, fontSize: scale(13), color: '#4A4A4A', marginBottom: verticalScale(6), marginTop: verticalScale(6) },
  input: {
    height: verticalScale(46),
    borderRadius: scale(8),
    backgroundColor: '#F1F1F4',
    borderWidth: 1,
    borderColor: '#E3E3E6',
    paddingHorizontal: scale(14),
    fontFamily: fonts.regular,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: verticalScale(8) },
  chip: { paddingHorizontal: scale(14), height: verticalScale(34), borderRadius: scale(17), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.directionsBlue },
  chipText: { fontFamily: fonts.medium, fontSize: scale(13), color: '#5B5B5B' },
  chipTextActive: { color: colors.textWhite },
  save: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(20) },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  error: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.brandRed, marginTop: verticalScale(10) },
});
