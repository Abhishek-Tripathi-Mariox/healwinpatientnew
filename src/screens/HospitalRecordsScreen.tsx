import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import {
  hmsApi,
  type HmsAppointment,
  type HmsPrescription,
  type HmsLabOrder,
  type HmsInvoice,
  type HmsAdmission,
} from '../api/hms';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HospitalRecords'>;
type Tab = 'appointments' | 'prescriptions' | 'lab' | 'bills' | 'admissions';
const TABS: { key: Tab; label: string }[] = [
  { key: 'appointments', label: 'Appointments' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'lab', label: 'Lab Reports' },
  { key: 'bills', label: 'Bills' },
  { key: 'admissions', label: 'Admissions' },
];

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';
const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const HospitalRecordsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('appointments');
  const [loading, setLoading] = useState(false);

  const [appointments, setAppointments] = useState<HmsAppointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<HmsPrescription[]>([]);
  const [labs, setLabs] = useState<HmsLabOrder[]>([]);
  const [bills, setBills] = useState<HmsInvoice[]>([]);
  const [admissions, setAdmissions] = useState<HmsAdmission[]>([]);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'appointments') setAppointments(await hmsApi.appointments());
      else if (t === 'prescriptions') setPrescriptions(await hmsApi.prescriptions());
      else if (t === 'lab') setLabs(await hmsApi.labOrders());
      else if (t === 'bills') setBills(await hmsApi.invoices());
      else if (t === 'admissions') setAdmissions(await hmsApi.admissions());
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const empty = (msg: string) => <Text style={styles.empty}>{msg}</Text>;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Hospital Records" onBack={() => navigation.goBack()} />

      <Pressable style={styles.bookBtn} onPress={() => navigation.navigate('BookAppointment')}>
        <Text style={styles.bookText}>+ Book OPD Appointment</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {loading ? (
          <ActivityIndicator color={colors.brandRed} style={{ marginTop: verticalScale(40) }} />
        ) : tab === 'appointments' ? (
          appointments.length === 0 ? empty('No appointments yet. Book an OPD appointment above.') :
          appointments.map((a) => (
            <View key={a._id} style={[styles.card, cardShadow]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{a.doctorName}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>Token {a.tokenNumber}</Text></View>
              </View>
              {!!a.speciality && <Text style={styles.cardSub}>{a.speciality}</Text>}
              <Text style={styles.meta}>{fmtDateTime(a.scheduledAt)}  ·  {titleCase(a.status)}</Text>
              {!!a.reason && <Text style={styles.body}>{a.reason}</Text>}
            </View>
          ))
        ) : tab === 'prescriptions' ? (
          prescriptions.length === 0 ? empty('No prescriptions on record.') :
          prescriptions.map((p) => (
            <View key={p._id} style={[styles.card, cardShadow]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{p.doctorName}</Text>
                <Text style={styles.meta}>{fmtDate(p.visitDate)}</Text>
              </View>
              {p.diagnoses.length > 0 && <Text style={styles.cardSub}>Dx: {p.diagnoses.join(', ')}</Text>}
              {p.prescriptions.map((rx, i) => (
                <Text key={i} style={styles.body}>
                  • {rx.drug}{rx.dose ? ` ${rx.dose}` : ''}{rx.frequency ? `  ${rx.frequency}` : ''}{rx.duration ? `  ×${rx.duration}` : ''}
                </Text>
              ))}
            </View>
          ))
        ) : tab === 'lab' ? (
          labs.length === 0 ? empty('No lab or imaging orders.') :
          labs.map((d) => (
            <View key={d._id} style={[styles.card, cardShadow]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{titleCase(d.status)}</Text></View>
              </View>
              <Text style={styles.cardSub}>{d.category === 'imaging' ? 'Imaging' : 'Lab'}  ·  {fmtDate(d.orderedAt)}</Text>
              {!!d.resultValue && <Text style={styles.body}>Result: {d.resultValue}</Text>}
              {!!d.resultNotes && <Text style={styles.body}>{d.resultNotes}</Text>}
              {d.reports.map((r, i) => (
                <Pressable key={i} onPress={() => Linking.openURL(r.url).catch(() => undefined)}>
                  <Text style={styles.link}>📄 {r.label || 'View report'}</Text>
                </Pressable>
              ))}
            </View>
          ))
        ) : tab === 'bills' ? (
          bills.length === 0 ? empty('No hospital bills.') :
          bills.map((inv) => (
            <View key={inv._id} style={[styles.card, cardShadow]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>₹{inv.total.toLocaleString('en-IN')}</Text>
                <View style={[styles.badge, inv.balanceDue > 0 ? styles.badgeDue : styles.badgePaid]}>
                  <Text style={[styles.badgeText, inv.balanceDue > 0 ? styles.badgeDueText : styles.badgePaidText]}>
                    {titleCase(inv.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSub}>{inv.invoiceNo ? `${inv.invoiceNo} · ` : ''}{fmtDate(inv.createdAt)}</Text>
              {inv.items.slice(0, 4).map((it, i) => (
                <Text key={i} style={styles.body}>• {it.description}  —  ₹{it.amount.toLocaleString('en-IN')}</Text>
              ))}
              {inv.balanceDue > 0 && (
                <Text style={styles.due}>Balance due: ₹{inv.balanceDue.toLocaleString('en-IN')}</Text>
              )}
            </View>
          ))
        ) : (
          admissions.length === 0 ? empty('No admissions on record.') :
          admissions.map((a) => (
            <View key={a._id} style={[styles.card, cardShadow]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{a.ward} · Bed {a.bedNumber}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{titleCase(a.status)}</Text></View>
              </View>
              <Text style={styles.cardSub}>
                Admitted {fmtDate(a.admittedAt)}{a.dischargedAt ? `  ·  Discharged ${fmtDate(a.dischargedAt)}` : ''}
              </Text>
              {!!a.reason && <Text style={styles.body}>{a.reason}</Text>}
              {!!a.dischargeSummary && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Discharge Summary</Text>
                  <Text style={styles.body}>{a.dischargeSummary}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bookBtn: {
    marginHorizontal: spacing.lg,
    marginTop: verticalScale(8),
    height: verticalScale(46),
    borderRadius: scale(12),
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
  tabs: { paddingHorizontal: spacing.lg, paddingVertical: verticalScale(12), gap: scale(8) },
  tab: {
    paddingHorizontal: scale(16),
    height: verticalScale(36),
    borderRadius: scale(18),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dashBorder,
  },
  tabActive: { backgroundColor: colors.brandRed, borderColor: colors.brandRed },
  tabText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.ink },
  tabTextActive: { color: colors.textWhite },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(12),
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.ink, flexShrink: 1 },
  cardSub: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(2) },
  meta: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(4) },
  body: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.textPrimary, marginTop: verticalScale(4) },
  link: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.directionsBlue, marginTop: verticalScale(6) },
  due: { fontFamily: fonts.bold, fontSize: scale(13), color: colors.brandRed, marginTop: verticalScale(6) },
  badge: { paddingHorizontal: scale(10), height: verticalScale(24), borderRadius: scale(12), backgroundColor: colors.dashBg, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.semiBold, fontSize: scale(11), color: colors.ink },
  badgeDue: { backgroundColor: '#FDECEC' },
  badgeDueText: { color: colors.brandRed },
  badgePaid: { backgroundColor: '#E6F4E6' },
  badgePaidText: { color: colors.callGreen },
  summaryBox: { marginTop: verticalScale(10), padding: scale(10), borderRadius: scale(10), backgroundColor: colors.dashBg },
  summaryLabel: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.ink, marginBottom: verticalScale(2) },
  empty: { fontFamily: fonts.regular, fontSize: scale(14), color: colors.inkMuted, textAlign: 'center', marginTop: verticalScale(40) },
});
