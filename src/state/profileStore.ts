import { useSyncExternalStore } from 'react';

export interface Profile {
  name: string;
  gender: string;
  age: string;
  idType: string;
  idNumber: string;
  phone: string;
  email: string;
  photo: string; // profile image URL from the backend
}

// Empty by default — populated from the backend profile after login.
let profile: Profile = {
  name: '',
  gender: '',
  age: '',
  idType: '',
  idNumber: '',
  phone: '',
  email: '',
  photo: '',
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const profileStore = {
  get: () => profile,
  update(patch: Partial<Profile>) {
    profile = { ...profile, ...patch };
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useProfile = (): Profile => useSyncExternalStore(profileStore.subscribe, profileStore.get);
