import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../components';
import { contactsStore } from '../state/contactsStore';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const RELATIONS = ['Family', 'Friend', 'Parent', 'Spouse', 'Neighbour', 'Colleague', 'Other'];

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddContact'>;
type Rt = RouteProp<RootStackParamList, 'AddContact'>;

/** Add / edit a saved contact — a reusable "book for someone else" recipient. */
export const AddContactScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editing = route.params?.contact ?? null;

  const [name, setName] = useState(editing?.name ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [relation, setRelation] = useState<string | null>(editing?.relation ?? null);
  const [address, setAddress] = useState(editing?.address ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (phone.replace(/\D/g, '').length !== 10) {
      setError('Phone must be 10 digits.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      relation: relation ?? undefined,
      address: address.trim() || undefined,
    };
    try {
      if (editing) {
        await contactsStore.updateContact(editing.id, payload);
      } else {
        const created = await contactsStore.addContact(payload);
        // Newly-added contact becomes the recipient for the booking in progress.
        contactsStore.setRecipient(created);
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message || 'Could not save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{editing ? 'Edit Contact' : 'Add Contact'}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + verticalScale(40) }]}
      >
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Recipient's full name"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit mobile number"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
        />

        <Text style={styles.label}>Relation</Text>
        <View style={styles.chips}>
          {RELATIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRelation(r)}
              style={[styles.chip, relation === r && styles.chipActive]}
            >
              <Text style={[styles.chipText, relation === r && styles.chipTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Address (optional)</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Pickup address for this person"
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.input, styles.inputMultiline]}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : editing ? 'Update Contact' : 'Save Contact'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(18),
    color: colors.textBlack,
    marginLeft: spacing.md,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(10),
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: '#4A4A4A',
    marginBottom: verticalScale(6),
    marginTop: verticalScale(12),
  },
  input: {
    minHeight: verticalScale(44),
    borderRadius: scale(8),
    backgroundColor: '#F1F1F4',
    borderWidth: 1,
    borderColor: '#E3E3E6',
    paddingHorizontal: scale(14),
    fontFamily: fonts.regular,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  inputMultiline: {
    minHeight: verticalScale(70),
    paddingTop: verticalScale(12),
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
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
  chipText: { fontFamily: fonts.medium, fontSize: scale(13), color: '#5B5B5B' },
  chipTextActive: { color: colors.textWhite },
  error: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.brandRed,
    marginTop: verticalScale(10),
  },
  save: {
    height: verticalScale(50),
    borderRadius: scale(12),
    backgroundColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(24),
  },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
});
