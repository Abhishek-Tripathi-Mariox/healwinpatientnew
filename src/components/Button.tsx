import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, scale, textStyles } from '../theme';
import { cardShadow } from '../theme/shadows';

type ButtonVariant = 'solid' | 'outline' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** override text color */
  textColor?: string;
  /** override background (solid variant) / border (outline variant) */
  color?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/**
 * Reusable pill button.
 * The Figma "Book Now" button is an outline pill with red bold text.
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'outline',
  textColor = colors.brandRed,
  color = colors.brandRed,
  style,
  labelStyle,
  accessibilityLabel,
}) => {
  const variantStyle: ViewStyle =
    variant === 'solid'
      ? { backgroundColor: color }
      : variant === 'outline'
        ? { borderWidth: 1.5, borderColor: color, backgroundColor: 'rgba(0,0,0,0.15)' }
        : { backgroundColor: 'transparent' };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && cardShadow,
        variantStyle,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }, labelStyle]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: scale(28),
    paddingHorizontal: scale(16),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...textStyles.buttonLabel,
    textAlign: 'center',
  },
});
