import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {AppAlert} from '../services/appAlert';
import {BackButton, PlanCard} from '../components';
import {familyStore} from '../state/familyStore';
import {
  membershipApi,
  type ServerMembershipPlan,
  type ServerUserMembership,
} from '../api/misc';
import {colors, fonts, scale, spacing, verticalScale} from '../theme';
import type {RootStackParamList} from '../navigation/types';

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Membership'>;

/**
 * Membership.
 *
 * Previously this screen could only LOOK at plans — `enroll` existed in the API
 * and nothing ever called it, so there was no way to actually join one. The
 * active plan was also pushed into the same carousel as the buyable ones, so
 * every plan looked identical and you could not tell which was yours.
 *
 * Now: your plan sits at the top as its own panel, and each plan below has a
 * real Join button. The one you are on is labelled and cannot be re-bought.
 */
export const MembershipScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [plans, setPlans] = useState<ServerMembershipPlan[]>([]);
  const [active, setActive] = useState<ServerUserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [planList, mine] = await Promise.all([
      membershipApi.plans().catch(() => [] as ServerMembershipPlan[]),
      membershipApi.active().catch(() => null),
    ]);
    setPlans(planList);
    setActive(mine);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      familyStore.load().catch(() => undefined);
      load();
    }, [load]),
  );

  const confirmJoin = async (plan: ServerMembershipPlan) => {
    setJoining(plan._id);
    try {
      const res = await membershipApi.enroll(plan._id);
      await load();
      AppAlert.alert(
        'Membership active',
        res?.message ||
          `${plan.name} is active until ${fmtDate(res?.validUpto)}.`,
      );
    } catch (e: any) {
      AppAlert.alert(
        'Could not join',
        e?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setJoining(null);
    }
  };

  const join = (plan: ServerMembershipPlan) => {
    const upgrading = !!active && active.planId !== plan._id;
    const lines = [
      `₹${plan.price} for ${plan.durationMonths} months.`,
      plan.concessionPercent
        ? `You get ${plan.concessionPercent}% off every ambulance booking.`
        : '',
      // Renewing extends rather than restarting, so say so — otherwise
      // switching plans looks like it throws away time already paid for.
      upgrading ? 'Your remaining days carry over to the new plan.' : '',
      'Payment is collected separately by our team.',
    ].filter(Boolean);

    AppAlert.alert(
      upgrading ? `Switch to ${plan.name}?` : `Join ${plan.name}?`,
      lines.join('\n\n'),
      [
        {text: 'Cancel', style: 'cancel'},
        {text: upgrading ? 'Switch' : 'Join', onPress: () => confirmJoin(plan)},
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View
        style={[styles.topBar, {paddingTop: insets.top + verticalScale(8)}]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Membership</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + verticalScale(110),
        }}>
        {loading ? (
          <ActivityIndicator
            color={colors.directionsBlue}
            style={styles.loader}
          />
        ) : (
          <>
            {/* ── Your plan ─────────────────────────────────────────────── */}
            {active ? (
              <View style={styles.activeWrap}>
                <Text style={styles.sectionLabel}>Your plan</Text>
                <PlanCard
                  tier={active.tier}
                  info={[
                    {label: 'Plan', value: active.planName || '—'},
                    {label: 'Enrolled on', value: fmtDate(active.enrolledAt)},
                    {label: 'Valid up to', value: fmtDate(active.validUpto)},
                    ...(active.concessionPercent
                      ? [
                          {
                            label: 'Your discount',
                            value: `${active.concessionPercent}% off ambulance`,
                          },
                        ]
                      : []),
                    {
                      label: 'Family members',
                      value: active.maxFamilyMembers
                        ? `${active.familyCount ?? 0} of ${
                            active.maxFamilyMembers
                          }`
                        : String(active.familyCount ?? 0),
                    },
                  ]}
                />
                {typeof active.daysRemaining === 'number' &&
                  active.daysRemaining <= 30 && (
                    <Text style={styles.expiring}>
                      {active.daysRemaining === 0
                        ? 'Your plan expires today — renew below to keep your benefits.'
                        : `Expires in ${active.daysRemaining} day${
                            active.daysRemaining === 1 ? '' : 's'
                          } — renew below to keep your benefits.`}
                    </Text>
                  )}
              </View>
            ) : (
              <View style={styles.noPlan}>
                <Text style={styles.noPlanTitle}>You are not a member yet</Text>
                <Text style={styles.noPlanText}>
                  Join a plan to get a discount on every ambulance booking and
                  cover for your family.
                </Text>
              </View>
            )}

            {/* ── Plans you can join ────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, styles.plansLabel]}>
              {active ? 'Change your plan' : 'Available plans'}
            </Text>

            {plans.length === 0 ? (
              <Text style={styles.empty}>
                No plans are available right now. Please check back later.
              </Text>
            ) : (
              plans.map(p => {
                const isCurrent = active?.planId === p._id;
                return (
                  <View key={p._id} style={styles.planWrap}>
                    <PlanCard
                      tier={p.tier}
                      name={p.name}
                      priceLabel={`₹${p.price}${
                        p.durationMonths ? ` / ${p.durationMonths} mo` : ''
                      }${
                        p.concessionPercent
                          ? ` · ${p.concessionPercent}% off`
                          : ''
                      }`}
                      bullets={p.bullets || []}
                    />
                    <Pressable
                      onPress={() => join(p)}
                      disabled={isCurrent || joining !== null}
                      style={({pressed}) => [
                        styles.joinBtn,
                        isCurrent && styles.joinBtnCurrent,
                        pressed && !isCurrent && styles.pressed,
                      ]}>
                      {joining === p._id ? (
                        <ActivityIndicator color={colors.textWhite} />
                      ) : (
                        <Text
                          style={[
                            styles.joinText,
                            isCurrent && styles.joinTextCurrent,
                          ]}>
                          {isCurrent
                            ? '✓ Your current plan'
                            : active
                            ? 'Switch to this plan'
                            : 'Join this plan'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })
            )}

            {/* Family lives on its own screen — this one is about plans.
                The count is shown in the plan panel above, and this links to
                the list rather than repeating it. */}
            {!!active && (
              <Pressable
                onPress={() => navigation.navigate('FamilyMembers')}
                style={({pressed}) => [
                  styles.familyLink,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.familyLinkText}>
                  Manage family members
                  {active.maxFamilyMembers
                    ? ` (${active.familyCount ?? 0} of ${
                        active.maxFamilyMembers
                      })`
                    : ''}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: verticalScale(8),
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: scale(18),
    color: colors.textBlack,
    marginLeft: spacing.md,
  },
  loader: {marginTop: verticalScale(40)},

  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: scale(13),
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: verticalScale(8),
  },
  plansLabel: {marginTop: verticalScale(24)},

  activeWrap: {paddingHorizontal: spacing.lg, paddingTop: verticalScale(6)},
  expiring: {
    fontFamily: fonts.medium,
    fontSize: scale(12),
    color: colors.brandRed,
    marginTop: verticalScale(10),
  },

  noPlan: {
    marginHorizontal: spacing.lg,
    marginTop: verticalScale(6),
    padding: spacing.md,
    borderRadius: scale(12),
    backgroundColor: '#F1F1F4',
  },
  noPlanTitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.textBlack,
  },
  noPlanText: {
    fontFamily: fonts.regular,
    fontSize: scale(12.5),
    color: colors.inkMuted,
    marginTop: verticalScale(4),
    lineHeight: scale(18),
  },

  planWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: verticalScale(18),
  },
  joinBtn: {
    height: verticalScale(46),
    borderRadius: scale(12),
    backgroundColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(10),
  },
  joinBtnCurrent: {backgroundColor: '#E3E9F5'},
  joinText: {
    fontFamily: fonts.bold,
    fontSize: scale(14.5),
    color: colors.textWhite,
  },
  joinTextCurrent: {color: colors.directionsBlue},
  pressed: {opacity: 0.85},

  familyLink: {
    marginHorizontal: spacing.lg,
    marginTop: verticalScale(6),
    height: verticalScale(46),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.directionsBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.directionsBlue,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
  },
});
