import { useSyncExternalStore } from 'react';
import { familyApi } from '../api/family';

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone?: string;
  age?: string;
  gender?: string;
  photo?: string;
}

/** A locally-picked image to upload for a member's photo. */
export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

let members: FamilyMember[] = [];
let loaded = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const familyStore = {
  getMembers: () => members,
  isLoaded: () => loaded,

  async load() {
    members = await familyApi.list();
    loaded = true;
    emit();
  },

  async addMember(member: Omit<FamilyMember, 'id'>, image?: PickedImage) {
    const created = await familyApi.create(member, image);
    members = [...members, created];
    emit();
    return created;
  },

  async updateMember(id: string, patch: Partial<FamilyMember>, image?: PickedImage) {
    const updated = await familyApi.update(id, patch, image);
    members = members.map((m) => (m.id === id ? updated : m));
    emit();
    return updated;
  },

  async removeMember(id: string) {
    await familyApi.remove(id);
    members = members.filter((m) => m.id !== id);
    emit();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useFamilyMembers = (): FamilyMember[] =>
  useSyncExternalStore(familyStore.subscribe, familyStore.getMembers);
