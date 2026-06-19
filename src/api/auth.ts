import { api } from './client';
import { storage } from './storage';

/**
 * Auth / OTP API. Backend flow:
 *   POST /auth/login    { mobileNumber }      -> { userRegister, txnId }
 *   POST /auth/verifyOtp { txnId, otp }       -> { token, userId }
 *   PUT  /auth/resendOtp { countryCode, mobileNumber } -> { userRegister, txnId }
 */

export interface SendOtpResult {
  userRegister: boolean;
  txnId: string;
}
export interface VerifyOtpResult {
  token: string;
  userId: string;
}

export interface UserProfile {
  _id: string;
  fullName?: string;
  email?: string;
  profileImage?: string;
  gender?: string;
  dob?: string;
  age?: string;
  idType?: string;
  idNumber?: string;
  countryCode?: string;
  mobileNumber?: string;
  referralCode?: string;
}

export const authApi = {
  sendOtp: (mobileNumber: string) =>
    api.post<SendOtpResult>('/auth/login', { mobileNumber }, false),

  verifyOtp: (txnId: string, otp: string) =>
    api.post<VerifyOtpResult>('/auth/verifyOtp', { txnId, otp }, false),

  resendOtp: (mobileNumber: string, countryCode = '+91') =>
    api.put<SendOtpResult>('/auth/resendOtp', { countryCode, mobileNumber }, false),

  getProfile: () => api.get<UserProfile>('/users/profile'),

  /**
   * Update profile. Used by the signup step (name/email/gender/dob) and the
   * edit-profile screen. Sends multipart so an optional profile image can ride
   * along.
   */
  updateProfile: (data: {
    fullName?: string;
    email?: string;
    gender?: string;
    dob?: string;
    age?: string;
    idType?: string;
    idNumber?: string;
    image?: { uri: string; name: string; type: string };
  }) => {
    const form = new FormData();
    if (data.fullName !== undefined) form.append('fullName', data.fullName);
    if (data.email !== undefined) form.append('email', data.email);
    // gender is an enum (Male/Female/Other) — only send a real value, never ""
    if (data.gender) form.append('gender', data.gender);
    if (data.dob !== undefined) form.append('dob', data.dob);
    if (data.age !== undefined) form.append('age', data.age);
    if (data.idType !== undefined) form.append('idType', data.idType);
    if (data.idNumber !== undefined) form.append('idNumber', data.idNumber);
    if (data.image) form.append('profileImage', data.image as any);
    return api.upload<UserProfile>('/users/profile', form, 'PUT');
  },
};

/** Register this device's push token with the backend (links to user if logged in). */
export const registerDevice = async (fcmToken: string, platform: 'android' | 'ios') => {
  const deviceId = await storage.getDeviceId();
  return api.post('/notifications/devices/register', { fcmToken, deviceId, platform }, true).catch(() => {
    // Best-effort: registration can also run pre-login (anonymous).
    return api.post('/notifications/devices/register', { fcmToken, deviceId, platform }, false);
  });
};

export const unregisterDevice = (fcmToken: string) =>
  api.post('/notifications/devices/unregister', { fcmToken }, false).catch(() => undefined);
