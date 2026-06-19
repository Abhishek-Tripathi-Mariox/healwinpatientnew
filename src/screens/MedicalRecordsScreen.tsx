import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Fab, FileCard, ScreenHeader } from '../components';
import { recordsApi } from '../api/catalog';
import { useRecordViewer } from '../hooks/useRecordViewer';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

interface Rec { id: string; name: string; desc: string; url: string }

const mapRecord = (r: any): Rec => ({
  id: r._id || r.id,
  name: r.title || r.name || 'Record',
  desc: [r.type, r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString('en-IN') : '']
    .filter(Boolean)
    .join(' · '),
  url: r.fileUrl || r.url || '',
});

type Nav = NativeStackNavigationProp<RootStackParamList, 'MedicalRecords'>;

export const MedicalRecordsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [records, setRecords] = React.useState<Rec[]>([]);
  const { openRecord, viewer } = useRecordViewer();

  // Real records persist server-side; refresh on focus (e.g. after upload).
  useFocusEffect(
    React.useCallback(() => {
      recordsApi.list().then((list) => setRecords(list.map(mapRecord).filter((r) => r.id))).catch(() => undefined);
    }, []),
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Medical Records" onBack={() => navigation.goBack()} />
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No records uploaded</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(90) }]}>
          {records.map((r) => (
            <FileCard key={r.id} name={r.name} description={r.desc} onPress={() => openRecord(r)} />
          ))}
        </ScrollView>
      )}
      <Fab
        icon="plus"
        onPress={() => navigation.navigate('UploadDocument')}
        accessibilityLabel="Upload record"
        style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]}
      />
      {viewer}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: scale(15), color: colors.inkMuted },
  list: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(6), gap: verticalScale(14) },
  fab: { position: 'absolute', right: spacing.lg },
});
