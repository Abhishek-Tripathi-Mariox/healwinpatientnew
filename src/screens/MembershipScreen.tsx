import React, { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, Dots, Fab, FamilyMemberCard, PlanCard } from '../components';
import { svgs } from '../svgAssets';
import { familyStore, useFamilyMembers } from '../state/familyStore';
import { membershipApi } from '../api/misc';
import { colors, scale, screen, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type PlanCardData =
  | { tier: 'silver' | 'gold'; bullets: string[] }
  | { tier: 'gold' | 'silver'; info: { label: string; value: string }[] };

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

const CARD_W = screen.width - spacing.lg * 2;

type Nav = NativeStackNavigationProp<RootStackParamList, 'Membership'>;

export const MembershipScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [page, setPage] = useState(0);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const family = useFamilyMembers();

  useFocusEffect(
    React.useCallback(() => {
      familyStore.load().catch(() => undefined);
    }, []),
  );

  // Real, admin-managed plans + the user's active membership (no hardcoded copy).
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        const [planList, active] = await Promise.all([
          membershipApi.plans().catch(() => []),
          membershipApi.active().catch(() => null),
        ]);
        if (!alive) return;
        const cards: PlanCardData[] = planList.map((p) => ({ tier: p.tier, bullets: p.bullets || [] }));
        if (active) {
          cards.push({
            tier: active.tier,
            info: [
              { label: 'Active Plan', value: active.planName || '—' },
              { label: 'Date of Enrolment', value: fmtDate(active.enrolledAt) },
              { label: 'Valid Up to', value: fmtDate(active.validUpto) },
              { label: 'No. of Family Members', value: String(active.familyCount ?? 0) },
            ],
          });
        }
        setPlans(cards);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + spacing.md)));
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(100) }}
      >
        {/* Plan carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_W + spacing.md}
          snapToAlignment="start"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.carousel}
        >
          {plans.map((p, i) => (
            <PlanCard
              key={i}
              tier={p.tier}
              bullets={'bullets' in p ? p.bullets : undefined}
              info={'info' in p ? p.info : undefined}
              style={{ width: CARD_W, marginRight: i < plans.length - 1 ? spacing.md : 0 }}
            />
          ))}
        </ScrollView>

        {plans.length > 0 && (
          <View style={styles.dots}>
            <Dots count={plans.length} activeIndex={Math.min(page, plans.length - 1)} />
          </View>
        )}

        {/* Family members */}
        <View style={styles.family}>
          {family.map((m) => (
            <FamilyMemberCard
              key={m.id}
              Photo={svgs.avatar}
              photoUri={m.photo || undefined}
              name={m.name}
              age={m.age ?? '—'}
              relation={m.relation}
              onPress={() => navigation.navigate('AddFamilyMember', { member: m })}
            />
          ))}
        </View>
      </ScrollView>

      <Fab
        icon="plus"
        onPress={() => navigation.navigate('AddFamilyMember')}
        size={scale(70)}
        accessibilityLabel="Add family member"
        style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(6),
  },
  dots: {
    marginTop: verticalScale(14),
  },
  family: {
    paddingHorizontal: spacing.lg,
    marginTop: verticalScale(24),
    gap: verticalScale(16),
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
});
