/**
 * Minimal typings for react-native-razorpay, which ships none of its own.
 * Only the surface we actually use is declared.
 */
declare module 'react-native-razorpay' {
  export interface CheckoutOptions {
    key: string;
    order_id: string;
    amount: number | string;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    theme?: {color?: string};
    prefill?: {name?: string; email?: string; contact?: string};
    notes?: Record<string, string>;
  }
  export interface CheckoutSuccess {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
  export interface CheckoutError {
    code?: number;
    description?: string;
    error?: {description?: string; reason?: string};
  }
  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<CheckoutSuccess>;
  };
  export default RazorpayCheckout;
}
