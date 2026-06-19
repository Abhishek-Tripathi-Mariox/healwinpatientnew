import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { storage } from '../api/storage';

/**
 * Real-time Socket.io client. The backend authenticates via
 * handshake.auth.token and auto-joins `user:<userId>`. We connect after login
 * and disconnect on logout. Screens/stores subscribe to events
 * (booking:status, booking:accepted, driver:location, sos:update, …).
 */

let socket: Socket | null = null;

export const socketService = {
  get raw() {
    return socket;
  },

  async connect() {
    const token = await storage.getToken();
    if (!token) return;
    if (socket?.connected) return;
    socket?.disconnect();
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
    });
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
  },

  /** Subscribe to a server event; returns an unsubscribe fn. */
  on(event: string, cb: (data: any) => void): () => void {
    socket?.on(event, cb);
    return () => socket?.off(event, cb);
  },

  emit(event: string, data?: any) {
    socket?.emit(event, data);
  },

  /** Start receiving live driver-location for a booking. */
  trackBooking(bookingId: string, driverId?: string) {
    socket?.emit('booking:track:start', { bookingId, driverId });
  },
  stopTrackBooking(bookingId: string, driverId?: string) {
    socket?.emit('booking:track:stop', { bookingId, driverId });
  },
};
