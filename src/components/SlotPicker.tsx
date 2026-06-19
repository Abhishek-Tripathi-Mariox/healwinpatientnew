import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, scale, verticalScale } from '../theme';

export interface Slot {
  time: string; // "09:30"
  label: string; // "9:30 AM"
  available: boolean;
}

export interface SlotSelection {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  label: string; // "9:30 AM"
}

interface SlotPickerProps {
  fetchSlots: (date: string) => Promise<Slot[]>;
  value: SlotSelection | null;
  onChange: (v: SlotSelection) => void;
  days?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date strip (next N days) + time-slot grid for the selected date. */
export const SlotPicker: React.FC<SlotPickerProps> = ({ fetchSlots, value, onChange, days = 7 }) => {
  const dates = React.useMemo(() => {
    const out: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(d);
    }
    return out;
  }, [days]);

  const [activeDate, setActiveDate] = React.useState<string>(toYMD(dates[0]));
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let on = true;
    setLoading(true);
    fetchSlots(activeDate)
      .then((s) => on && setSlots(s))
      .catch(() => on && setSlots([]))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [activeDate, fetchSlots]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
        {dates.map((d, i) => {
          const ymd = toYMD(d);
          const active = ymd === activeDate;
          return (
            <Pressable key={ymd} onPress={() => setActiveDate(ymd)} style={[styles.dateChip, active && styles.dateChipActive]}>
              <Text style={[styles.dateDow, active && styles.dateTextActive]}>
                {i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dateNum, active && styles.dateTextActive]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.directionsBlue} style={{ marginVertical: verticalScale(18) }} />
      ) : slots.length === 0 ? (
        <Text style={styles.empty}>No slots available for this day.</Text>
      ) : (
        <View style={styles.slotsWrap}>
          {slots.map((s) => {
            const selected = value?.date === activeDate && value?.time === s.time;
            return (
              <Pressable
                key={s.time}
                disabled={!s.available}
                onPress={() => onChange({ date: activeDate, time: s.time, label: s.label })}
                style={[
                  styles.slot,
                  !s.available && styles.slotDisabled,
                  selected && styles.slotSelected,
                ]}
              >
                <Text style={[styles.slotText, !s.available && styles.slotTextDisabled, selected && styles.slotTextSelected]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateRow: { gap: scale(10), paddingVertical: verticalScale(4) },
  dateChip: {
    width: scale(54), height: verticalScale(58), borderRadius: scale(12),
    borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  dateChipActive: { backgroundColor: colors.directionsBlue, borderColor: colors.directionsBlue },
  dateDow: { fontFamily: fonts.medium, fontSize: scale(11), color: colors.inkMuted },
  dateNum: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textBlack, marginTop: verticalScale(2) },
  dateTextActive: { color: colors.textWhite },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted, marginVertical: verticalScale(18) },
  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginTop: verticalScale(12) },
  slot: {
    paddingHorizontal: scale(14), height: verticalScale(38), borderRadius: scale(10),
    borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  slotDisabled: { backgroundColor: '#F0F0F0', borderColor: '#E2E2E2' },
  slotSelected: { backgroundColor: colors.directionsBlue, borderColor: colors.directionsBlue },
  slotText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack },
  slotTextDisabled: { color: '#B0B0B0', textDecorationLine: 'line-through' },
  slotTextSelected: { color: colors.textWhite },
});
