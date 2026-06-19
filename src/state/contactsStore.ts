import { useSyncExternalStore } from 'react';
import { contactsApi } from '../api/contacts';

/** A reusable "book for someone else" recipient. */
export interface SavedContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  address?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
  // Where this recipient came from — a saved contact (default) or a family
  // member. Drives whether the booking sends contactId or familyMemberId.
  source?: 'contact' | 'family';
}

let contacts: SavedContact[] = [];
let loaded = false;

// The recipient chosen for the CURRENT booking draft (null = book for self).
// Set on the Plan screen, read when the booking is created, then cleared.
let recipient: SavedContact | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const contactsStore = {
  getContacts: () => contacts,
  isLoaded: () => loaded,
  getRecipient: () => recipient,

  async load() {
    contacts = await contactsApi.list();
    loaded = true;
    emit();
  },

  async addContact(c: Omit<SavedContact, 'id'>) {
    const created = await contactsApi.create(c);
    contacts = [created, ...contacts];
    emit();
    return created;
  },

  async updateContact(id: string, patch: Partial<SavedContact>) {
    const updated = await contactsApi.update(id, patch);
    contacts = contacts.map((c) => (c.id === id ? updated : c));
    if (recipient?.id === id) recipient = updated;
    emit();
    return updated;
  },

  async removeContact(id: string) {
    await contactsApi.remove(id);
    contacts = contacts.filter((c) => c.id !== id);
    if (recipient?.id === id) recipient = null;
    emit();
  },

  /** Choose the recipient for the in-progress booking (null = for self). */
  setRecipient(c: SavedContact | null) {
    recipient = c;
    emit();
  },

  clearRecipient() {
    recipient = null;
    emit();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useSavedContacts = (): SavedContact[] =>
  useSyncExternalStore(contactsStore.subscribe, contactsStore.getContacts);

export const useSelectedRecipient = (): SavedContact | null =>
  useSyncExternalStore(contactsStore.subscribe, contactsStore.getRecipient);
