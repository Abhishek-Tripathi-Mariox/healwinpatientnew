import React, {useCallback} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {BackButton, Fab, FamilyMemberCard} from '../components';
import {svgs} from '../svgAssets';
import {familyStore, useFamilyMembers} from '../state/familyStore';
import {colors, fonts, scale, spacing, verticalScale} from '../theme';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FamilyMembers'>;

/**
 * Family members — the people on this account.
 *
 * Previously there was no such screen: Profile → "Family Members" opened the
 * Membership screen, which had the family list bolted onto the bottom of it.
 * The two menu items led to the same place, which is why they looked
 * identical. Membership is now plans only; this is the family list.
 */
export const FamilyMembersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const family = useFamilyMembers();

  useFocusEffect(
    useCallback(() => {
      familyStore.load().catch(() => undefined);
    }, []),
  );

  return (
    <View style={styles.root}>
      <View
        style={[styles.topBar, {paddingTop: insets.top + verticalScale(8)}]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Family Members</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          {paddingBottom: insets.bottom + verticalScale(110)},
        ]}>
        <Text style={styles.hint}>
          People you can book for, send an SOS for, and see bills and records
          for.
        </Text>

        {family.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyText}>
              Add the people you look after, so you can book an ambulance or
              raise an emergency for them in one tap.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {family.map(m => (
              <FamilyMemberCard
                key={m.id}
                Photo={svgs.avatar}
                photoUri={m.photo || undefined}
                name={m.name}
                age={m.age ?? '—'}
                relation={m.relation}
                onPress={() =>
                  navigation.navigate('AddFamilyMember', {member: m})
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Fab
        icon="plus"
        onPress={() => navigation.navigate('AddFamilyMember')}
        size={scale(70)}
        accessibilityLabel="Add family member"
        style={[styles.fab, {bottom: insets.bottom + verticalScale(20)}]}
      />
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
  body: {paddingHorizontal: spacing.lg, paddingTop: verticalScale(6)},
  hint: {
    fontFamily: fonts.regular,
    fontSize: scale(12.5),
    color: colors.inkMuted,
    lineHeight: scale(18),
    marginBottom: verticalScale(16),
  },
  list: {gap: verticalScale(16)},
  empty: {
    padding: spacing.md,
    borderRadius: scale(12),
    backgroundColor: '#F1F1F4',
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.textBlack,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: scale(12.5),
    color: colors.inkMuted,
    marginTop: verticalScale(4),
    lineHeight: scale(18),
  },
  fab: {position: 'absolute', right: spacing.lg},
});
