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

export const homeApi = {
  /** Admin-managed home promo shortcut cards. */
  promos: () =>
    api.get<any>('/patient/home/promos', undefined, false).then((d) =>
      (Array.isArray(d) ? d : d?.items ?? []) as ServerPromo[],
    ),
};

export interface ServerMembershipPlan {
  _id: string;
  tier: 'silver' | 'gold';
  name: string;
  price: number;
  durationMonths: number;
  concessionPercent?: number;
  bullets: string[];
}

export interface ServerUserMembership {
  _id: string;
  planName: string;
  tier: 'silver' | 'gold';
  enrolledAt?: string;
  validUpto?: string;
  familyCount?: number;
  status?: string;
}

export const membershipApi = {
  plans: () =>
    api.get<any>('/patient/membership/plans', undefined, false).then((d) =>
      (Array.isArray(d) ? d : d?.items ?? []) as ServerMembershipPlan[],
    ),
  active: () => api.get<ServerUserMembership | null>('/patient/membership'),
  enroll: (planId: string) => api.post('/patient/membership/enroll', { planId }),
};

export const walletApi = {
  balance: () => api.get<{ balance: number }>('/wallet'),
  transactions: () =>
    api.get<any>('/payments/transactions').then((d) =>
      Array.isArray(d) ? d : d?.items ?? d?.transactions ?? [],
    ),
  // Dummy top-up (no real gateway yet) — credits the wallet instantly.
  addMoney: (amount: number, referenceId?: string) =>
    api.post<{ balance: number }>('/wallet/add', { amount, referenceId }),
};

export const coinsApi = {
  balance: () => api.get<{ balance: number }>('/coins/balance'),
  transactions: () =>
    api.get<any>('/coins/transactions').then((d) =>
      Array.isArray(d) ? d : d?.items ?? d?.transactions ?? [],
    ),
};

export interface SosTriggerInput {
  location?: { lat: number; lng: number };
  address?: string;
  type?: string;
  name?: string;
  description?: string;
  // 'CALL' → SOS Dashboard "SOS Calls" tab; 'FORM' → "SOS Forms" tab.
  submissionType?: 'CALL' | 'FORM';
}

export const sosApi = {
  trigger: (input: SosTriggerInput) => api.post('/sos/trigger', input),
  contacts: () => api.get<any[]>('/sos/contacts'),
  history: () => api.get<any[]>('/sos/history'),
};

export const supportApi = {
  faqs: () => api.get<any[]>('/support/faqs'),
  topics: () => api.get<any[]>('/support/topics'),
  tickets: () => api.get<any>('/support/tickets'),
  createTicket: (data: { subject: string; category?: string; message: string; bookingId?: string }) =>
    api.post('/support/tickets', data),
};
