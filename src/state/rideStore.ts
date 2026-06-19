import { useSyncExternalStore } from 'react';
import { ambulanceApi, BookAmbulanceInput, FareBreakdown, ServerAmbulanceBooking } from '../api/ambulance';
import { distanceKm as calcDistance, etaMinutesFromKm, LatLng } from '../services/geo';

export interface ActiveRide {
  bookingId?: string;
  eta: string; // e.g. "9 min" or "—"
  driver: string;
  vehicleNumber?: string;
  status?: string;
  otp?: string;
  // Real fare (computed by the backend fare engine at booking time).
  amount?: number | null;
  fareBreakdown?: FareBreakdown | null;
  // Live tracking
  pickup?: LatLng | null;
  ambulance?: LatLng | null; // ambulance's last known position
  distanceKm?: number | null;
}

let ride: ActiveRide | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const etaLabel = (km?: number | null, fallbackMin?: number | null): string => {
  const min = etaMinutesFromKm(km) ?? fallbackMin ?? null;
  return min != null ? `${min} min` : '—';
};

const fromServer = (b: ServerAmbulanceBooking): ActiveRide => {
  const pickup =
    b.pickup && (b.pickup.lat || b.pickup.lng)
      ? { lat: b.pickup.lat as number, lng: b.pickup.lng as number, address: b.pickup.address }
      : null;
  const ambulance =
    b.driverLocation && (b.driverLocation.lat || b.driverLocation.lng)
      ? { lat: b.driverLocation.lat as number, lng: b.driverLocation.lng as number }
      : null;
  const km = b.distanceKm ?? calcDistance(pickup, ambulance);
  return {
    bookingId: b._id,
    eta: etaLabel(km, b.etaMinutes),
    driver: b.driver?.name || 'Assigning…',
    vehicleNumber: b.vehicle?.number,
    status: b.status,
    otp: b.otp,
    amount: b.amount ?? b.fareBreakdown?.finalFare ?? null,
    fareBreakdown: b.fareBreakdown ?? null,
    pickup,
    ambulance,
    distanceKm: km,
  };
};

export const rideStore = {
  get: () => ride,

  set(r: ActiveRide | null) {
    ride = r;
    emit();
  },

  /**
   * Fetch the user's current active ride — a booked AmbulanceRequest, or (if
   * none) an admin-dispatched SOS (EmergencyDispatch). Both map to the same
   * tracking card.
   */
  async loadActive() {
    // Fetch both sources. The patient may have a booked AmbulanceRequest AND
    // an admin-dispatched SOS (EmergencyDispatch). Prefer whichever is actually
    // assigned/trackable: an SOS dispatch (with a crew + OTP) must win over a
    // stale SEARCHING request, otherwise the patient stays stuck on "finding an
    // ambulance" and never sees the dispatch or the OTP.
    const [req, sos] = await Promise.all([
      ambulanceApi.active(),
      ambulanceApi.activeSos(),
    ]);
    const isAssigned = (b: ServerAmbulanceBooking | null) => !!b && !!b.driver?.name;
    const b = isAssigned(req) ? req : sos || req;
    ride = b ? fromServer(b) : null;
    emit();
    return ride;
  },

  /** Create a booking and make it the active ride. */
  async book(input: BookAmbulanceInput) {
    const b = await ambulanceApi.book(input);
    ride = fromServer(b);
    emit();
    return b;
  },

  /** Apply a live ambulance position pushed over the socket (recomputes distance). */
  applyLocation(lat: number, lng: number, serverKm?: number | null, serverEtaMin?: number | null) {
    if (!ride) return;
    const ambulance = { lat, lng };
    const km = serverKm ?? calcDistance(ride.pickup ?? null, ambulance);
    ride = { ...ride, ambulance, distanceKm: km, eta: etaLabel(km, serverEtaMin ?? null) };
    emit();
  },

  async cancel(reason?: string) {
    if (ride?.bookingId) await ambulanceApi.cancel(ride.bookingId, reason).catch(() => undefined);
    ride = null;
    emit();
  },

  clear() {
    ride = null;
    emit();
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useActiveRide = (): ActiveRide | null =>
  useSyncExternalStore(rideStore.subscribe, rideStore.get);
