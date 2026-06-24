import { api } from './client';
import type { Address } from '../state/addressStore';

/**
 * Address API. The backend stores addresses as
 * { houseNo, area, district, state, pinCode } and returns a formatted
 * `address` string; the app uses { line1, line2, city, state, pincode }.
 * These mappers translate between the two.
 */

interface ServerAddress {
  _id: string;
  fullName?: string;
  mobileNumber?: string;
  addressType?: string;
  houseNo?: string;
  area?: string;
  district?: string;
  state?: string;
  pinCode?: number | string;
  isSelected?: boolean;
}

const toAddress = (s: ServerAddress): Address => ({
  id: s._id,
  line1: s.houseNo || '',
  line2: s.area || '',
  city: s.district || '',
  state: s.state || '',
  pincode: s.pinCode != null ? String(s.pinCode) : '',
  fullName: s.fullName,
  mobileNumber: s.mobileNumber,
  addressType: (s.addressType as Address['addressType']) || 'Home',
  // Backend stores the default flag as `isSelected`, not `isDefault`.
  isDefault: s.isSelected,
});

// Map to the backend's address schema. The backend requires fullName,
// mobileNumber, addressType, a non-empty `area`, and an INTEGER pinCode — so we
// coerce pinCode to a number and fall back `area` to line1 when line2 is blank.
const toServer = (a: Partial<Address>) => ({
  fullName: a.fullName,
  mobileNumber: a.mobileNumber,
  addressType: a.addressType || 'Home',
  houseNo: a.line1,
  area: a.line2 && a.line2.trim() ? a.line2 : a.line1,
  district: a.city,
  state: a.state,
  pinCode: a.pincode ? Number(a.pincode) : undefined,
  isSelected: a.isDefault,
});

export const addressApi = {
  async list(): Promise<Address[]> {
    // The backend paginates: it returns { page, limit, total, data: [...] }.
    // Tolerate a bare array or an { items } shape too.
    const res = await api.get<
      | ServerAddress[]
      | { items?: ServerAddress[]; data?: ServerAddress[] }
    >('/users/address');
    const arr = Array.isArray(res) ? res : res?.data ?? res?.items ?? [];
    return arr.map(toAddress);
  },
  async create(a: Omit<Address, 'id'>): Promise<Address> {
    const s = await api.post<ServerAddress>('/users/address', toServer(a));
    return toAddress(s);
  },
  async update(id: string, a: Partial<Address>): Promise<Address> {
    const s = await api.put<ServerAddress>(`/users/address/${id}`, toServer(a));
    return toAddress(s);
  },
  remove: (id: string) => api.del(`/users/address/${id}`),
};
