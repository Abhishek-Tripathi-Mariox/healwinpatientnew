import React from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircleIcon, WarningIcon } from '../components/icons';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

/**
 * Drop-in replacement for React Native's `Alert.alert` with the app's own
 * design (rounded card, tinted icon badge, pop-in animation, pill buttons)
 * instead of the plain OS dialog. Same call signature, so call sites just
 * swap the import:
 *   Alert.alert(title, message, buttons, options) → AppAlert.alert(...)
 * Render <AlertHost /> once near the app root (see App.tsx).
 */

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}
interface AppAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}
interface QueuedAlert {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: AppAlertOptions;
}

let queue: QueuedAlert[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => queue[0] ?? null;

const alert = (
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
) => {
  const normalized = buttons && buttons.length ? buttons : [{ text: 'OK', style: 'default' as const }];
  queue = [...queue, { id: nextId++, title, message, buttons: normalized, options }];
  emit();
};

const dismissCurrent = () => {
  queue = queue.slice(1);
  emit();
};

export const AppAlert = { alert };

// Titles/messages that read as an error/warning get the red tone automatically
// (matches this codebase's existing copy: "Could not…", "…failed", etc.) so
// call sites don't need to pass an extra "tone" param through the drop-in API.
const WARN_HINT = /error|fail|could not|invalid|denied|not available|not found|wrong|incorrect|expired/i;

/** Pop-in + fade — the card scales up from 90% with a light spring "settle"
 * instead of a flat fade, and the backdrop fades in underneath it. */
const usePopIn = (key: number) => {
  const scaleV = React.useRef(new Animated.Value(0.9)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    scaleV.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scaleV, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 9 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { scaleV, opacity };
};

export const AlertHost: React.FC = () => {
  const current = React.useSyncExternalStore(subscribe, getSnapshot);
  const { scaleV, opacity } = usePopIn(current?.id ?? 0);
  if (!current) return null;

  const tone: 'warn' | 'ok' =
    current.buttons.some((b) => b.style === 'destructive') ||
    WARN_HINT.test(current.title) ||
    (current.message ? WARN_HINT.test(current.message) : false)
      ? 'warn'
      : 'ok';
  const tintColor = tone === 'warn' ? colors.brandRedDark : colors.payGreen;

  const press = (b: AppAlertButton) => {
    dismissCurrent();
    b.onPress?.();
  };

  const close = () => {
    if (current.options?.cancelable === false) return;
    dismissCurrent();
    current.options?.onDismiss?.();
  };

  const stacked = current.buttons.length >= 3;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Animated.View style={{ opacity, transform: [{ scale: scaleV }], width: '100%', alignItems: 'center' }}>
          <Pressable style={[styles.card, cardShadow]} onPress={() => undefined}>
            <View style={[styles.iconWrap, { backgroundColor: `${tintColor}1F` }]}>
              {tone === 'warn' ? (
                <WarningIcon size={scale(38)} color={tintColor} />
              ) : (
                <CheckCircleIcon size={scale(42)} color={tintColor} />
              )}
            </View>
            <Text style={styles.title}>{current.title}</Text>
            {!!current.message && <Text style={styles.message}>{current.message}</Text>}
            <View style={[styles.btnRow, stacked && styles.btnCol]}>
              {current.buttons.map((b, i) => (
                <Pressable
                  key={`${b.text}-${i}`}
                  style={({ pressed }) => [
                    styles.btn,
                    b.style === 'cancel'
                      ? styles.btnCancel
                      : b.style === 'destructive'
                        ? styles.btnDestructive
                        : [styles.btnDefault, { backgroundColor: tintColor }],
                    stacked ? styles.btnFull : styles.btnFlex,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => press(b)}
                >
                  <Text style={[styles.btnText, b.style === 'cancel' ? styles.btnTextCancel : styles.btnTextSolid]}>
                    {b.text || 'OK'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,20,24,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  card: { width: '100%', maxWidth: scale(340), backgroundColor: colors.surface, borderRadius: scale(26), paddingHorizontal: scale(24), paddingTop: scale(28), paddingBottom: scale(22), alignItems: 'center' },
  iconWrap: {
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  title: { fontFamily: fonts.bold, fontSize: scale(19), color: colors.textBlack, textAlign: 'center' },
  message: { fontFamily: fonts.regular, fontSize: scale(13.5), color: colors.inkMuted, textAlign: 'center', lineHeight: scale(20), marginTop: verticalScale(9) },
  btnRow: { flexDirection: 'row', gap: scale(10), width: '100%', marginTop: verticalScale(24) },
  btnCol: { flexDirection: 'column' },
  btn: { height: verticalScale(50), borderRadius: scale(25), alignItems: 'center', justifyContent: 'center' },
  btnFlex: { flex: 1 },
  btnFull: { width: '100%' },
  btnCancel: { borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: 'transparent' },
  btnDefault: {},
  btnDestructive: { backgroundColor: colors.brandRedDark },
  btnText: { fontFamily: fonts.bold, fontSize: scale(14.5) },
  btnTextCancel: { color: colors.inkMuted, fontFamily: fonts.semiBold },
  btnTextSolid: { color: colors.textWhite },
  pressed: { opacity: 0.85 },
});
