import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import {
  BellIcon, ChevronForwardIcon, EditIcon, FileDocIcon, HelpIcon, IconProps,
  LogoutIcon, ShieldCheckIcon, WarningIcon,
} from '../components/icons';
import { authStore } from '../state/authStore';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://healwin.in/privacy-policy';
const TERMS_URL = 'https://healwin.in/terms';
const SUPPORT_EMAIL = 'hr@healwin.in';
const APP_VERSION = '0.0.1';

interface Row {
  key: string;
  label: string;
  Icon: React.FC<IconProps>;
  onPress: () => void;
  danger?: boolean;
}

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const open = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert('Could not open', 'Please try again later.'));

  const deleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will request permanent deletion of your account and data. Our team will process it within 7 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: () =>
            open(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my account')}&body=${encodeURIComponent('Please delete my HealWin account and associated data.')}`,
            ),
        },
      ],
    );
  };

  const logout = async () => {
    await authStore.logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Account',
      rows: [
        { key: 'edit', label: 'Edit Profile', Icon: EditIcon, onPress: () => navigation.navigate('EditProfile') },
        { key: 'notifications', label: 'Notifications', Icon: BellIcon, onPress: () => navigation.navigate('Notifications') },
        { key: 'notif-prefs', label: 'Notification preferences', Icon: BellIcon, onPress: () => navigation.navigate('NotificationSettings') },
      ],
    },
    {
      title: 'Support & Legal',
      rows: [
        { key: 'support', label: 'Help & Support', Icon: HelpIcon, onPress: () => navigation.navigate('Support') },
        { key: 'privacy', label: 'Privacy Policy', Icon: ShieldCheckIcon, onPress: () => open(PRIVACY_URL) },
        { key: 'terms', label: 'Terms of Service', Icon: FileDocIcon, onPress: () => open(TERMS_URL) },
      ],
    },
    {
      title: 'Account actions',
      rows: [
        { key: 'delete', label: 'Delete Account', Icon: WarningIcon, onPress: deleteAccount, danger: true },
        { key: 'logout', label: 'Logout', Icon: LogoutIcon, onPress: logout, danger: true },
      ],
    },
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(30) }]}>
        {sections.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={[styles.card, cardShadow]}>
              {sec.rows.map((row, i) => (
                <Pressable
                  key={row.key}
                  onPress={row.onPress}
                  style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && styles.pressed]}
                >
                  <row.Icon size={scale(20)} color={row.danger ? colors.brandRed : colors.textPrimary} />
                  <Text style={[styles.rowLabel, row.danger && { color: colors.brandRed }]}>{row.label}</Text>
                  {!row.danger && <ChevronForwardIcon size={scale(16)} color="#9AA0A6" />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>HealWin · v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8) },
  section: { marginBottom: verticalScale(18) },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingHorizontal: scale(16), height: verticalScale(54) },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6E6E6' },
  rowLabel: { flex: 1, fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack },
  pressed: { opacity: 0.6 },
  version: { textAlign: 'center', fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(6) },
});
