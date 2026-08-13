import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import Tts from 'react-native-tts';
import { colors, fonts, scale, verticalScale } from '../theme';

// react-native-tts's .d.ts declares addEventListener as returning `void`,
// but the JS implementation actually returns NativeEventEmitter's
// EmitterSubscription (it just forwards to `this.addListener`) — cast the
// return value to the real runtime type so we can call `.remove()` on
// unmount. Must still be invoked as `Tts.addEventListener(...)` (method-call
// syntax) — pulling it into a bare function reference first loses the
// internal `this` binding the implementation relies on.

/**
 * Reads `text` aloud via the device's text-to-speech engine (react-native-tts
 * — free, on-device, no API key, same spirit as the admin panel's browser
 * SpeechSynthesis button). Tap again to stop mid-read. Renders nothing if
 * there's no text.
 */
interface ListenButtonProps {
  text?: string;
}

export const ListenButton: React.FC<ListenButtonProps> = ({ text }) => {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const stop = () => setSpeaking(false);
    // `Tts.removeEventListener` calls the now-removed
    // `NativeEventEmitter.prototype.removeListener` internally and throws on
    // RN 0.65+ ("this.removeListener is not a function") — every unmount
    // (e.g. navigating back from a detail screen) crashed the list. Use the
    // subscription object `addListener`/`addEventListener` returns instead.
    const subs = [
      Tts.addEventListener('tts-finish', stop),
      Tts.addEventListener('tts-cancel', stop),
      Tts.addEventListener('tts-error', stop),
    ] as unknown as EmitterSubscription[];
    return () => {
      subs.forEach((s) => s?.remove?.());
      if (speaking) Tts.stop().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!text?.trim()) return null;

  const toggle = () => {
    if (speaking) {
      Tts.stop().catch(() => undefined);
      setSpeaking(false);
      return;
    }
    try {
      Tts.speak(text);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <Pressable onPress={toggle} hitSlop={6} style={styles.btn}>
      <Text style={styles.text}>{speaking ? '⏹ Stop' : '🔊 Listen'}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: { alignSelf: 'flex-start', marginTop: verticalScale(6) },
  text: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.directionsBlue },
});
