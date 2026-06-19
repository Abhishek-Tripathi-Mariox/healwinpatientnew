import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistent storage for the session (auth token, user id) and a stable
 * per-install device id used for FCM device registration.
 */

const K_TOKEN = 'healwin.token';
const K_USER_ID = 'healwin.userId';
const K_PHONE = 'healwin.phone';
const K_DEVICE_ID = 'healwin.deviceId';

/** Persisted React Navigation state — lets the app reopen on the same screen. */
export const NAV_STATE_KEY = 'healwin.navState';

export const storage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(K_TOKEN);
  },
  async setSession(token: string, userId: string, phone?: string): Promise<void> {
    await AsyncStorage.setItem(K_TOKEN, token);
    await AsyncStorage.setItem(K_USER_ID, userId);
    if (phone) await AsyncStorage.setItem(K_PHONE, phone);
  },
  async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem(K_USER_ID);
  },
  async getPhone(): Promise<string | null> {
    return AsyncStorage.getItem(K_PHONE);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(K_TOKEN);
    await AsyncStorage.removeItem(K_USER_ID);
    await AsyncStorage.removeItem(K_PHONE);
    // Drop the saved navigation stack so a logged-out user starts at Login.
    await AsyncStorage.removeItem(NAV_STATE_KEY);
  },

  /** Stable device id (generated once per install) for push registration. */
  async getDeviceId(): Promise<string> {
    let id = await AsyncStorage.getItem(K_DEVICE_ID);
    if (!id) {
      id = `rn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(K_DEVICE_ID, id);
    }
    return id;
  },
};
