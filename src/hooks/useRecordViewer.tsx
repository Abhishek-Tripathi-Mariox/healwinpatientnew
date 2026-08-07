import React from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { AppAlert } from '../services/appAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';

/** A viewable file (medical record / document). */
export interface ViewableFile {
  name: string;
  url: string;
}

const isImageUrl = (url: string) => /\.(jpe?g|png|webp|gif|heic|bmp)(\?.*)?$/i.test(url);
const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm|3gp)(\?.*)?$/i.test(url);

/**
 * Shared "view an uploaded record" behaviour: images preview full-screen
 * in-app (pinch-to-zoom), videos play full-screen in-app with controls,
 * everything else (PDFs/docs) opens in the device's viewer. Returns an
 * `openRecord` handler and the `viewer` modal element to render once per screen.
 */
export function useRecordViewer() {
  const insets = useSafeAreaInsets();
  const [preview, setPreview] = React.useState<ViewableFile | null>(null);
  const [videoPreview, setVideoPreview] = React.useState<ViewableFile | null>(null);
  const [imgLoading, setImgLoading] = React.useState(false);
  const loadTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // RN's <Image> has no built-in network timeout — a stalled/unreachable URL
  // (blocked cleartext HTTP, unreachable host, dropped connection) can leave
  // it hanging with neither onLoad nor onError ever firing, so the spinner
  // would otherwise spin forever. Force the same give-up behaviour as onError
  // after 15s.
  const giveUp = () => {
    setImgLoading(false);
    setPreview(null);
    AppAlert.alert('Could not load', 'This file could not be opened in the app. Try “Open in browser”.');
  };

  React.useEffect(() => {
    if (!imgLoading) {
      if (loadTimer.current) clearTimeout(loadTimer.current);
      return;
    }
    loadTimer.current = setTimeout(giveUp, 15000);
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoading, preview?.url]);

  const openRecord = (r: ViewableFile) => {
    if (!r.url) {
      AppAlert.alert('No file', 'This record has no file attached.');
      return;
    }
    if (isImageUrl(r.url)) {
      setImgLoading(true);
      setPreview(r);
    } else if (isVideoUrl(r.url)) {
      setVideoPreview(r);
    } else {
      Linking.openURL(r.url).catch(() =>
        AppAlert.alert('Could not open', 'No app available to open this file.'),
      );
    }
  };

  const viewer = (
    <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
      <View style={styles.viewerRoot}>
        <View style={[styles.viewerBar, { paddingTop: insets.top + verticalScale(6) }]}>
          <Text style={styles.viewerTitle} numberOfLines={1}>{preview?.name}</Text>
          <Pressable onPress={() => setPreview(null)} hitSlop={12}>
            <Text style={styles.viewerClose}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.viewerScroll}
          contentContainerStyle={styles.viewerContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
        >
          {!!preview && (
            <Image
              source={{ uri: preview.url }}
              style={styles.viewerImage}
              resizeMode="contain"
              onLoadStart={() => setImgLoading(true)}
              onLoadEnd={() => setImgLoading(false)}
              onError={giveUp}
            />
          )}
        </ScrollView>
        {imgLoading && (
          <ActivityIndicator style={styles.viewerSpinner} color={colors.textWhite} size="large" />
        )}
        <Pressable
          style={[styles.viewerOpen, { bottom: insets.bottom + verticalScale(16) }]}
          onPress={() => preview && Linking.openURL(preview.url).catch(() => undefined)}
        >
          <Text style={styles.viewerOpenText}>Open in browser</Text>
        </Pressable>
      </View>
    </Modal>
  );

  const videoViewer = (
    <Modal visible={!!videoPreview} transparent animationType="fade" onRequestClose={() => setVideoPreview(null)}>
      <View style={styles.viewerRoot}>
        <View style={[styles.viewerBar, { paddingTop: insets.top + verticalScale(6) }]}>
          <Text style={styles.viewerTitle} numberOfLines={1}>{videoPreview?.name}</Text>
          <Pressable onPress={() => setVideoPreview(null)} hitSlop={12}>
            <Text style={styles.viewerClose}>Close</Text>
          </Pressable>
        </View>
        {!!videoPreview?.url && (
          <Video
            source={{ uri: videoPreview.url }}
            style={styles.viewerVideo}
            controls
            resizeMode="contain"
            onError={() => {
              setVideoPreview(null);
              AppAlert.alert('Could not play', 'This video could not be played in the app.');
            }}
          />
        )}
      </View>
    </Modal>
  );

  return { openRecord, viewer: <>{viewer}{videoViewer}</> };
}

const styles = StyleSheet.create({
  viewerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  viewerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: verticalScale(10),
  },
  viewerTitle: { flex: 1, marginRight: scale(12), fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textWhite },
  viewerClose: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textWhite },
  viewerScroll: { flex: 1 },
  viewerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerVideo: { flex: 1 },
  viewerSpinner: { position: 'absolute', top: '50%', left: 0, right: 0 },
  viewerOpen: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: scale(20),
    height: verticalScale(42),
    borderRadius: scale(21),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerOpenText: { fontFamily: fonts.medium, fontSize: scale(13), color: colors.textWhite },
});
