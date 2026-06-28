import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ScreenHeader } from '../components';
import { doctorsApi } from '../api/catalog';
import { hmsApi } from '../api/hms';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BookAppointment'>;
interface Doc { id: string; name: string; speciality: string }

export const BookAppointmentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [when, setWhen] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Slot availability (when the doctor publishes a schedule).
  const [hasSchedule, setHasSchedule] = useState(false);
  const [slots, setSlots] = useState<{ time: string; iso: string }[]>([]);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch the doctor's free slots for the chosen date.
  useEffect(() => {
    if (!doctorId) {
      setHasSchedule(false);
      setSlots([]);
      setSlotIso(null);
      return;
    }
    let alive = true;
    setLoadingSlots(true);
    const dateStr = when.toISOString().slice(0, 10);
    hmsApi
      .doctorSlots(doctorId, dateStr)
      .then((r) => {
        if (!alive) return;
        setHasSchedule(!!r.hasSchedule);
        setSlots(r.slots || []);
        setSlotIso(null);
      })
      .catch(() => {
        if (alive) {
          setHasSchedule(false);
          setSlots([]);
        }
      })
      .finally(() => alive && setLoadingSlots(false));
    return () => {
      alive = false;
    };
    // Re-fetch when doctor or the chosen calendar day changes.
  }, [doctorId, when]);

  useEffect(() => {
    doctorsApi
      .list()
      .then((list) =>
        setDoctors(
          (list || [])
            .map((d: any) => ({ id: d._id || d.id, name: d.name || '', speciality: d.speciality || '' }))
            .filter((d: Doc) => d.id),
        ),
      )
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDocs(false));
  }, []);

  const onPicked = (event: any, selected?: Date) => {
    const mode = picker;
    setPicker(null);
    if (event?.type === 'dismissed' || !selected) return;
    setWhen((prev) => {
      const next = new Date(prev);
      if (mode === 'date') {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return next;
    });
  };

  const submit = async () => {
    if (saving) return;
    if (!doctorId) {
      Alert.alert('Select a doctor', 'Please choose a doctor for your appointment.');
      return;
    }
    if (hasSchedule && !slotIso) {
      Alert.alert('Pick a slot', 'Please choose an available time slot.');
      return;
    }
    setSaving(true);
    try {
      const res: any = await hmsApi.bookAppointment({
        doctorId,
        scheduledAt: hasSchedule && slotIso ? slotIso : when.toISOString(),
        reason: reason.trim() || undefined,
      });
      const token = res?.tokenNumber;
      Alert.alert(
        'Appointment booked',
        token ? `Your queue token is ${token}. See it under Hospital Records → Appointments.` : 'Your appointment is booked.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Could not book', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = when.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.root}>
      <ScreenHeader title="Book OPD Appointment" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(30) }]}>
        <Text style={styles.label}>Choose Doctor</Text>
        {loadingDocs ? (
          <ActivityIndicator color={colors.brandRed} style={{ marginTop: verticalScale(16) }} />
        ) : doctors.length === 0 ? (
          <Text style={styles.empty}>No doctors available right now.</Text>
        ) : (
          doctors.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => setDoctorId(d.id)}
              style={[styles.doc, cardShadow, doctorId === d.id && styles.docActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{d.name}</Text>
                {!!d.speciality && <Text style={styles.docSpec}>{d.speciality}</Text>}
              </View>
              <View style={[styles.radio, doctorId === d.id && styles.radioOn]} />
            </Pressable>
          ))
        )}

        <Text style={styles.label}>{hasSchedule ? 'Date' : 'Date & Time'}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.pickBtn, cardShadow]} onPress={() => setPicker('date')}>
            <Text style={styles.pickText}>{fmtDate}</Text>
          </Pressable>
          {!hasSchedule && (
            <Pressable style={[styles.pickBtn, cardShadow]} onPress={() => setPicker('time')}>
              <Text style={styles.pickText}>{fmtTime}</Text>
            </Pressable>
          )}
        </View>
        {picker && (
          <DateTimePicker
            value={when}
            mode={picker}
            display={picker === 'date' ? 'calendar' : 'clock'}
            minimumDate={picker === 'date' ? new Date() : undefined}
            onChange={onPicked}
          />
        )}

        {/* Doctor-published slots for the chosen day. */}
        {doctorId && (
          loadingSlots ? (
            <ActivityIndicator color={colors.brandRed} style={{ marginTop: verticalScale(12) }} />
          ) : hasSchedule ? (
            <>
              <Text style={styles.label}>Available Slots</Text>
              {slots.length === 0 ? (
                <Text style={styles.empty}>No slots on this day. Try another date.</Text>
              ) : (
                <View style={styles.slots}>
                  {slots.map((s) => (
                    <Pressable
                      key={s.iso}
                      onPress={() => setSlotIso(s.iso)}
                      style={[styles.slot, slotIso === s.iso && styles.slotActive]}
                    >
                      <Text style={[styles.slotText, slotIso === s.iso && styles.slotTextActive]}>{s.time}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : null
        )}

        <Text style={styles.label}>Reason (optional)</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Fever, follow-up, consultation"
          placeholderTextColor={colors.placeholder}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />

        <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [styles.cta, (pressed || saving) && styles.pressed]}>
          <Text style={styles.ctaText}>{saving ? 'Booking…' : 'Confirm Appointment'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(6) },
  label: { fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.ink, marginTop: verticalScale(18), marginBottom: verticalScale(10) },
  doc: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: scale(12), padding: scale(14), marginBottom: verticalScale(10), borderWidth: 1, borderColor: 'transparent' },
  docActive: { borderColor: colors.brandRed },
  docName: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.ink },
  docSpec: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(2) },
  radio: { width: scale(20), height: scale(20), borderRadius: scale(10), borderWidth: 2, borderColor: colors.dashBorder },
  radioOn: { borderColor: colors.brandRed, backgroundColor: colors.brandRed },
  row: { flexDirection: 'row', gap: scale(12) },
  pickBtn: { flex: 1, height: verticalScale(48), borderRadius: scale(12), backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pickText: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.ink },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  slot: { paddingHorizontal: scale(14), height: verticalScale(38), borderRadius: scale(10), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dashBorder, alignItems: 'center', justifyContent: 'center' },
  slotActive: { backgroundColor: colors.brandRed, borderColor: colors.brandRed },
  slotText: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.ink },
  slotTextActive: { color: colors.textWhite },
  textarea: { minHeight: verticalScale(90), borderRadius: scale(12), borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, paddingHorizontal: scale(14), paddingVertical: verticalScale(12), fontFamily: fonts.regular, fontSize: scale(14), color: colors.textBlack },
  cta: { height: verticalScale(52), borderRadius: scale(12), backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(24) },
  ctaText: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textWhite },
  pressed: { opacity: 0.85 },
  empty: { fontFamily: fonts.regular, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(8) },
});
