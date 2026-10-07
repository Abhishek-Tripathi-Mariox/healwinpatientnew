import {api} from './client';

/**
 * Checkout.
 *
 * One set of endpoints for everything the patient buys — a ride, a lab
 * booking, a pharmacy order, a membership. The app never sends an amount: it
 * names WHAT it is paying for and the server prices it from its own records.
 * An app that can state its own price can state zero.
 *
 * Wallet top-up is not here. It keeps its own pair of endpoints under
 * `walletApi`, with its own ledger on the server.
 */

export type PayPurpose =
  | 'ambulance_booking'
  | 'ambulance_ride'
  | 'ambulance_cancellation'
  | 'consultation'
  | 'lab_booking'
  | 'pharmacy_order'
  | 'membership';

/** Everything the Razorpay sheet needs, as the SERVER created it. */
export interface CheckoutOrder {
  paymentOrderId: string;
  orderId: string;
  amount: number; // paise, as the gateway states it
  currency: string;
  keyId: string; // publishable key
  description: string;
}

export interface PayQuote {
  /** Rupees still owed. Zero means nothing to collect. */
  amount: number;
  total: number;
  paid: number;
  description: string;
  walletBalance: number;
}

export interface SettleResult {
  paid: boolean;
  amount?: number;
  purpose?: string;
  refId?: string;
  /** Money taken, not yet applied — the webhook will finish it. */
  pending?: string;
  reason?: string;
}

export interface PaymentRecord {
  _id: string;
  purpose: PayPurpose | 'wallet_topup';
  refId?: string;
  description: string;
  amount: number;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  method?: string;
  paidAt?: string;
  refundedAmount?: number;
  createdAt: string;
}

export const paymentsApi = {
  quote: (purpose: PayPurpose, refId: string) =>
    api.get<PayQuote>('/patient/checkout/quote', {purpose, refId}),

  start: (purpose: PayPurpose, refId: string) =>
    api.post<CheckoutOrder>('/patient/checkout/start', {purpose, refId}),

  confirm: (p: {orderId: string; paymentId: string; signature: string}) =>
    api.post<SettleResult>('/patient/checkout/confirm', p),

  payFromWallet: (purpose: PayPurpose, refId: string) =>
    api.post<SettleResult>('/patient/checkout/wallet', {purpose, refId}),

  history: (page = 1) =>
    api
      .get<{
        items: PaymentRecord[];
        pagination: {pages: number; total: number};
      }>('/patient/payments', {page, limit: 25})
      .then(d => ({items: d?.items ?? [], pagination: d?.pagination})),
};
