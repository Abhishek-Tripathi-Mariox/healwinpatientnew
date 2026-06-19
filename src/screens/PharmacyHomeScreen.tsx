import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components';
import { MinusIcon, PharmacyIcon, PlusIcon, SearchIcon } from '../components/icons';
import { cartStore, Product, useCart } from '../state/cartStore';
import { pharmacyApi } from '../api/catalog';
import { colors, fonts, radius, scale, spacing, verticalScale } from '../theme';
import { cardShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

const mapProduct = (p: any): Product => ({
  id: p._id || p.id,
  name: p.name || '',
  price: p.price ?? 0,
  mrp: p.mrp,
  inStock: p.stock != null ? p.stock > 0 : p.inStock !== false,
});

type Nav = NativeStackNavigationProp<RootStackParamList, 'PharmacyHome'>;

export const PharmacyHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const items = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  // Products come entirely from the backend pharmacy catalog.
  useEffect(() => {
    pharmacyApi
      .products()
      .then((list) => setProducts(list.map(mapProduct).filter((p) => p.id)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const qty = (id: string) => items.find((i) => i.product.id === id)?.quantity ?? 0;
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Pharmacy"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={() => navigation.navigate('PharmacyCart')} hitSlop={8} style={styles.cartBtn}>
            <PharmacyIcon size={scale(22)} />
            {count > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{count}</Text>
              </View>
            )}
          </Pressable>
        }
      />

      <View style={styles.searchWrap}>
        <View style={[styles.search, cardShadow]}>
          <SearchIcon size={scale(20)} color="#979797" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search medicines, health products" placeholderTextColor="#979797" style={styles.searchInput} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (count > 0 ? verticalScale(90) : verticalScale(24)) }]}>
        {loading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No products available</Text>
        ) : (
          filtered.map((p) => {
            const q = qty(p.id);
            return (
              <View key={p.id} style={[styles.card, cardShadow]}>
                <View style={styles.thumb}>
                  <PharmacyIcon size={scale(28)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  {p.inStock ? (
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>₹{p.price}</Text>
                      {p.mrp && <Text style={styles.mrp}>₹{p.mrp}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.oos}>OUT OF STOCK</Text>
                  )}
                </View>
                {p.inStock &&
                  (q === 0 ? (
                    <Pressable onPress={() => cartStore.add(p)} style={styles.add}>
                      <Text style={styles.addText}>Add</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.stepper}>
                      <Pressable onPress={() => cartStore.remove(p.id)} hitSlop={6} style={styles.step}><MinusIcon size={scale(16)} color={colors.textWhite} /></Pressable>
                      <Text style={styles.qty}>{q}</Text>
                      <Pressable onPress={() => cartStore.add(p)} hitSlop={6} style={styles.step}><PlusIcon size={scale(16)} color={colors.textWhite} /></Pressable>
                    </View>
                  ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {count > 0 && (
        <View style={[styles.bar, { paddingBottom: insets.bottom + verticalScale(10) }]}>
          <Text style={styles.barTotal}>₹{cartStore.total()}  ·  {count} item(s)</Text>
          <Pressable style={({ pressed }) => [styles.view, pressed && styles.pressed]} onPress={() => navigation.navigate('PharmacyCart')}>
            <Text style={styles.viewText}>View Cart</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  cartBtn: { width: scale(40), height: scale(40), alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: scale(2), right: scale(2), minWidth: scale(16), height: scale(16), borderRadius: scale(8), backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(3) },
  cartBadgeText: { fontFamily: fonts.bold, fontSize: scale(9), color: colors.textWhite },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: verticalScale(10) },
  search: { flexDirection: 'row', alignItems: 'center', gap: scale(10), height: verticalScale(46), backgroundColor: colors.surface, borderRadius: scale(14), paddingHorizontal: scale(14) },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: scale(14), color: colors.textBlack, padding: 0 },
  list: { paddingHorizontal: spacing.lg, gap: verticalScale(12) },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: scale(14), color: colors.inkMuted, marginTop: verticalScale(40) },
  card: { flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: colors.surface, borderRadius: radius.card, padding: scale(14) },
  thumb: { width: scale(46), height: scale(46), borderRadius: scale(12), backgroundColor: '#EAF7F1', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.semiBold, fontSize: scale(13), color: colors.textBlack },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: verticalScale(5) },
  price: { fontFamily: fonts.bold, fontSize: scale(14), color: colors.textBlack },
  mrp: { fontFamily: fonts.regular, fontSize: scale(12), color: '#A6ADB4', textDecorationLine: 'line-through' },
  oos: { fontFamily: fonts.semiBold, fontSize: scale(11), color: colors.brandRedDark, marginTop: verticalScale(5) },
  add: { paddingHorizontal: scale(16), height: verticalScale(32), borderRadius: scale(8), borderWidth: 1, borderColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.semiBold, fontSize: scale(12), color: colors.directionsBlue },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: scale(10), backgroundColor: colors.directionsBlue, borderRadius: scale(8), paddingHorizontal: scale(8), height: verticalScale(32) },
  step: { width: scale(20), alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.bold, fontSize: scale(13), color: colors.textWhite, minWidth: scale(14), textAlign: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingHorizontal: spacing.lg, paddingTop: verticalScale(12) },
  barTotal: { fontFamily: fonts.bold, fontSize: scale(16), color: colors.textBlack },
  view: { paddingHorizontal: scale(28), height: verticalScale(48), borderRadius: scale(12), backgroundColor: colors.directionsBlue, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  viewText: { fontFamily: fonts.bold, fontSize: scale(15), color: colors.textWhite },
});
