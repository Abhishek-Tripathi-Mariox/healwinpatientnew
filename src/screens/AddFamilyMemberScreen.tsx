import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';

import { BackButton } from '../components';
import { EditIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { familyStore, PickedImage } from '../state/familyStore';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const RELATIONS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddFamilyMember'>;
type Rt = RouteProp<RootStackParamList, 'AddFamilyMember'>;

export const AddFamilyMemberScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editing = route.params?.member ?? null;

  const [name, setName] = useState(editing?.name ?? '');
  const [relation, setRelation] = useState<string | null>(editing?.relation ?? null);
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [age, setAge] = useState(editing?.age ?? '');
  const [gender, setGender] = useState<string | null>(editing?.gender ?? null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const Avatar = svgs.avatar;

  const pickPhoto = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, selectionLimit: 1 });
      if (res.didCancel || !res.assets?.length) return;
      const a = res.assets[0];
      if (!a.uri) return;
      setPicked({
        uri: a.uri,
        name: a.fileName || `member_${Date.now()}.jpg`,
        type: a.type || 'image/jpeg',
      });
    } catch {
      setError('Could not open the gallery.');
    }
  };

  const onSave = async () => {
    if (saving) return;
    if (!name.trim() || !relation) {
      setError('Full name and relation are required.');
      return;
    }
    if (phone && phone.replace(/\D/g, '').length !== 10) {
      setError('Phone must be 10 digits.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      name: name.trim(),
      relation,
      phone: phone.trim() || undefined,
      age: age.trim() || undefined,
      gender: gender ?? undefined,
    };
    try {
      if (editing) {
        await familyStore.updateMember(editing.id, payload, picked ?? undefined);
      } else {
        await familyStore.addMember(payload, picked ?? undefined);
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message || 'Could not save member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(40) }}
      >
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}>
          <View style={styles.headerBar}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={styles.title}>{editing ? 'Edit Family Member' : 'Add Family Member'}</Text>
            <View style={{ width: scale(40) }} />
          </View>
          <Pressable style={styles.avatarWrap} onPress={pickPhoto}>
            <View style={styles.avatar}>
              {picked ? (
                <Image source={{ uri: picked.uri }} style={styles.avatarImg} />
              ) : editing?.photo ? (
                <Image source={{ uri: editing.photo }} style={styles.avatarImg} />
              ) : (
                <Avatar width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
              )}
            </View>
            <View style={styles.avatarBadge}>
              <EditIcon size={scale(14)} color={colors.textWhite} />
            </View>
          </Pressable>
          <Pressable onPress={pickPhoto}>
            <Text style={styles.changePhoto}>
              {picked || editing?.photo ? 'Change photo' : 'Add photo'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Field label="Full Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>

          <Text style={styles.label}>Relation</Text>
          <View style={styles.chips}>
            {RELATIONS.map((r) => (
              <Chip key={r} label={r} active={relation === r} onPress={() => setRelation(r)} />
            ))}
          </View>

          <Field label="Phone">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
            />
          </Field>

          <Field label="Age">
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="Age"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.input}
            />
          </Field>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Chip key={g} label={g} active={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            disabled={saving}
            onPress={onSave}
            style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving…' : editing ? 'Update Member' : 'Save Member'}
            </Text>
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

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semiBold,
    fontSize: scale(18),
    color: colors.textBlack,
  },
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
  changePhoto: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.directionsBlue,
    marginTop: verticalScale(8),
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(18),
  },
  field: { marginBottom: verticalScale(14) },
  label: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: '#4A4A4A',
    marginBottom: verticalScale(6),
    marginTop: verticalScale(6),
  },
  input: {
    height: verticalScale(44),
    borderRadius: scale(8),
    backgroundColor: '#F1F1F4',
    borderWidth: 1,
    borderColor: '#E3E3E6',
    paddingHorizontal: scale(14),
    fontFamily: fonts.regular,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(8),
  },
  chip: {
    paddingHorizontal: scale(14),
    height: verticalScale(34),
    borderRadius: scale(17),
    backgroundColor: colors.tabInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.planBlue },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: '#5B5B5B',
  },
  chipTextActive: { color: colors.textWhite },
  error: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.brandRed,
    marginTop: verticalScale(6),
  },
  save: {
    height: verticalScale(50),
    borderRadius: scale(12),
    backgroundColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(22),
  },
  pressed: { opacity: 0.85 },
  saveText: {
    fontFamily: fonts.bold,
    fontSize: scale(16),
    color: colors.textWhite,
  },
});
