import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

import {ScreenHeader} from '../components';
import {AppAlert} from '../services/appAlert';
import {
  hmsApi,
  type HmsAppointment,
  type HmsPrescription,
  type HmsLabOrder,
  type HmsInvoice,
  type HmsBillingSummary,
  type HmsAdmission,
  type HmsDocument,
} from '../api/hms';
import {useRecordViewer} from '../hooks/useRecordViewer';
import {colors, fonts, scale, spacing, verticalScale} from '../theme';
import {cardShadow} from '../theme/shadows';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HospitalRecords'>;
type Rt = RouteProp<RootStackParamList, 'HospitalRecords'>;
type Tab =
  | 'appointments'
  | 'prescriptions'
  | 'lab'
  | 'bills'
  | 'admissions'
  | 'media';
const TABS: {key: Tab; label: string}[] = [
  {key: 'appointments', label: 'Appointments'},
  {key: 'prescriptions', label: 'Prescriptions'},
  {key: 'lab', label: 'Lab Reports'},
  {key: 'bills', label: 'Bills'},
  {key: 'admissions', label: 'Admissions'},
  {key: 'media', label: 'Photos & Videos'},
];

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
const titleCase = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const HospitalRecordsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const patientUserId = route.params?.patientUserId;
  const patientName = route.params?.patientName;
  const [tab, setTab] = useState<Tab>('appointments');
  const [loading, setLoading] = useState(false);

  const [appointments, setAppointments] = useState<HmsAppointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<HmsPrescription[]>([]);
  const [labs, setLabs] = useState<HmsLabOrder[]>([]);
  const [bills, setBills] = useState<HmsInvoice[]>([]);
  const [billSummary, setBillSummary] = useState<HmsBillingSummary | null>(
    null,
  );
  // Bills are collapsed to a few lines by default; tapping one shows every
  // charge and the payment history.
  const [openBill, setOpenBill] = useState<string | null>(null);
  const [admissions, setAdmissions] = useState<HmsAdmission[]>([]);
  const [media, setMedia] = useState<HmsDocument[]>([]);
  const {openRecord, viewer} = useRecordViewer();

  const load = useCallback(
    async (t: Tab) => {
      setLoading(true);
      try {
        if (t === 'appointments') {
          setAppointments(await hmsApi.appointments(patientUserId));
        } else if (t === 'prescriptions') {
          setPrescriptions(await hmsApi.prescriptions(patientUserId));
        } else if (t === 'lab') {
          setLabs(await hmsApi.labOrders(patientUserId));
        } else if (t === 'bills') {
          const [inv, sum] = await Promise.all([
            hmsApi.invoices(patientUserId),
            hmsApi.billingSummary(patientUserId).catch(() => null),
          ]);
          setBills(inv);
          setBillSummary(sum);
        } else if (t === 'admissions') {
          setAdmissions(await hmsApi.admissions(patientUserId));
        } else if (t === 'media') {
          setMedia(await hmsApi.documents(patientUserId));
        }
      } catch {
        /* leave empty */
      } finally {
        setLoading(false);
      }
    },
    [patientUserId],
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const empty = (msg: string) => <Text style={styles.empty}>{msg}</Text>;

  /**
   * Open the printable prescription in the device's PDF viewer. Two hops: an
   * authenticated call mints a short-lived scoped link, which Linking can open
   * (it cannot send an auth header itself).
   */
  const openPrescription = async (encounterId: string) => {
    try {
      const {url} = await hmsApi.prescriptionLink(encounterId, patientUserId);
      await Linking.openURL(url);
    } catch {
      AppAlert.alert(
        'Could not open',
        'The prescription could not be opened. Please try again.',
      );
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={patientName ? `${patientName}'s Records` : 'Hospital Records'}
        onBack={() => navigation.goBack()}
      />

      {!patientUserId && (
        <Pressable
          style={styles.bookBtn}
          onPress={() => navigation.navigate('BookAppointment')}>
          <Text style={styles.bookText}>+ Book OPD Appointment</Text>
        </Pressable>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // flexGrow:0 is essential. A ScrollView with no `style` inside a
        // flex-column parent expands to fill the remaining height — this
        // horizontal chip row was consuming most of the screen and pushing
        // the content down, which looked like a huge blank gap under the tabs.
        style={styles.tabsBar}
        contentContainerStyle={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + verticalScale(24)},
        ]}>
        {loading ? (
          <ActivityIndicator
            color={colors.brandRed}
            style={{marginTop: verticalScale(40)}}
          />
        ) : tab === 'appointments' ? (
          appointments.length === 0 ? (
            empty('No appointments yet. Book an OPD appointment above.')
          ) : (
            appointments.map(a => (
              <View key={a._id} style={[styles.card, cardShadow]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{a.doctorName}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Token {a.tokenNumber}</Text>
                  </View>
                </View>
                {!!a.speciality && (
                  <Text style={styles.cardSub}>{a.speciality}</Text>
                )}
                <Text style={styles.meta}>
                  {fmtDateTime(a.scheduledAt)} · {titleCase(a.status)}
                </Text>
                {!!a.reason && <Text style={styles.body}>{a.reason}</Text>}
              </View>
            ))
          )
        ) : tab === 'prescriptions' ? (
          prescriptions.length === 0 ? (
            empty('No visits on record.')
          ) : (
            prescriptions.map(p => (
              <View key={p._id} style={[styles.card, cardShadow]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{p.doctorName}</Text>
                  <Text style={styles.meta}>{fmtDate(p.visitDate)}</Text>
                </View>
                <Text style={styles.cardSub}>
                  {p.doctorSpeciality ? `${p.doctorSpeciality} · ` : ''}
                  {titleCase(p.encounterType)} visit
                </Text>

                {!!p.chiefComplaint && (
                  <Text style={styles.body}>
                    Came in for: {p.chiefComplaint}
                  </Text>
                )}
                {p.diagnoses.length > 0 && (
                  <Text style={styles.body}>
                    Diagnosis: {p.diagnoses.join(', ')}
                    {p.severity ? ` (${titleCase(p.severity)})` : ''}
                  </Text>
                )}

                {/* What the doctor actually told the patient. */}
                {!!p.summary && (
                  <View style={styles.adviceBox}>
                    <Text style={styles.breakTitle}>
                      What the doctor advised
                    </Text>
                    <Text style={styles.body}>{p.summary}</Text>
                  </View>
                )}
                {!p.summary && !!p.treatmentPlan && (
                  <View style={styles.adviceBox}>
                    <Text style={styles.breakTitle}>Treatment plan</Text>
                    <Text style={styles.body}>{p.treatmentPlan}</Text>
                  </View>
                )}

                {p.prescriptions.length > 0 && (
                  <View style={styles.sectionBreak}>
                    <Text style={styles.breakTitle}>Medicines</Text>
                    {p.prescriptions.map((rx, i) => (
                      <View key={i}>
                        <Text style={styles.body}>
                          • {rx.drug}
                          {rx.dose ? ` ${rx.dose}` : ''}
                          {rx.frequency ? `  ${rx.frequency}` : ''}
                          {rx.duration ? `  ×${rx.duration}` : ''}
                        </Text>
                        {(rx.timing || rx.notes) && (
                          <Text style={styles.rxNote}>
                            {[rx.timing, rx.notes].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {!!p.tests && p.tests.length > 0 && (
                  <View style={styles.sectionBreak}>
                    <Text style={styles.breakTitle}>Tests ordered</Text>
                    {p.tests.map((t, i) => (
                      <Text key={i} style={styles.body}>
                        • {t.name}
                        <Text style={styles.muted}>
                          {' '}
                          — {titleCase(t.status)}
                        </Text>
                        {t.resultValue ? `  ${t.resultValue}` : ''}
                      </Text>
                    ))}
                  </View>
                )}

                {!!p.vitals && (
                  <Text style={styles.rxNote}>
                    {[
                      p.vitals.bloodPressure
                        ? `BP ${p.vitals.bloodPressure}`
                        : null,
                      p.vitals.pulse ? `Pulse ${p.vitals.pulse}` : null,
                      p.vitals.temperature
                        ? `Temp ${p.vitals.temperature}°F`
                        : null,
                      p.vitals.spo2 ? `SpO₂ ${p.vitals.spo2}%` : null,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Text>
                )}

                <Pressable
                  onPress={() => openPrescription(p._id)}
                  style={styles.rxDownload}>
                  <Text style={styles.rxDownloadText}>
                    ⬇ Download prescription (PDF)
                  </Text>
                </Pressable>

                {!!p.followUpAt && (
                  <Text style={styles.due}>
                    Follow-up on {fmtDate(p.followUpAt)}
                  </Text>
                )}
              </View>
            ))
          )
        ) : tab === 'lab' ? (
          labs.length === 0 ? (
            empty('No lab or imaging orders.')
          ) : (
            labs.map(d => (
              <View key={d._id} style={[styles.card, cardShadow]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{d.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{titleCase(d.status)}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>
                  {d.category === 'imaging' ? 'Imaging' : 'Lab'} ·{' '}
                  {fmtDate(d.orderedAt)}
                </Text>
                {!!d.resultValue && (
                  <Text style={styles.body}>Result: {d.resultValue}</Text>
                )}
                {!!d.resultNotes && (
                  <Text style={styles.body}>{d.resultNotes}</Text>
                )}
                {d.reports.map((r, i) => (
                  <Pressable
                    key={i}
                    onPress={() =>
                      Linking.openURL(r.url).catch(() => undefined)
                    }>
                    <Text style={styles.link}>
                      📄 {r.label || 'View report'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))
          )
        ) : tab === 'bills' ? (
          bills.length === 0 ? (
            empty('No hospital bills.')
          ) : (
            <>
              {/* Lifetime totals — the "how much have I been charged and how
                  much have I paid" answer, before any individual bill. */}
              {billSummary && (
                <View style={[styles.card, cardShadow]}>
                  <Text style={styles.cardTitle}>Billing summary</Text>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Total billed</Text>
                    <Text style={styles.sumValue}>
                      ₹{billSummary.totalBilled.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Paid</Text>
                    <Text style={[styles.sumValue, styles.paidText]}>
                      ₹{billSummary.totalPaid.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={[styles.sumRow, styles.sumTotalRow]}>
                    <Text style={styles.sumTotalLabel}>Balance due</Text>
                    <Text
                      style={[
                        styles.sumTotalValue,
                        billSummary.balanceDue > 0
                          ? styles.dueText
                          : styles.paidText,
                      ]}>
                      ₹{billSummary.balanceDue.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={styles.cardSub}>
                    {billSummary.invoiceCount} bill
                    {billSummary.invoiceCount === 1 ? '' : 's'}
                    {billSummary.unpaidCount > 0
                      ? ` · ${billSummary.unpaidCount} pending`
                      : ' · all settled'}
                  </Text>

                  {/* Where the money went — what was actually consumed. */}
                  {billSummary.bySection.length > 0 && (
                    <View style={styles.sectionBreak}>
                      <Text style={styles.breakTitle}>
                        What you were charged for
                      </Text>
                      {billSummary.bySection.map(sec => (
                        <View key={sec.section} style={styles.sumRow}>
                          <Text style={styles.body}>
                            {titleCase(sec.section)}{' '}
                            <Text style={styles.muted}>×{sec.count}</Text>
                          </Text>
                          <Text style={styles.body}>
                            ₹{sec.amount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {bills.map(inv => {
                const open = openBill === inv._id;
                const shown = open ? inv.items : inv.items.slice(0, 4);
                return (
                  <Pressable
                    key={inv._id}
                    onPress={() => setOpenBill(open ? null : inv._id)}
                    style={[styles.card, cardShadow]}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardTitle}>
                        ₹{inv.total.toLocaleString('en-IN')}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          inv.balanceDue > 0
                            ? styles.badgeDue
                            : styles.badgePaid,
                        ]}>
                        <Text
                          style={[
                            styles.badgeText,
                            inv.balanceDue > 0
                              ? styles.badgeDueText
                              : styles.badgePaidText,
                          ]}>
                          {titleCase(inv.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardSub}>
                      {inv.invoiceNo ? `${inv.invoiceNo} · ` : ''}
                      {fmtDate(inv.createdAt)}
                    </Text>

                    {shown.map((it, i) => (
                      <View key={i} style={styles.sumRow}>
                        <Text style={styles.body}>
                          • {it.description}
                          {it.quantity > 1 ? (
                            <Text style={styles.muted}> ×{it.quantity}</Text>
                          ) : null}
                        </Text>
                        <Text style={styles.body}>
                          ₹{it.amount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ))}
                    {!open && inv.items.length > 4 && (
                      <Text style={styles.moreLink}>
                        +{inv.items.length - 4} more — tap to see the full bill
                      </Text>
                    )}

                    {open && (
                      <>
                        {(inv.discount ?? 0) > 0 && (
                          <View style={styles.sumRow}>
                            <Text style={styles.body}>Discount</Text>
                            <Text style={styles.body}>
                              −₹{(inv.discount ?? 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        )}
                        {(inv.taxAmount ?? 0) > 0 && (
                          <View style={styles.sumRow}>
                            <Text style={styles.body}>Tax</Text>
                            <Text style={styles.body}>
                              ₹{(inv.taxAmount ?? 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        )}
                        {inv.payments && inv.payments.length > 0 && (
                          <View style={styles.sectionBreak}>
                            <Text style={styles.breakTitle}>Payments</Text>
                            {inv.payments.map((p, i) => (
                              <View key={i} style={styles.sumRow}>
                                <Text style={styles.body}>
                                  {fmtDate(p.paidAt)} · {titleCase(p.method)}
                                </Text>
                                <Text style={[styles.body, styles.paidText]}>
                                  ₹{p.amount.toLocaleString('en-IN')}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    <View style={[styles.sumRow, styles.sumTotalRow]}>
                      <Text style={styles.sumLabel}>Paid</Text>
                      <Text style={[styles.body, styles.paidText]}>
                        ₹{(inv.amountPaid ?? 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    {inv.balanceDue > 0 && (
                      <Text style={styles.due}>
                        Balance due: ₹{inv.balanceDue.toLocaleString('en-IN')}
                      </Text>
                    )}

                    {inv.claim ? (
                      <Pressable
                        style={styles.insuranceRow}
                        onPress={() =>
                          navigation.navigate(
                            'Insurance',
                            patientUserId
                              ? {patientUserId, patientName}
                              : undefined,
                          )
                        }>
                        <Text style={styles.insuranceText}>
                          🛡️ Insurance claim {inv.claim.claimNumber} —{' '}
                          {titleCase(inv.claim.status)}
                        </Text>
                      </Pressable>
                    ) : inv.hasActivePolicy && inv.balanceDue > 0 ? (
                      <Pressable
                        style={styles.insuranceRow}
                        onPress={() =>
                          navigation.navigate(
                            'Insurance',
                            patientUserId
                              ? {patientUserId, patientName}
                              : undefined,
                          )
                        }>
                        <Text style={styles.insuranceText}>
                          🛡️ You're insured — check My Insurance for coverage
                        </Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
            </>
          )
        ) : tab === 'admissions' ? (
          admissions.length === 0 ? (
            empty('No admissions on record.')
          ) : (
            admissions.map(a => (
              <View key={a._id} style={[styles.card, cardShadow]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>
                    {a.ward} · Bed {a.bedNumber}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{titleCase(a.status)}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>
                  Admitted {fmtDate(a.admittedAt)}
                  {a.dischargedAt
                    ? `  ·  Discharged ${fmtDate(a.dischargedAt)}`
                    : ''}
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
          )
        ) : media.length === 0 ? (
          empty('No photos or videos on record.')
        ) : (
          <View style={styles.mediaGrid}>
            {media.map((m, i) => {
              const isPhoto = m.type === 'photo';
              const isVideo = m.type === 'video';
              return (
                <Pressable
                  key={i}
                  style={styles.mediaTile}
                  onPress={() =>
                    isPhoto || isVideo
                      ? openRecord({
                          name: m.label || (isVideo ? 'Video' : 'Photo'),
                          url: m.url,
                        })
                      : Linking.openURL(m.url).catch(() => undefined)
                  }>
                  {isPhoto ? (
                    <Image
                      source={{uri: m.url}}
                      style={styles.mediaThumb}
                      resizeMode="cover"
                    />
                  ) : isVideo ? (
                    <View style={[styles.mediaThumb, styles.mediaVideoThumb]}>
                      <Text style={styles.mediaPlayIcon}>▶</Text>
                    </View>
                  ) : (
                    <View style={[styles.mediaThumb, styles.mediaDocThumb]}>
                      <Text style={styles.mediaDocIcon}>📄</Text>
                    </View>
                  )}
                  <Text style={styles.mediaLabel} numberOfLines={1}>
                    {m.label || titleCase(m.type)}
                  </Text>
                  <Text style={styles.mediaDate}>{fmtDate(m.uploadedAt)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      {viewer}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  bookBtn: {
    marginHorizontal: spacing.lg,
    marginTop: verticalScale(8),
    height: verticalScale(46),
    borderRadius: scale(12),
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: {
    fontFamily: fonts.bold,
    fontSize: scale(15),
    color: colors.textWhite,
  },
  tabsBar: {flexGrow: 0, flexShrink: 0},
  tabs: {
    paddingHorizontal: spacing.lg,
    paddingVertical: verticalScale(12),
    gap: scale(8),
  },
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
  tabActive: {backgroundColor: colors.brandRed, borderColor: colors.brandRed},
  tabText: {fontFamily: fonts.medium, fontSize: scale(13), color: colors.ink},
  tabTextActive: {color: colors.textWhite},
  content: {paddingHorizontal: spacing.lg, paddingTop: verticalScale(4)},
  card: {
    backgroundColor: colors.surface,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(12),
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: scale(15),
    color: colors.ink,
    flexShrink: 1,
  },
  cardSub: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.inkMuted,
    marginTop: verticalScale(2),
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: scale(12),
    color: colors.inkMuted,
    marginTop: verticalScale(4),
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.textPrimary,
    marginTop: verticalScale(4),
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: scale(13),
    color: colors.directionsBlue,
    marginTop: verticalScale(6),
  },
  due: {
    fontFamily: fonts.bold,
    fontSize: scale(13),
    color: colors.brandRed,
    marginTop: verticalScale(6),
  },
  // Billing summary + itemised bill rows
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sumLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.inkMuted,
    marginTop: verticalScale(4),
  },
  sumValue: {
    fontFamily: fonts.semiBold,
    fontSize: scale(13),
    color: colors.textPrimary,
    marginTop: verticalScale(4),
  },
  sumTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.dashBg,
    marginTop: verticalScale(6),
    paddingTop: verticalScale(6),
  },
  sumTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: scale(14),
    color: colors.textPrimary,
  },
  sumTotalValue: {fontFamily: fonts.bold, fontSize: scale(15)},
  paidText: {color: colors.creditGreen},
  dueText: {color: colors.brandRed},
  muted: {color: colors.inkMuted},
  rxDownload: {marginTop: verticalScale(10), alignSelf: 'flex-start'},
  rxDownloadText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.linkBlue,
  },
  adviceBox: {
    backgroundColor: colors.dashBg,
    borderRadius: scale(8),
    padding: scale(10),
    marginTop: verticalScale(8),
  },
  rxNote: {
    fontFamily: fonts.regular,
    fontSize: scale(11),
    color: colors.inkMuted,
    marginTop: verticalScale(2),
    marginLeft: scale(10),
  },
  sectionBreak: {
    borderTopWidth: 1,
    borderTopColor: colors.dashBg,
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
  },
  breakTitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.inkMuted,
    marginBottom: verticalScale(2),
  },
  moreLink: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.linkBlue,
    marginTop: verticalScale(6),
  },
  insuranceRow: {
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: colors.dashBorder,
  },
  insuranceText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.directionsBlue,
  },
  badge: {
    paddingHorizontal: scale(10),
    height: verticalScale(24),
    borderRadius: scale(12),
    backgroundColor: colors.dashBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(11),
    color: colors.ink,
  },
  badgeDue: {backgroundColor: '#FDECEC'},
  badgeDueText: {color: colors.brandRed},
  badgePaid: {backgroundColor: '#E6F4E6'},
  badgePaidText: {color: colors.callGreen},
  summaryBox: {
    marginTop: verticalScale(10),
    padding: scale(10),
    borderRadius: scale(10),
    backgroundColor: colors.dashBg,
  },
  summaryLabel: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.ink,
    marginBottom: verticalScale(2),
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: scale(14),
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: verticalScale(40),
  },
  mediaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: scale(10)},
  mediaTile: {width: '31%'},
  mediaThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: scale(10),
    backgroundColor: colors.dashBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaVideoThumb: {backgroundColor: colors.ink},
  mediaPlayIcon: {
    fontFamily: fonts.bold,
    fontSize: scale(20),
    color: colors.textWhite,
  },
  mediaDocThumb: {borderWidth: 1, borderColor: colors.dashBorder},
  mediaDocIcon: {fontSize: scale(24)},
  mediaLabel: {
    fontFamily: fonts.medium,
    fontSize: scale(11),
    color: colors.ink,
    marginTop: verticalScale(4),
  },
  mediaDate: {
    fontFamily: fonts.regular,
    fontSize: scale(10),
    color: colors.inkMuted,
  },
});
