import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FolderTileIcon } from './icons';
import { colors, fonts, radius, scale, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';

export interface FileCardProps {
  name: string;
  description: string;
  onPress?: () => void;
  /** Tile size for the folder icon. */
  tile?: number;
  style?: StyleProp<ViewStyle>;
}

/** A document/file card (folder tile + name + description). */
export const FileCard: React.FC<FileCardProps> = ({
  name,
  description,
  onPress,
  tile = scale(73),
  style,
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [styles.card, cardShadow, pressed && onPress ? styles.pressed : null, style]}
  >
    <FolderTileIcon size={tile} />
    <View style={styles.body}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {description}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: scale(9),
    padding: scale(16),
  },
  pressed: { opacity: 0.85 },
  body: {
    flex: 1,
    marginLeft: scale(16),
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: scale(15),
    color: colors.textBlack,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: scale(12),
    color: colors.textBlack,
    marginTop: verticalScale(6),
  },
});
