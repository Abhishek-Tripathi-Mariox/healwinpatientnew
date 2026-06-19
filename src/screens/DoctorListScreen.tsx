import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { DoctorIcon, SearchIcon, StarIcon } from '../components/icons';
import { doctorsApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

export interface Doctor {
  id: string;
  name: string;
  speciality: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  fee: number;
}

const mapDoctor = (d: any): Doctor => ({
  id: d._id || d.id,
  name: d.name || '',
  speciality: d.speciality || '',
  experienceYears: d.experienceYears ?? 0,
  rating: d.rating ?? 0,
  reviewCount: d.reviewCount ?? 0,
  fee: d.consultationFee ?? d.fee ?? 0,
});

type Nav = NativeStackNavigationProp<RootStackParamList, 'DoctorList'>;

export const DoctorListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Doctors come entirely from the backend (admin-managed Doctor staff).
  useEffect(() => {
    doctorsApi
      .list()
      .then((list) => setDoctors(list.map(mapDoctor).filter((d) => d.id)))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(
    (d) => d.name.toLowerCase().includes(query.toLowerCase()) || d.speciality.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Consult a Doctor" onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <View style={[styles.search, cardShadow]}>
          <SearchIcon size={scale(20)} color="#979797" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search doctor or speciality" placeholderTextColor="#979797" style={styles.searchInput} />
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {loading ? (
          <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No doctors available</Text>
        ) : (
          filtered.map((d) => (
            <Pressable key={d.id} onPress={() => navigation.navigate('DoctorDetail', { id: d.id })} style={({ pressed }) => [styles.card, cardShadow, pressed && styles.pressed]}>
              <View style={styles.avatar}>
                <DoctorIcon size={scale(26)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.spec}>{d.speciality}</Text>
                <View style={styles.metaRow}>
                  <StarIcon size={scale(13)} />
                  <Text style={styles.meta}>{d.rating.toFixed(1)} ({d.reviewCount})</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.meta}>{d.experienceYears} yrs exp</Text>
                </View>
              </View>
              <Text style={styles.fee}>₹{d.fee}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: verticalScale(10) },
  search: { flexDirection: 'row', alignItems: 'center', gap: scale(10), height: verticalScale(46), backgroundColor: colors.surface, borderRadius: scale(14), paddingHorizontal: scale(14) },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack, padding: 0 },
  list: { paddingHorizontal: spacing.lg, gap: verticalScale(12) },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(40) },
  card: { flexDirection: 'row', alignItems: 'center', gap: scale(14), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14) },
  pressed: { opacity: 0.9 },
  avatar: { width: scale(52), height: scale(52), borderRadius: scale(26), backgroundColor: '#EAF1FE', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack },
  spec: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(3) },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), marginTop: verticalScale(6) },
  meta: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.metaGray },
  dot: { color: colors.metaGray },
  fee: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack },
});
