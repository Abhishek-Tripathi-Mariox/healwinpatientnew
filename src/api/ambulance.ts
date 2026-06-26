import { api } from './client';

/**
 * Ambulance booking API (/patient/ambulance/*). Mirrors the old app's flow:
 * fetch types, estimate fare, book, fetch the active booking, cancel.
 */

export interface AmbulanceType {
  _id?: string;
  code: string;
  name: string;
  description?: string;
  priceFrom?: number;
  perKmRate?: number;
  icon?: string;
  image?: string;
  maxRangeKm?: number;
  etaMinutes?: number;
}

/** A real, distance-based fare quote for one ambulance type. */
export interface AmbulanceQuote extends AmbulanceType {
  amount: number;
  distanceKm?: number | null;
}

/** Server-computed fare breakdown (mirrors the backend fare engine). */
export interface FareBreakdown {
  baseFare?: number;
  distanceCharge?: number;
  timeCharge?: number;
  surgeCharge?: number;
  addonCharges?: number;
  loadingUnloadingCharge?: number;
  tollCharges?: number;
  subtotal?: number;
  gstAmount?: number;
  gstPercentage?: number;
  totalDiscount?: number;
  finalFare?: number;
}

export interface LatLng {
  lat: number;
  lng: number;
  address?: string;
}

/** One in-transit medical expense line (oxygen, medicine, procedure…). */
export interface InTransitExpense {
  item: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface BookAmbulanceInput {
  type: string;
  pickup: LatLng;
  drop?: LatLng;
  patientName?: string;
  familyMemberId?: string;
  // "Book for someone else" — the saved contact this ride is for.
  contactId?: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
  scheduledAt?: string;
  emergency?: boolean;
  // Optional discount coupon, validated + applied server-side at booking time.
  promoCode?: string;
}

/** Result of previewing a promo code against a quoted fare. */
export interface ApplyPromoResult {
  valid: boolean;
  code: string;
  discountAmount: number;
  finalAmount: number;
  description?: string;
}

export interface ServerAmbulanceBooking {
  _id: string;
  type?: string;
  status?: string;
  driver?: { name?: string; phone?: string };
  vehicle?: { number?: string };
  otp?: string;
  etaMinutes?: number;
  pickup?: LatLng;
  drop?: LatLng;
  amount?: number;
  // Promo applied at booking: gross (pre-discount) fare + savings.
  grossAmount?: number | null;
  discountAmount?: number;
  promoCode?: string | null;
  // Real fare breakup computed at booking time.
  fareBreakdown?: FareBreakdown | null;
  // In-transit medical expenses (oxygen, medicines…) logged by the control
  // room during the ride, billed on top of the ambulance fare.
  inTransitExpenses?: InTransitExpense[];
  inTransitTotal?: number;
  grandTotal?: number | null; // ambulance amount + inTransitTotal — final payable
  paymentStatus?: "PENDING" | "PAID";
  tripDistanceKm?: number | null;
  // Live tracking: ambulance's last reported position + distance from pickup.
  driverLocation?: { lat?: number; lng?: number } | null;
  distanceKm?: number | null;
  lastLocationAt?: string | null;
}

export const ambulanceApi = {
  async types(): Promise<AmbulanceType[]> {
    const data = await api.get<AmbulanceType[] | { items: AmbulanceType[] }>('/patient/ambulance/types', undefined, false);
    return Array.isArray(data) ? data : data?.items ?? [];
  },
  estimate: (pickup: LatLng, drop?: LatLng, type?: string) =>
    api.post<{ amount: number; currency?: string; distanceKm?: number; breakdown?: FareBreakdown }>(
      '/patient/ambulance/estimate',
      { pickup, drop, type },
    ),
  /** Real per-type fare quotes for a pickup→drop leg (drives the select list). */
  async quotes(pickup?: LatLng, drop?: LatLng): Promise<AmbulanceQuote[]> {
    const data = await api.post<{ items: AmbulanceQuote[] } | AmbulanceQuote[]>(
      '/patient/ambulance/quotes',
      { pickup, drop },
    );
    return Array.isArray(data) ? data : data?.items ?? [];
  },
  book: (input: BookAmbulanceInput) =>
    api.post<ServerAmbulanceBooking>(
      input.emergency ? '/patient/ambulance/emergency' : '/patient/ambulance/book',
      input,
    ),
  /** Preview a promo code against a quoted fare before booking. */
  applyPromo: (code: string, amount: number, type?: string) =>
    api.post<ApplyPromoResult>('/patient/ambulance/apply-promo', { code, amount, type }),
  async active(): Promise<ServerAmbulanceBooking | null> {
    try {
      const b = await api.get<ServerAmbulanceBooking | null>('/patient/ambulance/active');
      return b && (b as any)._id ? b : null;
    } catch {
      return null;
    }
  },
  /** Active admin-dispatched SOS (EmergencyDispatch) for live tracking. */
  async activeSos(): Promise<ServerAmbulanceBooking | null> {
    try {
      const b = await api.get<ServerAmbulanceBooking | null>('/patient/sos/active');
      return b && (b as any)._id ? b : null;
    } catch {
      return null;
    }
  },
  detail: (id: string) => api.get<ServerAmbulanceBooking>(`/patient/ambulance/${id}`),
  cancel: (id: string, reason?: string) =>
    api.post(`/patient/ambulance/${id}/cancel`, { reason }),
  /** Pay the ambulance bill (fare + in-transit expenses). Mock gateway for now. */
  pay: (id: string, method = 'ONLINE') =>
    api.post<ServerAmbulanceBooking>(`/patient/ambulance/${id}/pay`, { method }),
};
