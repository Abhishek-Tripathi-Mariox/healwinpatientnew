import { api } from './client';

/** Wallet / coins / SOS / support / home — all real backend endpoints. */

export interface ServerPromo {
  _id: string;
  titleTop: string;
  titleBold: string[];
  cta: string;
  target: string;
  image?: string | null;
}

export interface HomeShortcut {
  key: string;
  label: string;
  route: string;
  params?: Record<string, any> | null;
}

export interface HomeFeed {
  banners: ServerPromo[];
  shortcuts: HomeShortcut[];
  upcoming: {
    _id: string;
    type: 'opd_appointment';
    scheduledAt: string;
    doctorName: string | null;
    tokenNumber: number;
  }[];
  suggestions: { _id: string; title: string; category: string; thumbnailUrl: string | null }[];
}

export const homeApi = {
  /** Admin-managed home promo shortcut cards. */
  promos: () =>
    api.get<any>('/patient/home/promos', undefined, false).then((d) =>
      (Array.isArray(d) ? d : d?.items ?? []) as ServerPromo[],
    ),
  /** Quick-links + this patient's nearest upcoming OPD appointment + a couple of first-aid suggestions. */
  feed: () => api.get<HomeFeed>('/patient/home/feed'),
};

export interface FirstAidGuide {
  _id: string;
  title: string;
  category?: string;
  type: 'video' | 'article';
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  content?: string | null;
  durationLabel?: string | null;
}

export const firstAidApi = {
  list: () =>
    api.get<any>('/patient/first-aid', undefined, false).then((d) =>
      (Array.isArray(d) ? d : d?.items ?? []) as FirstAidGuide[],
    ),
};

export interface ServerMembershipPlan {
  _id: string;
  tier: 'silver' | 'gold';
  name: string;
  price: number;
  durationMonths: number;
  concessionPercent?: number;
  /** 0 = unlimited. */
  maxFamilyMembers?: number;
  bullets: string[];
}

export interface ServerUserMembership {
  _id: string;
  /** Which plan this membership is on — lets the list mark the current one. */
  planId?: string;
  planName: string;
  tier: 'silver' | 'gold';
  enrolledAt?: string;
  validUpto?: string;
  daysRemaining?: number;
  concessionPercent?: number;
  maxFamilyMembers?: number;
  familyCount?: number;
  status?: string;
}

export const membershipApi = {
  plans: () =>
    api.get<any>('/patient/membership/plans', undefined, false).then((d) =>
      (Array.isArray(d) ? d : d?.items ?? []) as ServerMembershipPlan[],
    ),
  active: () => api.get<ServerUserMembership | null>('/patient/membership'),
  enroll: (planId: string) =>
    api.post<{
      _id: string;
      planName: string;
      validUpto: string;
      amountDue?: number;
      concessionPercent?: number;
      extendedFromExisting?: boolean;
      message?: string;
    }>('/patient/membership/enroll', { planId }),
};

export interface TopUpOrder {
  orderId: string;
  amount: number; // paise, as the gateway states it
  currency: string;
  keyId: string; // publishable key for the checkout sheet
}

export interface TopUpConfirmation {
  credited: boolean;
  balance: number;
  amount?: number;
  reason?: string;
}

/**
 * Wallet.
 *
 * Top-up is deliberately two calls with a real payment in between. The old
 * single `/wallet/add` just credited whatever the app asked for, so the amount
 * is no longer something the client gets to state — `confirmTopUp` returns the
 * balance the SERVER arrived at after verifying the payment.
 */
export const walletApi = {
  balance: () => api.get<{ balance: number }>('/wallet'),
  transactions: () =>
    api.get<any>('/payments/transactions').then((d) =>
      Array.isArray(d) ? d : d?.items ?? d?.transactions ?? [],
    ),
  startTopUp: (amount: number) =>
    api.post<TopUpOrder>('/wallet/topup/start', { amount }),
  confirmTopUp: (p: { orderId: string; paymentId: string; signature: string }) =>
    api.post<TopUpConfirmation>('/wallet/topup/confirm', p),
};

const toTxnList = (d: any) => (Array.isArray(d) ? d : d?.items ?? d?.transactions ?? []);

export const coinsApi = {
  balance: () => api.get<{ balance: number }>('/coins/balance'),
  transactions: () => api.get<any>('/coins/transactions').then(toTxnList),
  // Earned (rewards) vs spent (redemptions) history.
  rewards: () => api.get<any>('/coins/rewards').then(toTxnList),
  redemptions: () => api.get<any>('/coins/redemptions').then(toTxnList),
  // Convert coins → wallet balance (min 100). Returns amountCredited.
  transferToWallet: (coins: number) =>
    api.post<{ coinsTransferred: number; amountCredited: number }>('/coins/transfer-to-wallet', { coins }),
};

export interface SosTriggerInput {
  /**
   * Who the emergency is for. Omit for the account holder; pass a saved family
   * member's id to dispatch for them instead. The backend verifies the member
   * belongs to the caller.
   */
  familyMemberId?: string;
  /**
   * Family members to alert as well as the control room. Empty = only the
   * control room is told, which is the default.
   */
  notifyFamilyMemberIds?: string[];
  /**
   * false = tell family only, do NOT alert the control room. No ambulance is
   * dispatched. Defaults to true.
   */
  notifyControlRoom?: boolean;
  location?: { lat: number; lng: number };
  address?: string;
  type?: string;
  name?: string;
  description?: string;
  // 'CALL' → SOS Dashboard "SOS Calls" tab; 'FORM' → "SOS Forms" tab.
  submissionType?: 'CALL' | 'FORM';
}

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relationship?: string;
}

export const sosApi = {
  trigger: (input: SosTriggerInput) => api.post('/sos/trigger', input),
  contacts: () => api.get<any[]>('/sos/contacts').then((d) => (Array.isArray(d) ? d : (d as any)?.contacts ?? [])),
  addContact: (c: EmergencyContactInput) => api.post('/sos/contacts', c),
  updateContact: (id: string, c: EmergencyContactInput) => api.put(`/sos/contacts/${id}`, c),
  removeContact: (id: string) => api.del(`/sos/contacts/${id}`),
  history: () => api.get<any[]>('/sos/history'),
};

/**
 * Emergency SOS that works WITHOUT logging in.
 *
 * In an emergency the last thing a person should face is an OTP screen, so
 * this posts to the public endpoint (`auth = false` — no token attached) and
 * lands on the control room's SOS dashboard in real time, exactly like an
 * authenticated SOS. Name and phone are optional; the location is what matters.
 */
export interface GuestSosInput {
  name?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export const guestSosApi = {
  call: (input: GuestSosInput) =>
    api.post<{ id: string }>('/sos-public/call', input, false),
};

export const supportApi = {
  faqs: () => api.get<any[]>('/support/faqs'),
  // Helpline number + support email (from backend env) for the Call/Email buttons.
  contactInfo: () =>
    api.get<{ helplineNumber: string; email: string }>('/support/contact-info'),
  topics: () => api.get<any[]>('/support/topics'),
  tickets: () => api.get<any>('/support/tickets').then((d) => (Array.isArray(d) ? d : d?.tickets ?? [])),
  ticket: (id: string) => api.get<{ ticket: any; messages: any[] }>(`/support/tickets/${id}`),
  createTicket: (data: { subject: string; category: string; message: string; bookingId?: string }) =>
    api.post('/support/tickets', data),
  addMessage: (id: string, message: string) => api.post(`/support/tickets/${id}/messages`, { message }),
  closeTicket: (id: string) => api.post(`/support/tickets/${id}/close`, {}),
};
