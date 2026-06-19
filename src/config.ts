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


