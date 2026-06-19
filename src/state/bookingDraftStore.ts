import { useSyncExternalStore } from 'react';

/** A location chosen on the Plan screen for the booking in progress. */
export interface DraftPickup {
  address: string;
  lat?: number;
  lng?: number;
}

// null = use the device's live GPS location as pickup.
let pickup: DraftPickup | null = null;
// Drop-off (destination). null = not set yet (admin/crew can set later too).
let drop: DraftPickup | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const bookingDraftStore = {
  getPickup: () => pickup,

  setPickup(p: DraftPickup | null) {
    pickup = p;
    emit();
  },

  clearPickup() {
    pickup = null;
    emit();
  },

  getDrop: () => drop,

  setDrop(d: DraftPickup | null) {
    drop = d;
    emit();
  },

  clearDrop() {
    drop = null;
    emit();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useDraftPickup = (): DraftPickup | null =>
  useSyncExternalStore(bookingDraftStore.subscribe, bookingDraftStore.getPickup);

export const useDraftDrop = (): DraftPickup | null =>
  useSyncExternalStore(bookingDraftStore.subscribe, bookingDraftStore.getDrop);
