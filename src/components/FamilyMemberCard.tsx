import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import { EditIcon } from './icons';

export interface FamilyMemberCardProps {
  /** Fallback photo as an SVG component (when there's no uploaded photo). */
  Photo: React.FC<SvgProps>;
  /** The member's real uploaded photo URL — takes precedence over Photo. */
  photoUri?: string;
  name: string;
  age: string;
  relation: string;
  style?: StyleProp<ViewStyle>;
  /** Tap the card (or its edit icon) to edit this member. */
  onPress?: () => void;
}

/** A family-member card (photo + name + age + relation). Figma 5:1616. */
export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({
  Photo,
  photoUri,
  name,
  age,
  relation,
  style,
  onPress,
}) => (
  <Pressable
    disabled={!onPress}
    onPress={onPress}
    style={({ pressed }) => [styles.card, cardShadow, pressed && onPress && styles.pressed, style]}
  >
    <View style={styles.photo}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photoImg} />
      ) : (
        <Photo width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      )}
    </View>
    <View style={styles.body}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.meta}>Age  : {age}</Text>
      <Text style={styles.meta}>Relation  : {relation}</Text>
    </View>
    {onPress ? (
      <View style={styles.editBadge}>
        <EditIcon size={scale(15)} color={colors.directionsBlue} />
      </View>
    ) : null}
  </Pressable>
);

const PHOTO = scale(82);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(117),
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: scale(8),
    paddingHorizontal: scale(13),
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: scale(15),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.avatarBorder,
  },
  photoImg: { width: '100%', height: '100%' },
  pressed: { opacity: 0.9 },
  editBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: scale(16),
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: scale(18),
    letterSpacing: -0.3,
    color: colors.textBlack,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: scale(10),
    color: colors.textBlack,
    marginTop: verticalScale(6),
  },
});
