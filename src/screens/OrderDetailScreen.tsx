import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
type Rt = RouteProp<RootStackParamList, 'OrderDetail'>;

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const humanStatus = (s: string) =>
  (s || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const statusTone = (s: string) =>
  s === 'CANCELLED'
    ? colors.brandRedDark
    : ['COMPLETED', 'DELIVERED', 'REPORT_READY'].includes(s)
      ? '#2E9B2E'
      : colors.directionsBlue;

export const OrderDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { kind } = params;
  const o = params.order || {};

  const title = kind === 'consultations' ? 'Consultation' : kind === 'lab' ? 'Lab Test' : 'Pharmacy Order';

  const open = (url?: string) =>
    url ? Linking.openURL(url).catch(() => Alert.alert('Could not open', 'Please try again.')) : undefined;

  return (
    <View style={styles.root}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(30) }]}>
        {/* Header */}
        <View style={[styles.card, cardShadow]}>
          <View style={styles.headRow}>
            <Text style={styles.head}>
              {kind === 'consultations'
                ? o.doctorName ? `Dr. ${o.doctorName}` : 'Consultation'
                : kind === 'lab'
                  ? (o.tests || []).map((t: any) => t.name).join(', ') || 'Lab tests'
                  : (o.items || []).map((i: any) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ') || 'Order'}
            </Text>
            <View style={[styles.chip, { backgroundColor: `${statusTone(o.status)}1A` }]}>
              <Text style={[styles.chipText, { color: statusTone(o.status) }]}>{humanStatus(o.status)}</Text>
            </View>
          </View>
          {kind === 'consultations' && !!o.speciality && <Text style={styles.sub}>{o.speciality}</Text>}
          {!!o.slotLabel && <Text style={styles.slot}>🕒 {o.slotLabel}</Text>}
        </View>

        {/* Consultation summary */}
        {kind === 'consultations' && (
          <View style={[styles.card, styles.gap, cardShadow]}>
            <Text style={styles.sectionTitle}>Doctor's summary</Text>
            {o.summary ? (
              <Text style={styles.body}>{o.summary}</Text>
            ) : (
              <Text style={styles.muted}>
                {o.status === 'COMPLETED' ? 'No summary added.' : 'Available after your consultation is completed.'}
              </Text>
            )}
            {!!o.symptoms && (
              <>
                <Text style={[styles.sectionTitle, styles.gapSm]}>Symptoms shared</Text>
                <Text style={styles.body}>{o.symptoms}</Text>
              </>
            )}
          </View>
        )}

        {/* Lab report */}
        {kind === 'lab' && (() => {
          // A report may span multiple pages/files. Fall back to the legacy
          // single-file `reportUrl` for older bookings.
          const files: { url: string; label?: string }[] =
            Array.isArray(o.reportFiles) && o.reportFiles.length > 0
              ? o.reportFiles
              : o.reportUrl
                ? [{ url: o.reportUrl, label: 'Report' }]
                : [];
          const hasReport = o.status === 'REPORT_READY' || !!o.reportNotes || files.length > 0;
          return (
          <View style={[styles.card, styles.gap, cardShadow]}>
            <Text style={styles.sectionTitle}>Report</Text>
            {hasReport ? (
              <>
                {!!o.reportNotes && (
                  <>
                    <Text style={styles.body}>{o.reportNotes}</Text>
                    {files.length > 0 && <View style={{ height: verticalScale(8) }} />}
                  </>
                )}
                {files.map((f, i) => (
                  <Pressable
                    key={i}
                    onPress={() => open(f.url)}
                    style={({ pressed }) => [styles.download, i > 0 && styles.gapSmFile, pressed && styles.pressed]}
                  >
                    <Text style={styles.downloadText}>
                      ⬇  {files.length > 1 ? (f.label || `Page ${i + 1}`) : 'Download report'}
                    </Text>
                  </Pressable>
                ))}
                {!o.reportNotes && files.length === 0 && <Text style={styles.muted}>Report is ready.</Text>}
              </>
            ) : (
              <Text style={styles.muted}>Your report will appear here once the lab completes the test.</Text>
            )}
            {(o.tests || []).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.gapSm]}>Tests</Text>
                {(o.tests || []).map((t: any, i: number) => (
                  <View key={i} style={styles.lineRow}>
                    <Text style={styles.lineName}>{t.name}</Text>
                    <Text style={styles.linePrice}>₹{t.price}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
          );
        })()}

        {/* Pharmacy items */}
        {kind === 'pharmacy' && (
          <View style={[styles.card, styles.gap, cardShadow]}>
            <Text style={styles.sectionTitle}>Items</Text>
            {(o.items || []).map((it: any, i: number) => (
              <View key={i} style={styles.lineRow}>
                <Text style={styles.lineName}>{it.name} × {it.qty}</Text>
                <Text style={styles.linePrice}>₹{it.price * it.qty}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Facts */}
        <View style={[styles.card, styles.gap, cardShadow]}>
          <Row k="Amount" v={`₹${kind === 'consultations' ? o.fee ?? 0 : o.totalAmount ?? 0}`} />
          <Row k="Placed on" v={fmt(o.createdAt)} />
        </View>
      </ScrollView>
    </View>
  );
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factK}>{k}</Text>
      <Text style={styles.factV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(6) },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(16) },
  gap: { marginTop: verticalScale(14) },
  gapSm: { marginTop: verticalScale(14) },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: scale(10) },
  head: { flex: 1, fontFamily: fonts.bold, fontSize: scale(16), color: colors.textBlack },
  chip: { borderRadius: scale(6), paddingHorizontal: scale(9), paddingVertical: verticalScale(3) },
  chipText: { fontFamily: fonts.semiBold, fontSize: scale(10) },
  sub: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted, marginTop: verticalScale(6) },
  slot: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.directionsBlue, marginTop: verticalScale(8) },
  sectionTitle: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textBlack, marginBottom: verticalScale(8) },
  body: { fontFamily: fonts.regular, fontSize: scale(13.5), color: colors.textBlack, lineHeight: scale(20) },
  muted: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted, lineHeight: scale(19) },
  download: { marginTop: verticalScale(12), height: verticalScale(46), borderRadius: scale(10), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  gapSmFile: { marginTop: verticalScale(8) },
  pressed: { opacity: 0.85 },
  downloadText: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textWhite },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: verticalScale(5) },
  lineName: { flex: 1, fontFamily: fonts.medium, fontSize: scale(13), color: colors.textBlack },
  linePrice: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(7) },
  factK: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
  factV: { flex: 1, textAlign: 'right', marginLeft: scale(12), fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.textBlack },
});
