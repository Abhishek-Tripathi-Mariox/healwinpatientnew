import { api } from './client';

/** Raw booking as returned by the backend (fields are best-effort optional). */
export interface ServerBooking {
  _id: string;
  bookingId?: string;
  type?: string;
  serviceType?: string;
  status?: string;
  createdAt?: string;
  scheduledDate?: string;
  finalAmount?: number;
  amount?: number;
  totalAmount?: number;
  vehicleType?: { name?: string } | string;
  ambulanceType?: string;
  driver?: { name?: string; fullName?: string; phone?: string };
  vehicle?: { number?: string; registrationNumber?: string };
  pickupAddress?: string;
  dropAddress?: string;
  patientName?: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
  otp?: string;
  // Cancellation + lifecycle (from the ambulance request).
  cancelledBy?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  cancellationCharge?: number;
  assignedAt?: string | null;
  completedAt?: string | null;
  statusHistory?: { status?: string; at?: string; by?: string | null; note?: string | null }[];
  pickup?: { address?: string } | null;
  drop?: { address?: string } | null;
}

export interface TimelineStep {
  status: string;
  at?: string;
  by?: string | null;
  note?: string | null;
}

/** UI status buckets the Bookings screen uses. */
export type UiStatus = 'active' | 'completed' | 'cancelled';

export const toUiStatus = (s?: string): UiStatus => {
  const v = (s || '').toLowerCase();
  if (v === 'completed' || v === 'delivered') return 'completed';
  if (v === 'cancelled' || v === 'canceled' || v === 'rejected') return 'cancelled';
  return 'active';
};

const vehicleName = (b: ServerBooking): string =>
  (typeof b.vehicleType === 'object' ? b.vehicleType?.name : b.vehicleType) ||
  b.ambulanceType ||
  b.type ||
  'Booking';

export interface UiBooking {
  id: string;
  type: string;
  date: string;
  amount: number;
  status: UiStatus;
  rawStatus: string;
  driverName: string;
  vehicleNumber?: string;
  // "Booked for someone else" recipient, when present.
  recipientName?: string;
  recipientPhone?: string;
  pickupAddress?: string;
  dropAddress?: string;
  // Cancellation details (for the "what happened" view).
  cancelledBy?: string | null;
  cancelReason?: string | null;
  cancellationCharge: number;
  // Lifecycle timeline.
  timeline: TimelineStep[];
}

const fmtDateTime = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

export const toUiBooking = (b: ServerBooking): UiBooking => ({
  id: b._id,
  type: vehicleName(b),
  date: fmtDateTime(b.createdAt),
  amount: b.finalAmount ?? b.totalAmount ?? b.amount ?? 0,
  status: toUiStatus(b.status),
  rawStatus: (b.status || '').toLowerCase(),
  driverName: b.driver?.name || b.driver?.fullName || '—',
  vehicleNumber: b.vehicle?.number || b.vehicle?.registrationNumber,
  recipientName: b.recipientName || b.patientName || undefined,
  recipientPhone: b.recipientPhone || undefined,
  pickupAddress: b.pickupAddress || b.pickup?.address || undefined,
  dropAddress: b.dropAddress || b.drop?.address || undefined,
  cancelledBy: b.cancelledBy || undefined,
  cancelReason: b.cancelReason || undefined,
  cancellationCharge: b.cancellationCharge ?? 0,
  timeline: Array.isArray(b.statusHistory)
    ? b.statusHistory.map((h) => ({
        status: (h.status || '').toLowerCase(),
        at: h.at,
        by: h.by ?? null,
        note: h.note ?? null,
      }))
    : [],
});

/** Human label + date for a timeline step. */
export const timelineLabel = (status: string): string => {
  switch (status) {
    case 'searching':
      return 'Requested';
    case 'assigned':
      return 'Ambulance assigned';
    case 'arrived':
      return 'Ambulance arrived';
    case 'on_trip':
      return 'On the way to hospital';
    case 'completed':
      return 'Trip completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ');
  }
};

export const fmtTimelineTime = fmtDateTime;

export const bookingsApi = {
  // "My Bookings" = the user's ambulance requests (stored in AmbulanceRequest,
  // NOT the legacy Booking collection — so we read the ambulance history).
  async list(): Promise<UiBooking[]> {
    const data = await api.get<ServerBooking[] | { items?: ServerBooking[]; bookings?: ServerBooking[] }>(
      '/patient/ambulance/history',
    );
    const arr = Array.isArray(data) ? data : data?.items ?? data?.bookings ?? [];
    return arr.map(toUiBooking);
  },
  detail: (id: string) => api.get<ServerBooking>(`/patient/ambulance/${id}`),
  track: (id: string) => api.get(`/patient/ambulance/${id}`),
  cancel: (id: string, reason?: string) =>
    api.post(`/patient/ambulance/${id}/cancel`, { reason }),
  rate: (id: string, rating: number, review?: string) =>
    api.post(`/bookings/${id}/rate`, { rating, review }),
};
