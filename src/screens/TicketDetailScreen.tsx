import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { supportApi } from '../api/misc';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TicketDetail'>;
type Rt = RouteProp<RootStackParamList, 'TicketDetail'>;

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export const TicketDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const [ticket, setTicket] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    supportApi
      .ticket(params.id)
      .then((d: any) => {
        setTicket(d?.ticket || null);
        setMessages(d?.messages || []);
      })
      .catch(() => setTicket(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  React.useEffect(() => load(), [load]);

  const closed = ['RESOLVED', 'CLOSED'].includes(String(ticket?.status || '').toUpperCase());

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await supportApi.addMessage(params.id, text.trim());
      setText('');
      load();
    } catch (e: any) {
      Alert.alert('Could not send', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    Alert.alert('Close ticket?', 'Mark this ticket as resolved?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            await supportApi.closeTicket(params.id);
            load();
          } catch {
            Alert.alert('Could not close', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Ticket" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.directionsBlue} style={{ marginTop: verticalScale(40) }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={ticket?.subject || 'Ticket'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.thread, { paddingBottom: verticalScale(16) }]}>
        {!!ticket && (
          <View style={styles.metaBar}>
            <Text style={styles.metaText}>
              {ticket.ticketNumber ? `#${ticket.ticketNumber} · ` : ''}{ticket.category} · {String(ticket.status || '').replace(/_/g, ' ')}
            </Text>
          </View>
        )}
        {messages.map((m, i) => {
          const mine = (m.senderType || m.sender) !== 'admin' && (m.senderType || m.sender) !== 'support';
          return (
            <View key={m._id || i} style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.themWrap]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.them]}>
                <Text style={[styles.bubbleText, mine && { color: colors.textWhite }]}>{m.message || m.content}</Text>
              </View>
              <Text style={styles.time}>{fmt(m.createdAt)}</Text>
            </View>
          );
        })}
        {messages.length === 0 && <Text style={styles.empty}>No replies yet. Our team will respond soon.</Text>}
      </ScrollView>

      {closed ? (
        <View style={[styles.closedBar, { paddingBottom: insets.bottom + verticalScale(10) }]}>
          <Text style={styles.closedText}>This ticket is closed.</Text>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: insets.bottom + verticalScale(8) }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Type a reply…" placeholderTextColor={colors.placeholder} style={styles.composerInput} multiline />
          <Pressable onPress={send} disabled={busy || !text.trim()} style={[styles.sendBtn, (busy || !text.trim()) && styles.disabled]}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
          <Pressable onPress={close} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  thread: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(8), gap: verticalScale(4) },
  metaBar: { alignSelf: 'center', backgroundColor: '#EEF1F5', borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: verticalScale(5), marginBottom: verticalScale(10) },
  metaText: { fontFamily: fonts.medium, fontSize: scale(11.5), color: colors.inkMuted, textTransform: 'capitalize' },
  empty: { textAlign: 'center', marginTop: verticalScale(30), fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted },
  bubbleWrap: { maxWidth: '82%', marginVertical: verticalScale(5) },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  themWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: scale(14), paddingHorizontal: scale(14), paddingVertical: verticalScale(10) },
  mine: { backgroundColor: colors.directionsBlue, borderBottomRightRadius: scale(4) },
  them: { backgroundColor: colors.surface, borderBottomLeftRadius: scale(4), ...{} },
  bubbleText: { fontFamily: fonts.regular, fontSize: scale(13.5), color: colors.textBlack, lineHeight: scale(19) },
  time: { fontFamily: fonts.regular, fontSize: scale(10), color: '#A6ADB4', marginTop: verticalScale(3) },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: scale(8), paddingHorizontal: spacing.lg, paddingTop: verticalScale(8), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E2E2', backgroundColor: colors.surface },
  composerInput: { flex: 1, maxHeight: verticalScale(100), minHeight: verticalScale(42), borderRadius: scale(20), borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: scale(14), paddingVertical: verticalScale(9), fontFamily: fonts.regular, fontSize: scale(14), color: colors.textBlack },
  sendBtn: { paddingHorizontal: scale(16), height: verticalScale(42), borderRadius: scale(21), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  sendText: { fontFamily: fonts.bold, fontSize: scale(13), color: colors.textWhite },
  closeBtn: { paddingHorizontal: scale(12), height: verticalScale(42), alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.brandRedDark },
  closedBar: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E2E2' },
  closedText: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(13), color: colors.inkMuted },
});
