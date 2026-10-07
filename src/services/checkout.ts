import RazorpayCheckout, {
  type CheckoutError,
  type CheckoutSuccess,
} from 'react-native-razorpay';

import {walletApi, type TopUpOrder} from '../api/misc';
import {
  paymentsApi,
  type CheckoutOrder,
  type PayPurpose,
  type SettleResult,
} from '../api/payments';

/**
 * Real Razorpay checkout.
 *
 * The flow is deliberately server-anchored:
 *   1. the SERVER creates the order and returns its id + the publishable key;
 *   2. the customer pays in Razorpay's own sheet — no card details ever touch
 *      this app;
 *   3. the SERVER verifies the signature, asks the gateway what was actually
 *      captured, and credits that amount.
 *
 * The app never states an amount that money is credited from, and never sees
 * the key secret.
 */

export class CheckoutCancelled extends Error {
  constructor() {
    super('Payment cancelled.');
    this.name = 'CheckoutCancelled';
  }
}

/** react-native-razorpay uses this code for "the customer backed out". */
const CANCELLED_CODE = 0;

const describe = (e: CheckoutError): string =>
  e?.error?.description ||
  e?.description ||
  'The payment could not be completed.';

/** True when the native module is missing — an app build without the SDK. */
export const isCheckoutAvailable = (): boolean =>
  !!RazorpayCheckout && typeof RazorpayCheckout.open === 'function';

interface OpenArgs {
  order: TopUpOrder | CheckoutOrder;
  description: string;
  prefill?: {name?: string; email?: string; contact?: string};
}

const openSheet = async ({
  order,
  description,
  prefill,
}: OpenArgs): Promise<CheckoutSuccess> => {
  try {
    return await RazorpayCheckout.open({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'HealWin',
      description,
      theme: {color: '#1E5AA8'},
      prefill,
    });
  } catch (e) {
    const err = e as CheckoutError;
    if (err?.code === CANCELLED_CODE) {
      throw new CheckoutCancelled();
    }
    throw new Error(describe(err));
  }
};

export interface TopUpOutcome {
  balance: number;
  amount?: number;
  /**
   * Set when the payment went through but the credit has not landed yet —
   * the gateway's webhook will complete it. Distinct from a failure: the
   * customer HAS paid, so the screen must not tell them it did not work.
   */
  pending?: string;
}

/**
 * Add money to the wallet. Resolves once the server confirms the credit,
 * throws CheckoutCancelled if the customer backed out.
 */
export const topUpWallet = async (
  amountRupees: number,
  prefill?: OpenArgs['prefill'],
): Promise<TopUpOutcome> => {
  if (!isCheckoutAvailable()) {
    throw new Error(
      'Payments need the latest version of the app. Please update from the store and try again.',
    );
  }

  const order = await walletApi.startTopUp(amountRupees);
  const paid = await openSheet({
    order,
    description: `Wallet top-up of ₹${amountRupees}`,
    prefill,
  });

  const res = await walletApi.confirmTopUp({
    orderId: paid.razorpay_order_id,
    paymentId: paid.razorpay_payment_id,
    signature: paid.razorpay_signature,
  });

  // Money has left the customer's account by this point. If our confirm call
  // could not credit it (gateway still settling, a network blip), the webhook
  // will — so report it as pending, never as a failure.
  if (!res.credited) {
    return {
      balance: res.balance,
      pending:
        res.reason ||
        'Your payment is being confirmed and will be credited shortly.',
    };
  }
  return {balance: res.balance, amount: res.amount};
};

export interface PayOutcome {
  paid: boolean;
  amount?: number;
  /**
   * Set when the money went through but the server has not applied it yet —
   * the gateway's webhook will. Distinct from a failure: the customer HAS
   * paid, so nothing on screen may say otherwise.
   */
  pending?: string;
}

/**
 * Pay for something.
 *
 * `order` is the checkout the SERVER already created — most create endpoints
 * hand one back with the thing they created, so the customer is never shown a
 * price the server did not set. Pass only `purpose` + `refId` to raise a fresh
 * one (paying later, retrying an abandoned checkout).
 *
 * Throws CheckoutCancelled if the customer backs out, which is a normal thing
 * to do and not an error worth an alert.
 */
export const payFor = async (args: {
  purpose: PayPurpose;
  refId: string;
  order?: CheckoutOrder | null;
  description?: string;
  prefill?: OpenArgs['prefill'];
}): Promise<PayOutcome> => {
  if (!isCheckoutAvailable()) {
    throw new Error(
      'Payments need the latest version of the app. Please update from the store and try again.',
    );
  }

  const order =
    args.order ?? (await paymentsApi.start(args.purpose, args.refId));
  const paid = await openSheet({
    order,
    description: args.description || order.description || 'HealWin',
    prefill: args.prefill,
  });

  let res: SettleResult;
  try {
    res = await paymentsApi.confirm({
      orderId: paid.razorpay_order_id,
      paymentId: paid.razorpay_payment_id,
      signature: paid.razorpay_signature,
    });
  } catch (e) {
    // The sheet succeeded, so the money is gone from the customer's account.
    // A failed confirm call is OUR problem, not theirs — the webhook settles
    // the same payment server-side regardless.
    return {
      paid: true,
      pending:
        'Your payment went through. We are confirming it and will update this shortly.',
    };
  }

  if (!res.paid) {
    return {
      paid: true,
      pending: res.pending || res.reason || 'Confirming your payment…',
    };
  }
  return {paid: true, amount: res.amount};
};

/** Pay from the HealWin wallet — no gateway sheet, no card. */
export const payFromWallet = async (
  purpose: PayPurpose,
  refId: string,
): Promise<PayOutcome> => {
  const res = await paymentsApi.payFromWallet(purpose, refId);
  return {paid: !!res.paid, amount: res.amount};
};
