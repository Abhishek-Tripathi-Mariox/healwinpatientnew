import { useSyncExternalStore } from 'react';
import { authApi, UserProfile } from '../api/auth';
import { setOnUnauthorized } from '../api/client';
import { storage } from '../api/storage';
import { profileStore } from './profileStore';
import { initPush, teardownPush } from '../services/push';
import { socketService } from '../services/socket';
import { rideStore } from './rideStore';

let realtimeWired = false;
/** Connect the realtime socket and route booking events to the ride store. */
const connectRealtime = async () => {
  await socketService.connect();
  if (realtimeWired) return;
  realtimeWired = true;
  // When the backend assigns/updates a booking, refresh the active ride so the
  // tracking screen flips from "finding" to live tracking automatically.
  socketService.on('booking:accepted', () => rideStore.loadActive().catch(() => undefined));
  socketService.on('booking:status', () => rideStore.loadActive().catch(() => undefined));
  socketService.on('booking:cancelled', () => rideStore.clear());
  socketService.on('dispatch:status', () => rideStore.loadActive().catch(() => undefined));
};

/**
 * Central session store. `status` drives the navigator's gate:
 *   loading → splash, guest → auth flow, authed → app.
 */
export type AuthStatus = 'loading' | 'guest' | 'authed';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  profile: UserProfile | null;
}

let state: AuthState = { status: 'loading', userId: null, profile: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<AuthState>) => {
  state = { ...state, ...patch };
  emit();
};

/** Mirror the server profile into the legacy profileStore the screens read. */
const syncProfileStore = (p: UserProfile | null) => {
  if (!p) return;
  profileStore.update({
    name: p.fullName || '',
    email: p.email || '',
    gender: p.gender || '',
    age: p.age || '',
    idType: p.idType || '',
    idNumber: p.idNumber || '',
    phone: p.mobileNumber ? `${p.countryCode || ''}${p.mobileNumber}` : '',
    photo: p.profileImage || '',
  });
};

export const authStore = {
  getSnapshot: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  /** Called once on app start — restores any saved session. */
  async bootstrap() {
    const token = await storage.getToken();
    if (!token) {
      set({ status: 'guest' });
      return;
    }
    try {
      const profile = await authApi.getProfile();
      syncProfileStore(profile);
      set({ status: 'authed', userId: profile._id, profile });
      void connectRealtime();
    } catch {
      // Token invalid/expired → fall back to guest.
      await storage.clear();
      set({ status: 'guest', userId: null, profile: null });
    }
  },

  /** Called after a successful OTP verification. */
  async setSession(token: string, userId: string, phone?: string) {
    await storage.setSession(token, userId, phone);
    // Re-register the push token now that we're authenticated, so notifications
    // target this user.
    void initPush();
    void connectRealtime();
    try {
      const profile = await authApi.getProfile();
      syncProfileStore(profile);
      set({ status: 'authed', userId, profile });
    } catch {
      set({ status: 'authed', userId, profile: null });
    }
  },

  async refreshProfile() {
    const profile = await authApi.getProfile();
    syncProfileStore(profile);
    set({ profile });
    return profile;
  },

  async logout() {
    await teardownPush().catch(() => undefined);
    socketService.disconnect();
    realtimeWired = false;
    await storage.clear();
    set({ status: 'guest', userId: null, profile: null });
  },
};

// A 401 from any request forces a clean sign-out.
setOnUnauthorized(() => {
  void authStore.logout();
});

export const useAuth = (): AuthState =>
  useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
