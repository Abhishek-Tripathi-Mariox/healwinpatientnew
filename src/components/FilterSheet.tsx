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
    borderWidth: 1,
    borderColor: '#A2A2A2',
    borderTopLeftRadius: scale(15),
    borderTopRightRadius: scale(15),
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(10),
  },
  handle: {
    alignSelf: 'center',
    width: scale(120),
    height: scale(5),
    borderRadius: scale(3),
    backgroundColor: '#C9CDD2',
    marginBottom: verticalScale(16),
  },
  list: {
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    height: verticalScale(51),
    paddingHorizontal: scale(10),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  rowFirst: {
    borderTopLeftRadius: scale(8),
    borderTopRightRadius: scale(8),
  },
  rowLast: {
    borderBottomLeftRadius: scale(8),
    borderBottomRightRadius: scale(8),
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
    height: verticalScale(48),
    borderRadius: scale(8),
    backgroundColor: colors.sheetCancel,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(10),
  },
  cancelText: {
    fontFamily: fonts.semiBold,
    fontSize: scale(14),
    color: '#777777',
  },
});
