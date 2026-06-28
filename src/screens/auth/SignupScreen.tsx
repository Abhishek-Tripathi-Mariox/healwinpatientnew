import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../../components';
import { colors, fonts, scale, spacing, verticalScale } from '../../theme';
import { authApi } from '../../api/auth';
import { authStore } from '../../state/authStore';
import { isValidName, NAME_ERROR } from '../../utils/validation';
import type { RootStackParamList } from '../../navigation/types';

const GENDERS = ['Male', 'Female', 'Other'];
type Nav = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

export const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (loading) return;
    if (!isValidName(name)) {
      setError(NAME_ERROR);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.updateProfile({
        fullName: name.trim(),
        email: email.trim() || undefined,
        gender: gender || undefined,
      });
      await authStore.refreshProfile().catch(() => undefined);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e: any) {
      setError(e?.message || 'Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + verticalScale(8), paddingBottom: insets.bottom + verticalScale(24) }]}
      >
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.sub}>Tell us about yourself</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.placeholder} style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={colors.placeholder} keyboardType="email-address" autoCapitalize="none" style={styles.input} />

        <Text style={styles.label}>Age</Text>
        <TextInput value={age} onChangeText={setAge} placeholder="Age" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={3} style={styles.input} />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chips}>
          {GENDERS.map((g) => (
            <Pressable key={g} onPress={() => setGender(g)} style={[styles.chip, gender === g && styles.chipActive]}>
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={loading}
          onPress={save}
          style={({ pressed }) => [styles.cta, loading && styles.pressed, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: scale(22), color: colors.textBlack, marginTop: verticalScale(20) },
  sub: { fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(6), marginBottom: verticalScale(10) },
  label: { fontFamily: fonts.medium, fontSize: scale(13), color: '#4A4A4A', marginTop: verticalScale(16), marginBottom: verticalScale(6) },
  input: {
    height: verticalScale(48),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: scale(14),
    fontFamily: fonts.regular,
    fontSize: scale(15),
    color: colors.textBlack,
  },
  chips: { flexDirection: 'row', gap: scale(10), marginTop: verticalScale(2) },
  chip: { paddingHorizontal: scale(18), height: verticalScale(36), borderRadius: scale(18), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.directionsBlue },
  chipText: { fontFamily: fonts.medium, fontSize: scale(14), color: '#5B5B5B' },
  chipTextActive: { color: colors.textWhite },
  cta: { height: verticalScale(52), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(30) },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  error: { fontFamily: fonts.medium, fontSize: scale(12), color: '#D32F2F', marginTop: verticalScale(16) },
});
