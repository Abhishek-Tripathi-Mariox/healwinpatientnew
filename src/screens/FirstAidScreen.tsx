import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Video from 'react-native-video';

import { ScreenHeader } from '../components';
import { firstAidApi, type FirstAidGuide } from '../api/misc';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FirstAid'>;

export const FirstAidScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<FirstAidGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [playing, setPlaying] = useState<FirstAidGuide | null>(null);

  useEffect(() => {
    firstAidApi
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.root}>
      <ScreenHeader title="First Aid & Emergency" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        {loading ? (
          <ActivityIndicator color={colors.brandRed} style={{ marginTop: verticalScale(40) }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No guides available right now.</Text>
        ) : (
          items.map((g) => (
            <View key={g._id} style={[styles.card, cardShadow]}>
              <Pressable
                onPress={() => {
                  if (g.type === 'video' && g.videoUrl) setPlaying(g);
                  else setOpen(open === g._id ? null : g._id);
                }}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    {!!g.category && <Text style={styles.cat}>{g.category}</Text>}
                    <Text style={styles.title}>{g.title}</Text>
                  </View>
                  <View style={[styles.badge, g.type === 'video' ? styles.badgeVideo : styles.badgeArticle]}>
                    <Text style={styles.badgeText}>{g.type === 'video' ? `▶ ${g.durationLabel || 'Video'}` : 'Read'}</Text>
                  </View>
                </View>
              </Pressable>
              {g.type === 'article' && open === g._id && !!g.content && (
                <Text style={styles.body}>{g.content}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!playing} transparent animationType="fade" onRequestClose={() => setPlaying(null)}>
        <View style={styles.playerRoot}>
          <View style={styles.playerBar}>
            <Text style={styles.playerTitle} numberOfLines={1}>{playing?.title}</Text>
            <Pressable onPress={() => setPlaying(null)} hitSlop={12}>
              <Text style={styles.playerClose}>Close</Text>
            </Pressable>
          </View>
          {!!playing?.videoUrl && (
            <Video
              source={{ uri: playing.videoUrl }}
              style={styles.player}
              controls
              resizeMode="contain"
              onError={() => setPlaying(null)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8) },
  card: { backgroundColor: colors.surface, borderRadius: scale(14), padding: scale(14), marginBottom: verticalScale(12) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  cat: { fontFamily: fonts.semiBold, fontSize: scale(11), color: colors.brandRed, marginBottom: verticalScale(2) },
  title: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.ink },
  badge: { paddingHorizontal: scale(10), height: verticalScale(26), borderRadius: scale(13), alignItems: 'center', justifyContent: 'center' },
  badgeVideo: { backgroundColor: '#FDECEC' },
  badgeArticle: { backgroundColor: colors.dashBg },
  badgeText: { fontFamily: fonts.semiBold, fontSize: scale(11), color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.textPrimary, marginTop: verticalScale(10), lineHeight: scale(20) },
  empty: { fontFamily: fonts.regular, fontSize: scale(14), color: colors.inkMuted, textAlign: 'center', marginTop: verticalScale(40) },
  playerRoot: { flex: 1, backgroundColor: '#000' },
  playerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: verticalScale(50), paddingBottom: verticalScale(10) },
  playerTitle: { flex: 1, marginRight: scale(12), fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textWhite },
  playerClose: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textWhite },
  player: { flex: 1 },
});
