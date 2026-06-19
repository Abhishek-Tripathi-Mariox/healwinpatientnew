import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';

import { BackButton, Fab } from '../components';
import { CloseIcon, FileDocIcon, UploadCloudIcon } from '../components/icons';
import { recordsApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UploadDocument'>;

export const UploadDocumentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const file = asset?.fileName || (asset ? 'Selected file' : null);

  const pickFile = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }).catch(() => null);
    const picked = res?.assets?.[0];
    if (picked?.uri) setAsset(picked);
  };

  const submit = async () => {
    if (saving) return;
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a document title.');
      return;
    }
    if (!asset?.uri) {
      Alert.alert('File required', 'Please select a file to upload.');
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('type', 'document');
      if (desc.trim()) form.append('notes', desc.trim());
      form.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `record_${Date.now()}.jpg`,
      } as any);
      await recordsApi.upload(form);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>My document</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(90) }]}
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter document title"
          placeholderTextColor="rgba(0,0,0,0.45)"
          style={[styles.input, cardShadow]}
        />

        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Description..."
          placeholderTextColor="rgba(0,0,0,0.45)"
          multiline
          textAlignVertical="top"
          style={[styles.textarea, cardShadow]}
        />

        <Pressable
          onPress={pickFile}
          style={({ pressed }) => [styles.selectFile, cardShadow, pressed && styles.pressed]}
        >
          <UploadCloudIcon size={scale(34)} color={colors.textPrimary} />
          <Text style={styles.selectFileText}>Select File</Text>
        </Pressable>

        {file && (
          <View style={[styles.fileRow, cardShadow]}>
            <View style={styles.fileIcon}>
              <FileDocIcon size={scale(26)} />
            </View>
            <Text style={styles.fileName} numberOfLines={1}>
              {file}
            </Text>
            <Pressable onPress={() => setAsset(null)} hitSlop={8} style={styles.fileClose}>
              <CloseIcon size={scale(18)} color={colors.textPrimary} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Fab
        icon="forward"
        onPress={submit}
        accessibilityLabel={saving ? 'Uploading' : 'Upload document'}
        style={[styles.fab, { bottom: insets.bottom + verticalScale(20), opacity: saving ? 0.6 : 1 }]}
      />
    </View>
  );
};

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
    color: '#403F3F',
    marginLeft: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(12),
  },
  input: {
    height: verticalScale(58),
    backgroundColor: colors.surface,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(112,112,112,0.09)',
    paddingHorizontal: scale(20),
    fontFamily: fonts.regular,
    fontSize: scale(18),
    color: 'rgba(0,0,0,0.92)',
  },
  textarea: {
    height: verticalScale(190),
    backgroundColor: colors.surface,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.09)',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    fontFamily: fonts.regular,
    fontSize: scale(18),
    color: 'rgba(0,0,0,0.92)',
    marginTop: verticalScale(20),
  },
  selectFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(14),
    height: verticalScale(55),
    borderRadius: scale(12),
    backgroundColor: '#D9D9D9',
    borderWidth: 1,
    borderColor: '#979494',
    marginTop: verticalScale(22),
  },
  pressed: { opacity: 0.85 },
  selectFileText: {
    fontFamily: fonts.medium,
    fontSize: scale(18),
    color: '#151921',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(55),
    borderRadius: scale(12),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#979494',
    paddingHorizontal: scale(14),
    marginTop: verticalScale(17),
  },
  fileIcon: {
    width: scale(40),
    height: scale(42),
    borderRadius: scale(5),
    backgroundColor: '#F6F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: scale(14),
    color: colors.textBlack,
    marginLeft: scale(14),
  },
  fileClose: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#F6F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
  },
});
