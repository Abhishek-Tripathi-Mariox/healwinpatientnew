import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Fab, FileCard, ScreenHeader } from '../components';
import { recordsApi, fieldRecordsApi, type FieldRecords } from '../api/catalog';
import { useRecordViewer } from '../hooks/useRecordViewer';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

interface Rec { id: string; name: string; desc: string; url: string }

const formatVitals = (v: Record<string, any> | null): string =>
  v && typeof v === 'object'
    ? Object.entries(v)
        .filter(([, val]) => val !== null && val !== undefined && val !== '')
        .map(([k, val]) => `${k}: ${val}`)
        .join('  ·  ')
    : '';

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
  const [field, setField] = React.useState<FieldRecords>({ patients: [], caseNotes: [] });
  const { openRecord, viewer } = useRecordViewer();

  // Real records persist server-side; refresh on focus (e.g. after upload).
  useFocusEffect(
    React.useCallback(() => {
      recordsApi.list().then((list) => setRecords(list.map(mapRecord).filter((r) => r.id))).catch(() => undefined);
      // Emergency / field records the ambulance crew registered against this
      // user's phone + vitals captured on this user's dispatches — bound
      // automatically, so they appear without any upload.
      fieldRecordsApi.list().then(setField).catch(() => undefined);
    }, []),
  );

  const isEmpty = records.length === 0 && field.patients.length === 0 && field.caseNotes.length === 0;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Medical Records" onBack={() => navigation.goBack()} />
      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No records yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(90) }]}>
          {field.patients.length > 0 && (
            <>
              <Text style={styles.section}>Emergency / Ambulance records</Text>
              {field.patients.map((p) => (
                <View key={p._id} style={styles.fieldCard}>
                  <Text style={styles.fieldName}>{p.fullName}</Text>
                  <Text style={styles.fieldMeta}>
                    {p.patientId} · Registered {new Date(p.registeredAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              ))}
            </>
          )}
          {field.caseNotes.length > 0 && (
            <>
              <Text style={styles.section}>Vitals & case notes</Text>
              {field.caseNotes.map((cn) => {
                const vitals = formatVitals(cn.vitals);
                return (
                  <View key={cn._id} style={styles.fieldCard}>
                    {!!vitals && <Text style={styles.vitals}>{vitals}</Text>}
                    {!!cn.notes && <Text style={styles.noteText}>{cn.notes}</Text>}
                    <Text style={styles.noteTime}>{new Date(cn.recordedAt).toLocaleString('en-IN')}</Text>
                  </View>
                );
              })}
            </>
          )}
          {records.length > 0 && (field.patients.length > 0 || field.caseNotes.length > 0) && (
            <Text style={styles.section}>Uploaded documents</Text>
          )}
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
  section: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textBlack, marginTop: verticalScale(4) },
  fieldCard: { backgroundColor: colors.surface, borderRadius: scale(12), borderWidth: 1, borderColor: colors.inputBorder, padding: scale(14), gap: verticalScale(6) },
  fieldName: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textBlack },
  fieldMeta: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted },
  vitals: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack },
  noteText: { fontFamily: fonts.regular, fontSize: scale(13), color: '#4A4A4A' },
  noteTime: { fontFamily: fonts.regular, fontSize: scale(11), color: colors.inkMuted },
  fab: { position: 'absolute', right: spacing.lg },
});
