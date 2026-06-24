import React from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { PersonIcon, PhoneIcon } from '../components/icons';
import { sosApi } from '../api/misc';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EmergencyContacts'>;

interface Contact { id: string; name: string; phone: string; relationship: string }

// Must match the backend EmergencyContact `relationship` enum exactly
// (uppercase). Free text used to throw a Mongoose enum validation error.
const RELATIONSHIPS: { value: string; label: string }[] = [
  { value: 'PARENT', label: 'Parent' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'FRIEND', label: 'Friend' },
  { value: 'OTHER', label: 'Other' },
];
const relLabel = (v?: string) =>
  RELATIONSHIPS.find((r) => r.value === (v || '').toUpperCase())?.label || v || '';

const mapC = (c: any): Contact => ({
  id: c._id || c.id,
  name: c.name || '',
  phone: c.phone || '',
  relationship: c.relationship || c.relation || '',
});

export const EmergencyContactsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<Contact | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', phone: '', relationship: '' });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    sosApi.contacts().then((l: any[]) => setContacts((l || []).map(mapC))).catch(() => setContacts([])).finally(() => setLoading(false));
  }, []);

  useFocusEffect(React.useCallback(() => load(), [load]));

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', relationship: '' });
    setOpen(true);
  };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, relationship: c.relationship });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !/^[6-9]\d{9}$/.test(form.phone.trim())) {
      Alert.alert('Check details', 'Enter a name and a valid 10-digit mobile number.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), relationship: (form.relationship || 'OTHER').toUpperCase() };
      if (editing) await sosApi.updateContact(editing.id, payload);
      else await sosApi.addContact(payload);
      setOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c: Contact) => {
    Alert.alert('Remove contact?', `Remove ${c.name} from emergency contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await sosApi.removeContact(c.id);
            load();
          } catch {
            Alert.alert('Could not remove', 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Emergency Contacts" onBack={() => navigation.goBack()} />

      {loading ? (
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(90) }]}>
          <Text style={styles.intro}>These people are alerted when you raise an SOS. Add up to a few trusted contacts.</Text>
          {contacts.length === 0 ? (
            <Text style={styles.empty}>No emergency contacts yet.</Text>
          ) : (
            contacts.map((c) => (
              <View key={c.id} style={[styles.card, cardShadow]}>
                <View style={styles.avatar}>
                  <PersonIcon size={scale(20)} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <View style={styles.phoneRow}>
                    <PhoneIcon size={scale(13)} color={colors.inkMuted} />
                    <Text style={styles.phone}>{c.phone}{c.relationship ? ` · ${relLabel(c.relationship)}` : ''}</Text>
                  </View>
                </View>
                <Pressable onPress={() => openEdit(c)} hitSlop={8}><Text style={styles.edit}>Edit</Text></Pressable>
                <Pressable onPress={() => remove(c)} hitSlop={8}><Text style={styles.del}>Remove</Text></Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Pressable style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]} onPress={openAdd}>
        <Text style={styles.fabText}>＋ Add contact</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + verticalScale(16) }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{editing ? 'Edit contact' : 'Add emergency contact'}</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Contact name" placeholderTextColor={colors.placeholder} style={styles.input} />
          <Text style={styles.label}>Mobile number</Text>
          <TextInput value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="number-pad" maxLength={10} placeholder="10-digit mobile" placeholderTextColor={colors.placeholder} style={styles.input} />
          <Text style={styles.label}>Relationship</Text>
          <View style={styles.relRow}>
            {RELATIONSHIPS.map((r) => {
              const active = (form.relationship || '').toUpperCase() === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setForm((f) => ({ ...f, relationship: r.value }))}
                  style={[styles.relChip, active && styles.relChipActive]}
                >
                  <Text style={[styles.relChipText, active && styles.relChipTextActive]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable disabled={saving} onPress={save} style={({ pressed }) => [styles.submit, (pressed || saving) && styles.pressed]}>
            <Text style={styles.submitText}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(6), gap: verticalScale(12) },
  intro: { fontFamily: fonts.regular, fontSize: scale(12.5), color: colors.inkMuted, lineHeight: scale(18), marginBottom: verticalScale(4) },
  empty: { textAlign: 'center', marginTop: verticalScale(40), fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted },
  card: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14) },
  avatar: { width: scale(38), height: scale(38), borderRadius: scale(19), backgroundColor: colors.avatarCircle, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.semiBold, fontSize: scale(14.5), color: colors.textBlack },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(4) },
  phone: { fontFamily: fonts.regular, fontSize: scale(12.5), color: colors.inkMuted },
  edit: { fontFamily: fonts.semiBold, fontSize: scale(12.5), color: colors.directionsBlue, marginRight: scale(12) },
  del: { fontFamily: fonts.semiBold, fontSize: scale(12.5), color: colors.brandRedDark },
  fab: { position: 'absolute', alignSelf: 'center', paddingHorizontal: scale(24), height: verticalScale(50), borderRadius: scale(25), backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  fabText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.background, borderTopLeftRadius: scale(18), borderTopRightRadius: scale(18), paddingHorizontal: spacing.lg, paddingTop: verticalScale(10) },
  handle: { alignSelf: 'center', width: scale(90), height: scale(4), borderRadius: scale(3), backgroundColor: '#C9CDD2', marginBottom: verticalScale(14) },
  sheetTitle: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textBlack, marginBottom: verticalScale(6) },
  label: { fontFamily: fonts.medium, fontSize: scale(13), color: '#4A4A4A', marginTop: verticalScale(10), marginBottom: verticalScale(6) },
  input: { height: verticalScale(46), borderRadius: scale(10), borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, paddingHorizontal: scale(14), fontFamily: fonts.regular, fontSize: scale(14), color: colors.textBlack },
  relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  relChip: { paddingHorizontal: scale(14), height: verticalScale(36), borderRadius: scale(18), borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  relChipActive: { backgroundColor: colors.brandRed, borderColor: colors.brandRed },
  relChipText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
  relChipTextActive: { color: colors.textWhite },
  submit: { height: verticalScale(50), borderRadius: scale(12), backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(18) },
  pressed: { opacity: 0.85 },
  submitText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
});
