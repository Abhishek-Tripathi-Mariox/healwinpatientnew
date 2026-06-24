import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../components';
import {
  BookingIcon,
  ChevronForwardIcon,
  DoctorIcon,
  EditIcon,
  FamilyCareIcon,
  FileDocIcon,
  FlaskIcon,
  HelpIcon,
  IconProps,
  LogoutIcon,
  MapPinIcon,
  PharmacyIcon,
  SettingsIcon,
  ShieldCheckIcon,
  WalletIcon,
} from '../components/icons';
import { svgs } from '../svgAssets';
import { useProfile } from '../state/profileStore';
import { authStore } from '../state/authStore';
import { cardShadow } from '../theme/shadows';
import { colors, fonts, radius, scale, spacing, textStyles, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

interface Row {
  key: string;
  label: string;
  Icon: React.FC<IconProps>;
  route?: keyof RootStackParamList;
  danger?: boolean;
}

interface Section {
  title: string;
  rows: Row[];
}

// Menus grouped by what the user is trying to do (account vs activity vs
// health services vs records vs safety/support vs settings).
const SECTIONS: Section[] = [
  {
    title: 'Account',
    rows: [
      { key: 'edit', label: 'Edit Profile', Icon: EditIcon, route: 'EditProfile' },
      { key: 'membership', label: 'Membership', Icon: ShieldCheckIcon, route: 'Membership' },
      { key: 'family', label: 'Family Members', Icon: FamilyCareIcon, route: 'Membership' },
      { key: 'addresses', label: 'Saved Addresses', Icon: MapPinIcon, route: 'AddressList' },
    ],
  },
  {
    title: 'Payments & Rewards',
    rows: [
      { key: 'credits', label: 'My Credits', Icon: WalletIcon, route: 'MyCredits' },
      { key: 'coins', label: 'My Coins & Rewards', Icon: WalletIcon, route: 'MyCoins' },
    ],
  },
  {
    title: 'My Activity',
    rows: [
      { key: 'bookings', label: 'My Bookings', Icon: BookingIcon, route: 'Bookings' },
      { key: 'orders', label: 'My Orders (Consult / Lab / Pharmacy)', Icon: BookingIcon, route: 'MyOrders' },
    ],
  },
  {
    title: 'Health Services',
    rows: [
      { key: 'doctor', label: 'Consult a Doctor', Icon: DoctorIcon, route: 'DoctorList' },
      { key: 'lab', label: 'Lab Tests', Icon: FlaskIcon, route: 'LabTests' },
      { key: 'pharmacy', label: 'Pharmacy', Icon: PharmacyIcon, route: 'PharmacyHome' },
    ],
  },
  {
    title: 'Health Records',
    rows: [
      { key: 'records', label: 'Medical Records', Icon: FileDocIcon, route: 'MedicalRecords' },
      { key: 'documents', label: 'My Documents', Icon: FileDocIcon, route: 'Documents' },
    ],
  },
  {
    title: 'Safety & Support',
    rows: [
      { key: 'emergency', label: 'Emergency Contacts', Icon: ShieldCheckIcon, route: 'EmergencyContacts' },
      { key: 'notifications', label: 'Notifications', Icon: BookingIcon, route: 'Notifications' },
      { key: 'support', label: 'Help & Support', Icon: HelpIcon, route: 'Support' },
    ],
  },
  {
    title: 'Settings',
    rows: [
      { key: 'settings', label: 'Settings', Icon: SettingsIcon, route: 'Settings' },
    ],
  },
];

const LOGOUT: Row = { key: 'logout', label: 'Logout', Icon: LogoutIcon, route: 'Login', danger: true };

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useProfile();
  const Avatar = svgs.avatar;

  const onRowPress = async (row: Row) => {
    if (row.key === 'logout') {
      await authStore.logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    if (row.route) navigation.navigate(row.route as never);
  };

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topTitle}>Profile</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(24) }}
      >
        {/* Identity */}
        <View style={styles.identity}>
          <View style={[styles.avatar, cardShadow]}>
            {profile.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.avatarImg} />
            ) : (
              <Avatar width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
            )}
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.contact}>{profile.phone}</Text>
          <Text style={styles.contact}>{profile.email}</Text>
        </View>

        {/* Grouped action list */}
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.card, cardShadow]}>
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.key}
                  onPress={() => onRowPress(row)}
                  style={({ pressed }) => [
                    styles.row,
                    i < section.rows.length - 1 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: '#EAF4FB' }]}>
                    <row.Icon size={scale(20)} color={colors.textPrimary} />
                  </View>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <ChevronForwardIcon size={scale(20)} color="#B9C2C9" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout (standalone) */}
        <View style={[styles.card, cardShadow, { marginTop: verticalScale(20) }]}>
          <Pressable
            onPress={() => onRowPress(LOGOUT)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowIcon, { backgroundColor: '#FDECEC' }]}>
              <LogoutIcon size={scale(20)} color={colors.brandRed} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.brandRed }]}>{LOGOUT.label}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const AVATAR = scale(96);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: verticalScale(8),
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semiBold,
    fontSize: scale(18),
    color: colors.textPrimary,
  },
  topSpacer: {
    width: scale(40),
  },

  identity: {
    alignItems: 'center',
    paddingVertical: verticalScale(16),
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  name: {
    ...textStyles.name,
    color: colors.textPrimary,
    marginTop: verticalScale(12),
  },
  contact: {
    fontFamily: fonts.regular,
    fontSize: scale(12),
    color: '#6B7480',
    marginTop: scale(2),
  },

  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8A929B',
    marginHorizontal: spacing.md + spacing.xs,
    marginTop: verticalScale(18),
    marginBottom: verticalScale(6),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6ECF0',
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.textPrimary,
  },
});
