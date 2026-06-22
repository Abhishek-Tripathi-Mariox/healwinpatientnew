import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { ChevronDownIcon, MailIcon, PhoneIcon } from '../components/icons';
import { supportApi } from '../api/misc';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

interface Faq { q: string; a: string }

type Nav = NativeStackNavigationProp<RootStackParamList, 'Support'>;

export const SupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState<number | null>(0);
  // FAQs come only from the backend (admin-managed) — no hardcoded fallback.
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [contact, setContact] = useState<{ helplineNumber: string; email: string }>({ helplineNumber: '', email: '' });

  React.useEffect(() => {
    supportApi
      .faqs()
      .then((list) => {
        const mapped = (list || [])
          .map((f: any) => ({ q: f.question || f.q, a: f.answer || f.a }))
          .filter((f: Faq) => f.q && f.a);
        setFaqs(mapped);
      })
      .catch(() => setFaqs([]));
    supportApi.contactInfo().then((c) => c && setContact(c)).catch(() => undefined);
  }, []);

  const callHelpline = () => {
    if (!contact.helplineNumber) {
      Alert.alert('Helpline unavailable', 'Please try again later.');
      return;
    }
    Linking.openURL(`tel:${contact.helplineNumber}`).catch(() => undefined);
  };
  const emailUs = () => {
    if (!contact.email) {
      Alert.alert('Email unavailable', 'Please try again later.');
      return;
    }
    Linking.openURL(`mailto:${contact.email}`).catch(() => undefined);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Help & Support" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + verticalScale(24) }]}>
        <View style={styles.actions}>
          <Pressable style={[styles.action, cardShadow]} onPress={callHelpline}>
            <View style={[styles.actionIcon, { backgroundColor: '#E6F4E6' }]}>
              <PhoneIcon size={scale(20)} color={colors.callGreen} />
            </View>
            <Text style={styles.actionText}>Call Helpline</Text>
            {!!contact.helplineNumber && <Text style={styles.actionSub}>{contact.helplineNumber}</Text>}
          </Pressable>
          <Pressable style={[styles.action, cardShadow]} onPress={emailUs}>
            <View style={[styles.actionIcon, { backgroundColor: '#EAF1FE' }]}>
              <MailIcon size={scale(20)} color={colors.directionsBlue} />
            </View>
            <Text style={styles.actionText}>Email us</Text>
            {!!contact.email && <Text style={styles.actionSub} numberOfLines={1}>{contact.email}</Text>}
          </Pressable>
        </View>

        <Pressable style={[styles.ticketRow, cardShadow]} onPress={() => navigation.navigate('Tickets')}>
          <View style={[styles.actionIcon, { backgroundColor: '#FFF4E5' }]}>
            <MailIcon size={scale(18)} color="#B26A00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ticketTitle}>My Support Tickets</Text>
            <Text style={styles.ticketSub}>Raise an issue or track your tickets</Text>
          </View>
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <ChevronDownIcon size={scale(18)} color={colors.textPrimary} />
          </View>
        </Pressable>

        <Text style={styles.section}>FAQs</Text>
        {faqs.length === 0 && (
          <Text style={styles.a}>No FAQs available right now. Use Call Helpline or Chat above for help.</Text>
        )}
        {faqs.map((f, i) => {
          const expanded = open === i;
          return (
            <Pressable key={i} style={[styles.faq, cardShadow]} onPress={() => setOpen(expanded ? null : i)}>
              <View style={styles.faqHead}>
                <Text style={styles.q}>{f.q}</Text>
                <ChevronDownIcon size={scale(18)} color={colors.textPrimary} />
              </View>
              {expanded && <Text style={styles.a}>{f.a}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: verticalScale(4) },
  actions: { flexDirection: 'row', gap: scale(14) },
  action: { flex: 1, alignItems: 'center', gap: scale(10), backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: verticalScale(18) },
  actionIcon: { width: scale(44), height: scale(44), borderRadius: scale(22), alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  actionSub: { fontFamily: fonts.regular, fontSize: scale(11), color: colors.inkMuted, marginTop: verticalScale(2), paddingHorizontal: scale(6) },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14), marginTop: verticalScale(14) },
  ticketTitle: { fontFamily: fonts.semiBold, fontSize: scale(14), color: colors.textBlack },
  ticketSub: { fontFamily: fonts.regular, fontSize: scale(12), color: colors.inkMuted, marginTop: verticalScale(2) },
  section: { fontFamily: fonts.semiBold, fontSize: scale(15), color: colors.textBlack, marginTop: verticalScale(24), marginBottom: verticalScale(12) },
  faq: { backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(16), marginBottom: verticalScale(12) },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(10) },
  q: { flex: 1, fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack },
  a: { fontFamily: fonts.regular, fontSize: scale(13), color: colors.inkMuted, marginTop: verticalScale(10), lineHeight: scale(19) },
});
