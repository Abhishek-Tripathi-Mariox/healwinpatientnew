import { Platform, PermissionsAndroid } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission as fbRequestPermission,
  getInitialNotification,
  onNotificationOpenedApp,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { registerDevice, unregisterDevice } from '../api/auth';

/**
 * Firebase Cloud Messaging integration (modular API — RNFirebase v22+).
 *
 * Flow:
 *  - request permission (iOS prompt; Android 13+ POST_NOTIFICATIONS)
 *  - get the FCM token and register the device with the backend
 *    (POST /notifications/devices/register — links to the user when authed)
 *  - listen for token refresh and re-register
 *  - foreground messages + notification taps are surfaced for deep-linking
 *
 * The background handler is registered at the top level (index.js).
 */

const msg = () => getMessaging(getApp());

let currentToken: string | null = null;
let onNavigate: ((route: string, params?: any) => void) | null = null;

/** Let the app route notification taps once the navigator is ready. */
export const setPushNavigator = (fn: (route: string, params?: any) => void) => {
  onNavigate = fn;
};

const requestPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const status = await fbRequestPermission(msg());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
};

const handleRoute = (data?: { [key: string]: any }) => {
  const route = data?.route as string | undefined;
  if (route && onNavigate) onNavigate(route, data);
};

/**
 * Initialize FCM. Safe to call on app start and again after login (re-registers
 * the token so it links to the now-authenticated user). Never throws.
 */
export const initPush = async (): Promise<void> => {
  try {
    // Ask for permission (controls whether the OS DISPLAYS notifications) but
    // DON'T bail if denied — we still register the FCM token so the backend can
    // target this device. On Android the token is valid regardless of the
    // POST_NOTIFICATIONS grant; permission only gates display. (On iOS a token
    // needs permission, so getToken may throw there — caught below.)
    const granted = await requestPermission();
    if (!granted) {
      console.log('[push] notification permission not granted — registering token anyway');
    }

    currentToken = await getToken(msg());
    if (currentToken) {
      await registerDevice(currentToken, Platform.OS === 'ios' ? 'ios' : 'android');
    }

    onTokenRefresh(msg(), async (token) => {
      currentToken = token;
      await registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android').catch(() => undefined);
    });

    // App opened from a notification (background → foreground).
    onNotificationOpenedApp(msg(), (m) => handleRoute(m?.data));

    // App opened from a notification (cold start / terminated).
    const initial = await getInitialNotification(msg());
    if (initial) handleRoute(initial.data);
  } catch {
    // Push is best-effort — missing google-services / no Play Services etc.
  }
};

/** Foreground message subscription — call once; returns an unsubscribe fn.
 *  No-ops safely when Firebase isn't configured. */
export const subscribeForeground = (
  onMsg: (title: string, body: string, data?: any) => void,
): (() => void) => {
  try {
    return onMessage(msg(), async (m) => {
      const n = m.notification;
      onMsg(n?.title || 'HealWin', n?.body || '', m.data);
    });
  } catch {
    return () => {};
  }
};

/** Unregister this device (call on logout). */
export const teardownPush = async (): Promise<void> => {
  if (currentToken) await unregisterDevice(currentToken);
  currentToken = null;
};
