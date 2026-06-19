import { useSyncExternalStore } from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

let items: CartItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const cartStore = {
  getItems: () => items,
  add(p: Product) {
    const existing = items.find((i) => i.product.id === p.id);
    items = existing
      ? items.map((i) => (i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
      : [...items, { product: p, quantity: 1 }];
    emit();
  },
  remove(id: string) {
    items = items
      .map((i) => (i.product.id === id ? { ...i, quantity: i.quantity - 1 } : i))
      .filter((i) => i.quantity > 0);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
  count: () => items.reduce((n, i) => n + i.quantity, 0),
  total: () => items.reduce((n, i) => n + i.quantity * i.product.price, 0),
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useCart = (): CartItem[] => useSyncExternalStore(cartStore.subscribe, cartStore.getItems);
