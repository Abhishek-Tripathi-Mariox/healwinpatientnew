import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { familyApi, type FamilyOverview, type FamilyOverviewMember } from '../api/family';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FamilyExpenses'>;

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

/**
 * Whole-family view: self + every family member who has actually signed
 * into the app themselves (auto-linked by phone when they added a family
 * member's number — see backend user.service.ts#addUsers). Anyone in the
 * family can see everyone's combined hospital spend/insurance here, then
 * tap a member to open their real records/insurance via the same screens
 * used for "my" own data.
 */
export const FamilyExpensesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      familyApi
        .overview()
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }, []),
  );

  const openMember = (m: FamilyOverviewMember) => {
    if (m.isSelf) {
      navigation.navigate('HospitalRecords');
      return;
    }
    navigation.navigate('HospitalRecords', { patientUserId: m.userId, patientName: m.fullName });
  };

  const members = data?.members || [];
  const soloFamily = members.length <= 1;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Family Expenses" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={colors.brandRed} style={{ marginTop: verticalScale(40) }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
          {data && !soloFamily && (
            <View style={[styles.totalCard, cardShadow]}>
              <Text style={styles.totalLabel}>Family total billed</Text>
              <Text style={styles.totalValue}>{money(data.familyTotal.totalBilled)}</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalSub}>Paid {money(data.familyTotal.totalPaid)}</Text>
                <Text style={[styles.totalSub, data.familyTotal.balanceDue > 0 && styles.dueText]}>
                  Due {money(data.familyTotal.balanceDue)}
                </Text>
              </View>
            </View>
          )}

          {soloFamily && (
            <Text style={styles.hint}>
              Add a family member's phone number under Family Members — once they sign into the app
              themselves, their spend shows up here too.
            </Text>
          )}

          {members.map((m) => (
            <Pressable key={m.userId} style={[styles.card, cardShadow]} onPress={() => openMember(m)}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {m.isSelf ? 'You' : m.fullName}
                    {m.isHead && !m.isSelf ? ' · Head' : ''}
                  </Text>
                  {!!m.relation && !m.isSelf && <Text style={styles.relation}>{m.relation}</Text>}
                </View>
                <Text style={styles.chev}>›</Text>
              </View>

              <View style={styles.spendRow}>
                <Text style={styles.spendLabel}>Total billed</Text>
                <Text style={styles.spendValue}>{money(m.billing.totalBilled)}</Text>
              </View>
              {m.billing.balanceDue > 0 && (
                <Text style={styles.due}>Balance due: {money(m.billing.balanceDue)}</Text>
              )}
              {m.insurance.hasPolicy && (
                <Text style={styles.insuranceLine}>
                  🛡️ {money(m.insurance.totalRemaining)} insurance remaining
                </Text>
              )}
              {m.billing.invoiceCount === 0 && !m.insurance.hasPolicy && (
                <Text style={styles.noRecords}>No hospital records yet</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8) },
  hint: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.inkMuted,
    lineHeight: scale(19),
    marginBottom: verticalScale(16),
  },
  totalCard: {
    backgroundColor: colors.ink,
    borderRadius: scale(16),
    padding: scale(18),
    marginBottom: verticalScale(16),
  },
  totalLabel: { fontFamily: fonts.medium, fontSize: scale(13), color: 'rgba(255,255,255,0.7)' },
  totalValue: { fontFamily: fonts.bold, fontSize: scale(28), color: colors.textWhite, marginTop: verticalScale(4) },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: verticalScale(14) },
  totalSub: { fontFamily: fonts.medium, fontSize: scale(12.5), color: 'rgba(255,255,255,0.8)' },
  dueText: { color: '#FFB4B4' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(12),
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.ink },
  relation: { fontFamily: fonts.medium, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(2) },
  chev: { fontFamily: fonts.bold, fontSize: scale(20), color: colors.inkMuted },
  spendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingTop: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dashBorder,
  },
  spendLabel: { fontFamily: fonts.medium, fontSize: scale(12.5), color: colors.inkMuted },
  spendValue: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textBlack },
  due: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.brandRed, marginTop: verticalScale(6) },
  insuranceLine: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.directionsBlue, marginTop: verticalScale(6) },
  noRecords: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(6) },
});
