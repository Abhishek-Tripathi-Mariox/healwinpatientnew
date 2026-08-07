import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronForwardIcon,
  HospitalBuildingIcon,
  IconProps,
  ShieldCheckIcon,
  ShieldPlusIcon,
} from './icons';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export type CentreFilter = 'centre' | 'enrolled' | 'other';

interface Option {
  key: CentreFilter;
  label: string;
  Icon: React.FC<IconProps>;
}

const OPTIONS: Option[] = [
  { key: 'centre', label: 'Healwin Centre / Pharmacy', Icon: ShieldPlusIcon },
  { key: 'enrolled', label: 'Healwin enrolled Centres / Pharmacy', Icon: ShieldCheckIcon },
  { key: 'other', label: 'Other Hospital', Icon: HospitalBuildingIcon },
];

export interface FilterSheetProps {
  visible: boolean;
  selected: CentreFilter;
  onSelect: (f: CentreFilter) => void;
  onClose: () => void;
}

/** Bottom-sheet centre-type filter (Figma node 5:914). */
export const FilterSheet: React.FC<FilterSheetProps> = ({ visible, selected, onSelect, onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + verticalScale(10) }]}>
        <View style={styles.handle} />

        <View style={styles.list}>
          {OPTIONS.map((opt, i) => {
            const active = selected === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                style={[
                  styles.row,
                  i === 0 && styles.rowFirst,
                  i === OPTIONS.length - 1 && styles.rowLast,
                  active && styles.rowActive,
                ]}
              >
                <opt.Icon size={scale(28)} />
                <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                  {opt.label}
                </Text>
                <ChevronForwardIcon size={scale(18)} color="#9AA0A6" />
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: scale(26),
    borderTopRightRadius: scale(26),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(12),
    ...cardShadow,
  },
  handle: {
    alignSelf: 'center',
    width: scale(44),
    height: scale(5),
    borderRadius: scale(3),
    backgroundColor: '#D8DBE0',
    marginBottom: verticalScale(18),
  },
  list: {
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    height: verticalScale(56),
    paddingHorizontal: scale(14),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  rowFirst: {},
  rowLast: {
    borderBottomWidth: 0,
  },
  rowActive: {
    backgroundColor: colors.sheetSelected,
  },
  label: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: colors.textBlack,
  },
  labelActive: {
    color: colors.sheetEnrolledText,
  },
  cancel: {
    height: verticalScale(50),
    borderRadius: scale(25),
    backgroundColor: colors.sheetCancel,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(14),
  },
  cancelText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: '#777777',
  },
});
