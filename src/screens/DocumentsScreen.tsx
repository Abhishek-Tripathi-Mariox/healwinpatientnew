import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Fab, FileCard, ScreenHeader } from '../components';
import { SearchIcon } from '../components/icons';
import { recordsApi } from '../api/catalog';
import { useRecordViewer } from '../hooks/useRecordViewer';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

interface Doc { id: string; name: string; description: string; url: string }
type Tab = 'all' | 'recent';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Documents'>;

export const DocumentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [files, setFiles] = useState<Doc[]>([]);
  const { openRecord, viewer } = useRecordViewer();

  // Documents = the user's uploaded medical records (backend).
  useFocusEffect(
    React.useCallback(() => {
      recordsApi
        .list()
        .then((list) =>
          setFiles(
            (list || []).map((r: any) => ({
              id: r._id || r.id,
              name: r.title || r.name || 'Document',
              description: [r.type, r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString('en-IN') : '']
                .filter(Boolean)
                .join(' · '),
              url: r.fileUrl || r.url || '',
            })),
          ),
        )
        .catch(() => setFiles([]));
    }, []),
  );

  const shown = files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.root}>
      <ScreenHeader title="My Documents" onBack={() => navigation.goBack()} />
      <View>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.search, cardShadow]}>
            <SearchIcon size={scale(20)} color="#979797" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="#979797"
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['all', 'recent'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, { backgroundColor: tab === t ? colors.tabActive : colors.tabInactive }]}
            >
              <Text style={[styles.tabText, { color: tab === t ? '#262626' : '#5B5B5B' }]}>
                {t === 'all' ? 'All' : 'Recent'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + verticalScale(90) }]}
      >
        {shown.length === 0 ? (
          <Text style={styles.empty}>No documents yet</Text>
        ) : (
          shown.map((f) => (
            <FileCard
              key={f.id}
              name={f.name}
              description={f.description}
              onPress={() => openRecord(f)}
              style={styles.fileCard}
            />
          ))
        )}
      </ScrollView>

      <Fab
        icon="forward"
        onPress={() => navigation.navigate('UploadDocument')}
        style={[styles.fab, { bottom: insets.bottom + verticalScale(20) }]}
      />
      {viewer}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(8),
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    height: verticalScale(48),
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
    paddingHorizontal: scale(16),
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.textBlack,
    padding: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: scale(14),
    paddingHorizontal: spacing.lg,
    marginTop: verticalScale(16),
  },
  tab: {
    width: scale(89),
    height: verticalScale(35),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(16),
    gap: verticalScale(16),
  },
  fileCard: {},
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(40) },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
});
