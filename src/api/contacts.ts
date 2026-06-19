import { api } from './client';
import type { SavedContact } from '../state/contactsStore';

/**
 * Saved contacts API (/patient/contacts). "Book for someone else" recipients —
 * name + phone (+ optional relation/address) the patient can reuse next time,
 * parcel-app style. Backend echoes the row with `_id`; we map `_id` → `id`.
 */
interface ServerContact {
  _id: string;
  name?: string;
  phone?: string;
  relation?: string;
  address?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

const toContact = (s: ServerContact): SavedContact => ({
  id: s._id,
  name: s.name || '',
  phone: s.phone || '',
  relation: s.relation || undefined,
  address: s.address || undefined,
  lat: s.lat,
  lng: s.lng,
  isDefault: !!s.isDefault,
});

export const contactsApi = {
  async list(): Promise<SavedContact[]> {
    const data = await api.get<ServerContact[] | { items: ServerContact[] }>('/patient/contacts');
    const arr = Array.isArray(data) ? data : data?.items ?? [];
    return arr.map(toContact);
  },
  async create(c: Omit<SavedContact, 'id'>): Promise<SavedContact> {
    return toContact(await api.post<ServerContact>('/patient/contacts', c));
  },
  async update(id: string, c: Partial<SavedContact>): Promise<SavedContact> {
    return toContact(await api.put<ServerContact>(`/patient/contacts/${id}`, c));
  },
  remove: (id: string) => api.del(`/patient/contacts/${id}`),
};
