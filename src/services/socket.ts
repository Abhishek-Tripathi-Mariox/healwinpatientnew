import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { storage } from '../api/storage';

/**
 * Real-time Socket.io client. The backend authenticates via
 * handshake.auth.token and auto-joins `user:<userId>`. We connect after login
 * and disconnect on logout. Screens/stores subscribe to events
 * (booking:status, booking:accepted, ambulance:location, sos:update, …).
 *
 * IMPORTANT: connect() is async (it awaits the stored token before creating
 * the socket). Screens call it as `void connect()` and then synchronously
 * register listeners — at that instant the socket may not exist yet. To avoid
 * a connect/subscribe RACE (where `socket?.on(...)` is a silent no-op and the
 * handler never fires — e.g. the tracking map never moves), we keep a registry
 * of listeners + tracked bookings and (re)bind them on every (re)connect.
 */

let socket: Socket | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();
const tracked = new Set<string>();

const bindAll = () => {
  if (!socket) return;
  listeners.forEach((cbs, event) =>
    cbs.forEach((cb) => {
      socket!.off(event, cb);
      socket!.on(event, cb);
    }),
  );
  // Re-arm live-tracking subscriptions after a (re)connect.
  tracked.forEach((bookingId) => socket!.emit('booking:track:start', { bookingId }));
};

export const socketService = {
  get raw() {
    return socket;
  },

  async connect() {
    const token = await storage.getToken();
    if (!token) return;
    if (socket) {
      if (!socket.connected) socket.connect();
      return;
    }
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
    });
    // Bind any listeners that were registered before the socket existed, and
    // re-bind on every reconnect.
    socket.on('connect', bindAll);
    bindAll();
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
    listeners.clear();
    tracked.clear();
  },

  /** Subscribe to a server event; returns an unsubscribe fn. Safe to call
   *  before connect() resolves — the handler is bound once the socket exists. */
  on(event: string, cb: (data: any) => void): () => void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(cb);
    socket?.off(event, cb);
    socket?.on(event, cb);
    return () => {
      set?.delete(cb);
      socket?.off(event, cb);
    };
  },

  emit(event: string, data?: any) {
    socket?.emit(event, data);
  },

  /** Start receiving live driver-location for a booking. */
  trackBooking(bookingId: string, driverId?: string) {
    tracked.add(bookingId);
    socket?.emit('booking:track:start', { bookingId, driverId });
  },
  stopTrackBooking(bookingId: string, driverId?: string) {
    tracked.delete(bookingId);
    socket?.emit('booking:track:stop', { bookingId, driverId });
  },
};
