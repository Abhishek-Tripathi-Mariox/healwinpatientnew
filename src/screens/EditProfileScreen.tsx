import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, Fab } from '../components';
import { EditIcon, PlusIcon } from '../components/icons';
import { svgs } from '../svgAssets';
import { useProfile } from '../state/profileStore';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

export const EditProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useProfile();
  const Avatar = svgs.avatar;

  const INFO = [
    { label: 'Age', value: profile.age },
    { label: 'Gender', value: profile.gender },
    { label: 'ID Type', value: profile.idType },
    { label: 'ID Number', value: profile.idNumber },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(90) }]}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, cardShadow]}>
          <View style={styles.avatar}>
            {profile.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.avatarImg} />
            ) : (
              <Avatar width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            {INFO.map((row) => (
              <Text key={row.label} style={styles.infoLine}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{`  :  ${row.value}`}</Text>
              </Text>
            ))}
          </View>
          <Pressable
            style={styles.editBtn}
            hitSlop={8}
            onPress={() => navigation.navigate('EditProfileForm')}
          >
            <EditIcon size={scale(20)} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Uploaded documents */}
        <View style={[styles.docsCard, cardShadow]}>
          <Text style={styles.docsTitle}>UPLOADED DOCUMENTS</Text>
          <View style={styles.docsInner}>
            <Text style={styles.docsEmpty}>No documents uploaded yet.</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('UploadDocument')}
            style={({ pressed }) => [styles.addBox, pressed && styles.pressed]}
          >
            <View style={[styles.addCircle, cardShadow]}>
              <PlusIcon size={scale(22)} color={colors.textBlack} />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Fab
        icon="forward"
        onPress={() => navigation.navigate('EditProfileForm')}
        style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]}
      />
    </View>
  );
};

const AVATAR = scale(95);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
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
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(12),
  },

  profileCard: {
    flexDirection: 'row',
    backgroundColor: colors.profileCardBg,
    borderRadius: scale(12),
    padding: scale(16),
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.avatarBorder,
  },
  avatarImg: { width: '100%', height: '100%' },
  profileInfo: {
    flex: 1,
    marginLeft: scale(16),
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: scale(20),
    letterSpacing: -0.3,
    color: '#393939',
    marginBottom: verticalScale(4),
  },
  infoLine: {
    marginTop: verticalScale(3),
  },
  infoLabel: {
    fontFamily: fonts.bold,
    fontSize: scale(13),
    color: colors.textBlack,
  },
  infoValue: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.textBlack,
  },
  editBtn: {
    position: 'absolute',
    top: scale(14),
    right: scale(14),
  },

  docsCard: {
    backgroundColor: '#F9F7F9',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(178,172,172,0.5)',
    padding: scale(16),
    marginTop: verticalScale(22),
  },
  docsTitle: {
    alignSelf: 'center',
    fontFamily: fonts.bold,
    fontSize: scale(18),
    color: colors.textBlack,
    marginBottom: verticalScale(16),
  },
  docsEmpty: {
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.inkMuted,
    textAlign: 'center',
    paddingVertical: verticalScale(18),
  },
  docsInner: {
    backgroundColor: '#F7F7F7',
    borderRadius: scale(9),
    borderWidth: 1,
    borderColor: '#969696',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(6),
  },
  docRow: {
    backgroundColor: 'transparent',
  },
  docDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D9D9D9',
    marginHorizontal: scale(8),
  },
  addBox: {
    height: verticalScale(130),
    borderRadius: scale(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.tabActive,
    backgroundColor: colors.dashBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(20),
  },
  pressed: { opacity: 0.85 },
  addCircle: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
  },
});
