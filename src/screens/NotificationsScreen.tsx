import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { BellIcon, BookingIcon, CheckCircleIcon, ChevronForwardIcon, IconProps, WarningIcon } from '../components/icons';
import { notificationsApi, ServerNotification } from '../api/notifications';
import { socketService } from '../services/socket';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

// Screens a notification is allowed to deep-link to (guards against bad data).
const NAV_TARGETS = new Set(['MyOrders', 'Tracking', 'Bookings', 'Home', 'Notifications', 'MyCredits', 'Membership']);

interface Notif {
  id: string;
  title: string;
  body: string;
  time: string;
  Icon: React.FC<IconProps>;
  tint: string;
  iconColor: string;
  unread: boolean;
  target?: string;
  params?: Record<string, any>;
}

const timeAgo = (iso?: string): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/** Map a server notification's type to an icon + tint, and its deep-link target. */
const present = (n: ServerNotification): Notif => {
  const t = (n.type || '').toUpperCase();
  let Icon: React.FC<IconProps> = BellIcon;
  let tint = '#EAF1FE';
  let iconColor: string = colors.directionsBlue;
  if (t === 'PAYMENT' || t === 'REWARD') {
    Icon = CheckCircleIcon;
    tint = '#E6F4E6';
    iconColor = '#2E9B2E';
  } else if (t === 'BOOKING') {
    Icon = BookingIcon;
    tint = '#EAF1FE';
    iconColor = colors.directionsBlue;
  } else if (t === 'SOS' || t === 'SYSTEM') {
    Icon = WarningIcon;
    tint = '#FCE9E9';
    iconColor = colors.brandRedDark;
  }
  const target = (n.data?.screen || n.data?.route) as string | undefined;
  return {
    id: n._id,
    title: n.title,
    body: n.body,
    time: timeAgo(n.createdAt),
    Icon,
    tint,
    iconColor,
    unread: !n.isRead,
    target: target && NAV_TARGETS.has(target) ? target : undefined,
    params: n.data,
  };
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    notificationsApi
      .list()
      .then((res) => {
        if (!active) return;
        setItems(res.notifications.map(present));
        if (res.unreadCount > 0) notificationsApi.markAllRead().catch(() => undefined);
      })
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));

    void socketService.connect();
    const off = socketService.on('notification:new', (n: ServerNotification) => {
      if (!active || !n?._id) return;
      setItems((prev) => (prev.some((p) => p.id === n._id) ? prev : [present(n), ...prev]));
      notificationsApi.markRead(n._id).catch(() => undefined);
    });

    return () => {
      active = false;
      off();
    };
  }, []);

  const onPress = (n: Notif) => {
    // Mark read locally + open the related screen.
    setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, unread: false } : p)));
    if (n.target) (navigation.navigate as any)(n.target, n.params);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <BellIcon size={scale(34)} color={colors.inkMuted} />
          </View>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySub}>Updates about your bookings, orders and appointments show up here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(24) }]}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => onPress(n)}
              style={({ pressed }) => [
                styles.card,
                cardShadow,
                n.unread && styles.cardUnread,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: n.tint }]}>
                <n.Icon size={scale(20)} color={n.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, n.unread && styles.titleUnread]} numberOfLines={1}>{n.title}</Text>
                  {n.unread && <View style={styles.dot} />}
                </View>
                <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
              {!!n.target && <ChevronForwardIcon size={scale(16)} color="#C2C8CF" />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: '#EEF1F5',
    alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(16),
  },
  emptyText: { fontFamily: fonts.semiBold, fontSize: scale(16), color: colors.textBlack },
  emptySub: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted, textAlign: 'center', marginTop: verticalScale(6) },
  list: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8), gap: verticalScale(10) },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: scale(12),
    backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14),
  },
  cardUnread: { backgroundColor: '#F5F9FF', borderLeftWidth: scale(3), borderLeftColor: colors.directionsBlue },
  pressed: { opacity: 0.7 },
  icon: { width: scale(42), height: scale(42), borderRadius: scale(21), alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  titleUnread: { fontFamily: fonts.bold },
  dot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: colors.directionsBlue },
  body: { fontFamily: fonts.regular, fontSize: scale(12.5), color: colors.inkMuted, marginTop: verticalScale(3), lineHeight: scale(17) },
  time: { fontFamily: fonts.regular, fontSize: scale(11), color: '#A6ADB4', marginTop: verticalScale(6) },
});
