import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import Voice from '@react-native-voice/voice';
import { colors, scale } from '../theme';

/**
 * A multiline TextInput with an inline dictation button — tap the mic, speak,
 * the transcript replaces the field's value. Uses @react-native-voice/voice
 * (on-device speech recognition via the OS, same "free, no API key" approach
 * as the admin panel's browser-based mic button on prescriptions). Requires
 * RECORD_AUDIO permission (declared in AndroidManifest.xml) and a native
 * rebuild — this is a native module, not pure JS.
 */
interface VoiceTextInputProps extends TextInputProps {
  onTranscript: (text: string) => void;
}

export const VoiceTextInput: React.FC<VoiceTextInputProps> = ({ onTranscript, style, ...props }) => {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0];
      if (text) onTranscript(text);
    };
    Voice.onSpeechError = () => setListening(false);
    Voice.onSpeechEnd = () => setListening(false);
    Voice.isAvailable()
      .then((v) => setAvailable(!!v))
      .catch(() => setAvailable(false));
    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return res === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const toggle = async () => {
    if (listening) {
      await Voice.stop().catch(() => undefined);
      setListening(false);
      return;
    }
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      setListening(true);
      await Voice.start('en-IN');
    } catch {
      setListening(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TextInput {...props} style={[style, available && styles.withMicPadding]} />
      {available && (
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={[styles.mic, listening && styles.micActive]}
          accessibilityLabel={listening ? 'Stop dictation' : 'Dictate'}
        >
          <Text style={[styles.micText, listening && styles.micTextActive]}>
            {listening ? '⏹' : '🎤'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  withMicPadding: { paddingRight: scale(40) },
  mic: {
    position: 'absolute',
    right: scale(8),
    top: scale(8),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: '#FDECEC' },
  micText: { fontSize: scale(15) },
  micTextActive: { color: colors.brandRedDark },
});
