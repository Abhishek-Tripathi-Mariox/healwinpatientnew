import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { Fab, ScreenHeader } from '../components';
import { insuranceApi, type InsurancePolicy } from '../api/insurance';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Insurance'>;
type Rt = RouteProp<RootStackParamList, 'Insurance'>;

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CLAIM_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  settled: 'Settled',
};

export const InsuranceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const patientUserId = route.params?.patientUserId;
  const patientName = route.params?.patientName;
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      insuranceApi
        .list(patientUserId)
        .then(setPolicies)
        .catch(() => setPolicies([]))
        .finally(() => setLoading(false));
    }, [patientUserId]),
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title={patientName ? `${patientName}'s Insurance` : 'My Insurance'} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(100) }]}>
          {policies.length === 0 ? (
            <Text style={styles.empty}>
              No insurance added yet. Tap + to add your policy, like handing over your insurance card.
            </Text>
          ) : (
            policies.map((p) => {
              const pct = p.sumInsured > 0 ? Math.min(1, p.used / p.sumInsured) : 0;
              const isOpen = expanded === p._id;
              return (
                <Pressable
                  key={p._id}
                  style={[styles.card, cardShadow]}
                  onPress={() => setExpanded(isOpen ? null : p._id)}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payerName}>{p.payerName}</Text>
                      <Text style={styles.policyNumber}>Policy · {p.policyNumber}</Text>
                    </View>
                    <View style={[styles.badge, !p.isActive && styles.badgeInactive]}>
                      <Text style={styles.badgeText}>{p.isActive ? 'Active' : 'Inactive'}</Text>
                    </View>
                  </View>

                  <View style={styles.balanceRow}>
                    <Text style={styles.remainingLabel}>Remaining budget</Text>
                    <Text style={styles.remainingValue}>{money(p.remaining)}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.trackFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                  <Text style={styles.subLine}>
                    {money(p.used)} used of {money(p.sumInsured)} sum insured
                    {p.pending > 0 ? ` · ${money(p.pending)} pending` : ''}
                  </Text>

                  {!!(p.validFrom || p.validTo) && (
                    <Text style={styles.validity}>
                      Valid {fmtDate(p.validFrom)} – {fmtDate(p.validTo)}
                    </Text>
                  )}

                  {isOpen && (
                    <View style={styles.claimsWrap}>
                      <Text style={styles.claimsHeader}>Claims</Text>
                      {p.claims.length === 0 ? (
                        <Text style={styles.noClaims}>No claims raised on this policy yet.</Text>
                      ) : (
                        p.claims.map((c) => (
                          <View key={c._id} style={styles.claimRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.claimNumber}>{c.claimNumber}</Text>
                              <Text style={styles.claimDate}>{fmtDate(c.createdAt)}</Text>
                            </View>
                            <View style={[styles.claimBadge, styles[`claimBadge_${c.status}` as const]]}>
                              <Text style={styles.claimBadgeText}>{CLAIM_STATUS_LABEL[c.status] || c.status}</Text>
                            </View>
                            <Text style={styles.claimAmount}>{money(c.amount)}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
      {!patientUserId && (
        <Fab
          icon="plus"
          onPress={() => navigation.navigate('AddInsurance')}
          accessibilityLabel="Add insurance"
          style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8) },
  empty: { fontFamily: fonts.regular, fontSize: scale(14), color: colors.inkMuted, textAlign: 'center', marginTop: verticalScale(40), lineHeight: scale(20) },
  card: { backgroundColor: colors.surface, borderRadius: scale(14), padding: scale(16), marginBottom: verticalScale(14) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  payerName: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.ink },
  policyNumber: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(2) },
  badge: { paddingHorizontal: scale(10), height: verticalScale(24), borderRadius: scale(12), backgroundColor: '#E6F4E6', alignItems: 'center', justifyContent: 'center' },
  badgeInactive: { backgroundColor: colors.dashBg },
  badgeText: { fontFamily: fonts.semiBold, fontSize: scale(11), color: colors.ink },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: verticalScale(16) },
  remainingLabel: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
  remainingValue: { fontFamily: fonts.bold, fontSize: scale(22), color: colors.textBlack },
  track: { height: verticalScale(8), borderRadius: scale(4), backgroundColor: colors.dashBg, marginTop: verticalScale(8), overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: scale(4), backgroundColor: colors.directionsBlue },
  subLine: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(8) },
  validity: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(4) },
  claimsWrap: { marginTop: verticalScale(14), paddingTop: verticalScale(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E2E2' },
  claimsHeader: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.ink, marginBottom: verticalScale(8) },
  noClaims: { fontFamily: fonts.regular, fontSize: scale(12.5), color: colors.inkMuted },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: verticalScale(6) },
  claimNumber: { fontFamily: fonts.semiBold, fontSize: scale(12.5), color: colors.textBlack },
  claimDate: { fontFamily: fonts.regular, fontSize: scale(11), color: colors.inkMuted, marginTop: verticalScale(1) },
  claimBadge: { paddingHorizontal: scale(8), height: verticalScale(20), borderRadius: scale(10), backgroundColor: colors.dashBg, alignItems: 'center', justifyContent: 'center' },
  claimBadge_settled: { backgroundColor: '#E6F4E6' },
  claimBadge_approved: { backgroundColor: '#E6F4E6' },
  claimBadge_rejected: { backgroundColor: '#FDECEC' },
  claimBadge_submitted: { backgroundColor: '#FFF4DE' },
  claimBadge_draft: { backgroundColor: colors.dashBg },
  claimBadgeText: { fontFamily: fonts.semiBold, fontSize: scale(10.5), color: colors.ink },
  claimAmount: { fontFamily: fonts.bold, fontSize: scale(12.5), color: colors.textBlack },
  fab: { position: 'absolute', right: spacing.lg },
});
