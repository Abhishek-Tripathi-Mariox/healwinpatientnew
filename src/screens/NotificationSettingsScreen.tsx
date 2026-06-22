import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { notificationsApi } from '../api/notifications';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NotificationSettings'>;

const CATEGORIES: { key: string; label: string; sub: string }[] = [
  { key: 'booking', label: 'Bookings & orders', sub: 'Ambulance, consult, lab and pharmacy updates' },
  { key: 'payment', label: 'Payments', sub: 'Wallet, refunds and charges' },
  { key: 'promo', label: 'Offers & promos', sub: 'Discounts and announcements' },
];

export const NotificationSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [enabled, setEnabled] = React.useState(true);
  const [settings, setSettings] = React.useState<Record<string, boolean>>({ booking: true, payment: true, promo: true });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    notificationsApi
      .settings()
      .then((d) => {
        setEnabled(d?.enabled ?? true);
        setSettings({ booking: true, payment: true, promo: true, ...(d?.settings || {}) });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const toggleMaster = (v: boolean) => {
    setEnabled(v);
    notificationsApi.setSetting(v).catch(() => setEnabled(!v));
  };
  const toggleCat = (key: string, v: boolean) => {
    setSettings((s) => ({ ...s, [key]: v }));
    notificationsApi.setSetting(v, key).catch(() => setSettings((s) => ({ ...s, [key]: !v })));
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Notification Preferences" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
          <View style={[styles.card, cardShadow]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Allow notifications</Text>
                <Text style={styles.sub}>Master switch for all notifications</Text>
              </View>
              <Switch value={enabled} onValueChange={toggleMaster} trackColor={{ true: colors.directionsBlue }} />
            </View>
          </View>

          <Text style={styles.section}>Categories</Text>
          <View style={[styles.card, cardShadow, !enabled && styles.dim]}>
            {CATEGORIES.map((c, i) => (
              <View key={c.key} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{c.label}</Text>
                  <Text style={styles.sub}>{c.sub}</Text>
                </View>
                <Switch
                  value={!!settings[c.key]}
                  disabled={!enabled}
                  onValueChange={(v) => toggleCat(c.key, v)}
                  trackColor={{ true: colors.directionsBlue }}
                />
              </View>
            ))}
          </View>
          {!enabled && <Text style={styles.note}>Turn on the master switch to manage categories.</Text>}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8) },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: scale(16) },
  dim: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingVertical: verticalScale(14) },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6E6E6' },
  label: { fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  sub: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(2) },
  section: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: verticalScale(18), marginBottom: verticalScale(8), marginLeft: scale(4) },
  note: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(10), textAlign: 'center' },
});
