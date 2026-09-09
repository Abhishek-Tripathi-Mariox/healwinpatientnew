import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppAlert } from '../services/appAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../components';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { insuranceApi, type InsurancePayerOption, type PickedDocument } from '../api/insurance';
import { useProfile } from '../state/profileStore';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddInsurance'>;

/** Add a health insurance policy — like handing over your insurance card. */
export const AddInsuranceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useProfile();

  const [payers, setPayers] = useState<InsurancePayerOption[]>([]);
  const [payersLoading, setPayersLoading] = useState(true);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [policyNumber, setPolicyNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [sumInsured, setSumInsured] = useState('');
  // Two distinct attachments: the policy paper (required) and the cashless
  // card (optional). Kept apart so the requirement is obvious in the form
  // rather than a rule the server explains after a failed save.
  const [policyDocs, setPolicyDocs] = useState<PickedDocument[]>([]);
  const [cards, setCards] = useState<PickedDocument[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Most people have the paper in hand or a photo of it in the gallery, so
  // both are offered. Two files each — front and back.
  const pick = async (
    from: 'camera' | 'gallery',
    into: 'policy' | 'card',
  ) => {
    const current = into === 'policy' ? policyDocs : cards;
    if (current.length >= 2) {
      setError('You can attach up to 2 files here.');
      return;
    }
    const opts = { mediaType: 'photo' as const, quality: 0.8 as const, selectionLimit: 1 };
    const res = from === 'camera' ? await launchCamera(opts) : await launchImageLibrary(opts);
    if (res.didCancel || !res.assets?.length) return;
    const a = res.assets[0];
    if (!a.uri) return;
    setError('');
    const picked: PickedDocument = {
      uri: a.uri,
      name: a.fileName || `${into}-${Date.now()}.jpg`,
      type: a.type || 'image/jpeg',
    };
    if (into === 'policy') setPolicyDocs((d) => [...d, picked]);
    else setCards((d) => [...d, picked]);
  };

  const removeDoc = (into: 'policy' | 'card', i: number) => {
    if (into === 'policy') setPolicyDocs((d) => d.filter((_, idx) => idx !== i));
    else setCards((d) => d.filter((_, idx) => idx !== i));
  };

  /** One attachment block, used for both the policy paper and the card. */
  const DocSection = ({
    into, label, hint, required, items,
  }: {
    into: 'policy' | 'card';
    label: string;
    hint: string;
    required?: boolean;
    items: PickedDocument[];
  }) => (
    <>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ' (optional)'}
      </Text>
      <Text style={styles.hint}>{hint}</Text>
      {items.length > 0 && (
        <View style={styles.docList}>
          {items.map((d, i) => (
            <View key={`${d.uri}-${i}`} style={styles.docRow}>
              <Text numberOfLines={1} style={styles.docName}>{d.name}</Text>
              <Pressable onPress={() => removeDoc(into, i)} hitSlop={8}>
                <Text style={styles.docRemove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {items.length < 2 && (
        <View style={styles.docActions}>
          <Pressable style={styles.docBtn} onPress={() => pick('camera', into)}>
            <Text style={styles.docBtnText}>Take photo</Text>
          </Pressable>
          <Pressable style={styles.docBtn} onPress={() => pick('gallery', into)}>
            <Text style={styles.docBtnText}>Choose from gallery</Text>
          </Pressable>
        </View>
      )}
    </>
  );

  useEffect(() => {
    insuranceApi
      .payers()
      .then(setPayers)
      .catch(() => setPayers([]))
      .finally(() => setPayersLoading(false));
    setHolderName(profile.name || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    if (saving) return;
    if (!payerId) {
      setError('Please select your insurer.');
      return;
    }
    if (!policyNumber.trim()) {
      setError('Please enter your policy number.');
      return;
    }
    if (policyDocs.length === 0) {
      setError('Please attach your policy document — the card alone is not enough.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await insuranceApi.add(
        {
          payerId,
          policyNumber: policyNumber.trim(),
          holderName: holderName.trim() || undefined,
          sumInsured: sumInsured ? Number(sumInsured) : undefined,
        },
        policyDocs,
        cards,
      );
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message || 'Could not save your policy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Add Insurance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + verticalScale(40) }]}
      >
        <Text style={styles.label}>Insurer / TPA</Text>
        {payersLoading ? (
          <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(10) }} />
        ) : payers.length === 0 ? (
          <Text style={styles.emptyHint}>No insurers configured yet — please contact support.</Text>
        ) : (
          <View style={styles.chips}>
            {payers.map((p) => (
              <Pressable
                key={p._id}
                onPress={() => setPayerId(p._id)}
                style={[styles.chip, payerId === p._id && styles.chipActive]}
              >
                <Text style={[styles.chipText, payerId === p._id && styles.chipTextActive]}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Policy Number</Text>
        <TextInput
          value={policyNumber}
          onChangeText={setPolicyNumber}
          placeholder="e.g. POL-123456"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="characters"
          style={styles.input}
        />

        <Text style={styles.label}>Policy Holder Name</Text>
        <TextInput
          value={holderName}
          onChangeText={setHolderName}
          placeholder="Name on the policy"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
        />

        <Text style={styles.label}>Sum Insured (optional)</Text>
        <TextInput
          value={sumInsured}
          onChangeText={(t) => setSumInsured(t.replace(/[^0-9]/g, ''))}
          placeholder="Total coverage amount, e.g. 500000"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Text style={styles.hint}>
          This is your policy's total coverage — your remaining budget updates automatically as claims are
          processed by the hospital.
        </Text>

        <DocSection
          into="policy"
          label="Policy Document"
          required
          hint="The policy paper or schedule showing your policy number, sum insured and validity. Billing verifies your cover against this."
          items={policyDocs}
        />

        <DocSection
          into="card"
          label="Insurance / TPA Card"
          hint="Helpful at the billing desk, but not required — it does not show your cover amount."
          items={cards}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Insurance'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: verticalScale(8) },
  title: { fontFamily: fonts.semiBold, fontSize: scale(18), color: colors.textBlack, marginLeft: spacing.md },
  form: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(10) },
  label: { fontFamily: fonts.medium, fontSize: scale(13), color: '#4A4A4A', marginBottom: verticalScale(6), marginTop: verticalScale(12) },
  input: {
    minHeight: verticalScale(44), borderRadius: scale(8), backgroundColor: '#F1F1F4', borderWidth: 1, borderColor: '#E3E3E6',
    paddingHorizontal: scale(14), fontFamily: fonts.regular, fontSize: scale(14), color: colors.textBlack,
  },
  hint: { fontFamily: fonts.regular, fontSize: scale(11.5), color: colors.inkMuted, marginTop: verticalScale(8), lineHeight: scale(16) },
  emptyHint: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted, marginTop: verticalScale(8) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  chip: { paddingHorizontal: scale(14), height: verticalScale(34), borderRadius: scale(17), backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.planBlue },
  chipText: { fontFamily: fonts.medium, fontSize: scale(13), color: '#5B5B5B' },
  chipTextActive: { color: colors.textWhite },
  error: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.brandRed, marginTop: verticalScale(14) },
  docList: { marginTop: verticalScale(10), gap: verticalScale(6) },
  docRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F1F1F4', borderRadius: scale(8), paddingHorizontal: scale(12),
    height: verticalScale(40),
  },
  docName: { flex: 1, fontFamily: fonts.regular, fontSize: scale(12.5), color: colors.textBlack, marginRight: scale(10) },
  docRemove: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.brandRed },
  docActions: { flexDirection: 'row', gap: scale(10), marginTop: verticalScale(10) },
  docBtn: {
    flex: 1, height: verticalScale(42), borderRadius: scale(8), borderWidth: 1,
    borderColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center',
  },
  docBtnText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.directionsBlue },
  save: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(24) },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
});
