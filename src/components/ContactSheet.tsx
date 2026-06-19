import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PersonAddIcon, PersonIcon, PhoneIcon } from './icons';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import type { SavedContact } from '../state/contactsStore';
import type { FamilyMember } from '../state/familyStore';

export interface ContactSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The user's saved contacts (from the store). */
  contacts: SavedContact[];
  /** The user's family members — also bookable "for someone else". */
  familyMembers?: FamilyMember[];
  /** Currently selected recipient (for the radio state). */
  selectedId?: string | null;
  /** Called with the chosen saved contact. */
  onSelect?: (contact: SavedContact) => void;
  /** Called with the chosen family member. */
  onSelectFamily?: (member: FamilyMember) => void;
  /** Tapped "Add new contact" — open the add-contact form. */
  onAddNew?: () => void;
}

/** "Choose contact information for booking" bottom sheet (Figma node 5:278). */
export const ContactSheet: React.FC<ContactSheetProps> = ({
  visible,
  onClose,
  contacts,
  familyMembers = [],
  selectedId,
  onSelect,
  onSelectFamily,
  onAddNew,
}) => {
  const insets = useSafeAreaInsets();

  const renderRow = (
    id: string,
    name: string,
    phone: string | undefined,
    onPick: () => void,
  ) => {
    const active = selectedId === id;
    return (
      <Pressable
        key={id}
        style={styles.row}
        onPress={() => {
          onPick();
          onClose();
        }}
      >
        <View style={[styles.radio, active && styles.radioOn]}>
          {active && <View style={styles.radioDot} />}
        </View>
        <View style={styles.avatar}>
          <PersonIcon size={scale(20)} color={colors.textPrimary} />
        </View>
        <Text style={styles.name}>{name}</Text>
        {!!phone && (
          <View style={styles.phoneWrap}>
            <PhoneIcon size={scale(15)} color={colors.textPrimary} />
            <Text style={styles.phone}>{phone}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const nothingSaved = contacts.length === 0 && familyMembers.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + verticalScale(16) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose who this booking is for</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {nothingSaved && (
            <Text style={styles.empty}>
              No saved contacts or family members yet. Add one to book an ambulance for
              someone else.
            </Text>
          )}

          {familyMembers.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Family members</Text>
              {familyMembers.map((m) =>
                renderRow(m.id, m.name, m.phone, () => onSelectFamily?.(m)),
              )}
            </>
          )}

          {contacts.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Saved contacts</Text>
              {contacts.map((c) => renderRow(c.id, c.name, c.phone, () => onSelect?.(c)))}
            </>
          )}
        </ScrollView>

        <Pressable
          style={styles.addRow}
          onPress={() => {
            onClose();
            onAddNew?.();
          }}
        >
          <View style={styles.avatar}>
            <PersonAddIcon size={scale(20)} color={colors.linkBlue} />
          </View>
          <Text style={styles.addText}>Add new contact</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFEFE',
    borderWidth: 1,
    borderColor: '#D5D5D5',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(12),
  },
  handle: {
    alignSelf: 'center',
    width: scale(90),
    height: scale(4),
    borderRadius: scale(3),
    backgroundColor: '#C9CDD2',
    marginBottom: verticalScale(14),
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: scale(16),
    color: colors.textBlack,
    marginBottom: verticalScale(12),
  },
  scroll: { maxHeight: verticalScale(360) },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: scale(12),
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(2),
  },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: scale(13),
    color: colors.inkMuted,
    paddingVertical: verticalScale(18),
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
  },
  radio: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    borderColor: '#3C3C3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.textBlack },
  radioDot: {
    width: scale(11),
    height: scale(11),
    borderRadius: scale(6),
    backgroundColor: colors.textBlack,
  },
  avatar: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: colors.avatarCircle,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(12),
  },
  name: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: scale(15),
    color: colors.textBlack,
    marginLeft: scale(12),
  },
  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  phone: {
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.textBlack,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
  },
  addText: {
    fontFamily: fonts.medium,
    fontSize: scale(18),
    color: colors.textBlack,
    marginLeft: scale(12),
  },
});
