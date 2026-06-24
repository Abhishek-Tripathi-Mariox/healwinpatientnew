import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AmbulanceTypeCard, BackButton } from '../components';
import { ambulanceApi, AmbulanceType } from '../api/ambulance';
import { artFor, FALLBACK_DESCRIPTION } from '../utils/ambulanceArt';
import { colors, fonts, scale, spacing, verticalScale } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AmbulanceTypes'>;

export const AmbulanceTypesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [types, setTypes] = React.useState<AmbulanceType[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Single source of truth: the admin-managed ambulance types (Types & Pricing).
  React.useEffect(() => {
    let alive = true;
    ambulanceApi
      .types()
      .then((list) => alive && setTypes(list))
      .catch(() => alive && setTypes([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + verticalScale(44), paddingBottom: insets.bottom + verticalScale(24) },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.brandRedDark} style={{ marginTop: verticalScale(60) }} />
        ) : types.length === 0 ? (
          <Text style={styles.empty}>No ambulance types available right now.</Text>
        ) : (
          types.map((item, i) => {
            const art = artFor(item.name);
            return (
              <AmbulanceTypeCard
                key={item._id || item.code}
                title={item.name}
                description={item.description || FALLBACK_DESCRIPTION}
                Background={art.Background}
                Vehicle={art.Vehicle}
                imageSide={i % 2 === 0 ? 'left' : 'right'}
                titleSize={item.name.length > 18 ? scale(16) : undefined}
                onPress={() => navigation.navigate('NearbyAmbulances')}
              />
            );
          })
        )}
      </ScrollView>

      {/* Back button floats over the top-left */}
      <View style={[styles.backWrap, { top: insets.top + verticalScale(8) }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  content: {
    paddingTop: verticalScale(8),
  },
  backWrap: {
    position: 'absolute',
    left: spacing.lg,
  },
  empty: {
    textAlign: 'center',
    marginTop: verticalScale(60),
    fontFamily: fonts.medium,
    fontSize: scale(13),
    color: colors.inkMuted,
  },
});
