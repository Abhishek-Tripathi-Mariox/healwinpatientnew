import { useSyncExternalStore } from 'react';
import { addressApi } from '../api/users';

export interface Address {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  // Contact + type fields the backend requires on a saved address. Name and
  // mobile default from the logged-in profile; addressType is chosen in the form.
  fullName?: string;
  mobileNumber?: string;
  addressType?: 'Home' | 'Work' | 'Other';
  isDefault?: boolean;
}

let addresses: Address[] = [];
let loaded = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const addressStore = {
  getAll: () => addresses,
  isLoaded: () => loaded,

  /** Fetch from backend (call on screen mount). */
  async load() {
    addresses = await addressApi.list();
    loaded = true;
    emit();
  },

  async add(a: Omit<Address, 'id'>) {
    const created = await addressApi.create(a);
    if (created.isDefault) addresses = addresses.map((x) => ({ ...x, isDefault: false }));
    addresses = [...addresses, created];
    emit();
    return created;
  },

  async update(id: string, a: Partial<Address>) {
    const updated = await addressApi.update(id, a);
    addresses = addresses.map((x) => (x.id === id ? updated : x));
    emit();
    return updated;
  },

  async remove(id: string) {
    await addressApi.remove(id);
    addresses = addresses.filter((x) => x.id !== id);
    emit();
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useAddresses = (): Address[] =>
  useSyncExternalStore(addressStore.subscribe, addressStore.getAll);
