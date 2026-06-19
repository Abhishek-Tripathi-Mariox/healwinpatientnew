import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FamilyCareIcon, HomeIcon, IconProps, PhoneIcon } from './icons';
import { colors, radius, scale, spacing, textStyles, verticalScale } from '../theme';
import { cardShadow, floatingShadow } from '../theme/shadows';

export type TabKey = 'home' | 'family';

export interface BottomNavProps {
  active?: TabKey;
  onTabPress?: (tab: TabKey) => void;
  onSosPress?: () => void;
}

/**
 * Bottom navigation bar with a centered, elevated red "SOS" call button.
 * Figma: rounded bar (68px tall) with Home (left) and Family care (right),
 * SOS is a red circle overlapping the top edge.
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  active = 'home',
  onTabPress,
  onSosPress,
}) => {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.bar, cardShadow]}>
        <NavItem
          Icon={HomeIcon}
          label="Home"
          focused={active === 'home'}
          onPress={() => onTabPress?.('home')}
        />
        <View style={styles.centerSpacer} />
        <NavItem
          Icon={FamilyCareIcon}
          label="Family care"
          focused={active === 'family'}
          onPress={() => onTabPress?.('family')}
        />
      </View>

      <Pressable
        onPress={onSosPress}
        accessibilityRole="button"
        accessibilityLabel="SOS emergency call"
        style={({ pressed }) => [styles.sos, floatingShadow, pressed && { opacity: 0.85 }]}
      >
        <PhoneIcon size={scale(24)} color={colors.textWhite} />
        <Text style={styles.sosLabel}>SOS</Text>
      </Pressable>
    </View>
  );
};

interface NavItemProps {
  Icon: React.FC<IconProps>;
  label: string;
  focused?: boolean;
  onPress?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ Icon, label, focused, onPress }) => (
  <Pressable onPress={onPress} style={styles.item} hitSlop={6}>
    <Icon size={scale(24)} color={focused ? colors.brandRed : colors.textPrimary} />
    <Text style={[styles.itemLabel, focused && { color: colors.brandRed }]}>{label}</Text>
  </Pressable>
);

const BAR_HEIGHT = verticalScale(68);
const SOS_SIZE = scale(64);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: BAR_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.lg,
  },
  centerSpacer: {
    width: SOS_SIZE,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    ...textStyles.navLabel,
    color: colors.textPrimary,
    marginTop: scale(4),
  },
  sos: {
    position: 'absolute',
    top: -SOS_SIZE / 2.6,
    alignSelf: 'center',
    width: SOS_SIZE,
    height: SOS_SIZE,
    borderRadius: SOS_SIZE / 2,
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scale(3),
    borderColor: colors.surface,
  },
  sosLabel: {
    color: colors.textWhite,
    fontFamily: textStyles.buttonLabel.fontFamily,
    fontSize: scale(11),
    marginTop: scale(1),
  },
});
