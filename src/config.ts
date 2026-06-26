/**
 * App configuration. The API base URL switches between the local backend (dev)
 * and production. On Android the emulator reaches the host machine via
 * 10.0.2.2 (not localhost); change DEV_HOST if you run on a real device on the
 * same LAN (use your machine's LAN IP, e.g. http://192.168.1.4:9050/v1/api).
 */

//export const API_BASE_URL = 'http://10.0.2.2:9050/v1/api';
export const API_BASE_URL = 'https://apis.healwin.in/v1/api';


// Socket base (live tracking / booking rooms) — same host without the /v1/api suffix.
//export const SOCKET_URL = 'http://10.0.2.2:9050';
export const SOCKET_URL = 'https://apis.healwin.in';

/** The API server origin (no /v1/api) — used to resolve served file URLs. */
export const API_ORIGIN = SOCKET_URL;

/**
 * Resolve a server-served file URL (family/profile photos, records).
 *
 * The backend builds these from req.get('host'); behind a reverse proxy that
 * can come out as an INTERNAL host (e.g. localhost:9050), which is unreachable
 * from the device — so the <Image> just renders blank. We re-base any
 * `/uploads/...` URL onto the app's own API origin (and prepend it to relative
 * paths). External URLs (http links, data URIs) pass through untouched.
 */
export const resolveUploadUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  const i = u.indexOf('/uploads/');
  if (i >= 0) return `${API_ORIGIN}${u.slice(i)}`;
  return u;
};


