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
