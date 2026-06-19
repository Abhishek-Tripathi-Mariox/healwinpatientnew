import { API_BASE_URL } from '../config';
import { storage } from './storage';

/**
 * Thin HTTP client for the HealWin backend.
 *
 * The backend returns two response shapes depending on the route:
 *   • { code, message, data }   (auth, HMS, newer routes — code 1 = success)
 *   • { success, message, data } (some user routes)
 * `request` normalizes both: it returns `data` on success and throws an
 * `ApiError` (with the server message) otherwise. The Bearer token is attached
 * automatically for authed calls.
 */

export class ApiError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Set by the auth store so a 401 / code-3 anywhere forces a clean sign-out.
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (fn: () => void) => {
  onUnauthorized = fn;
};

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  auth?: boolean; // attach Bearer token (default true)
  isForm?: boolean; // body is FormData (multipart upload)
  query?: Record<string, string | number | boolean | undefined>;
}

const buildQuery = (q?: RequestOptions['query']): string => {
  if (!q) return '';
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export async function request<T = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, isForm = false, query } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await storage.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Abort hung requests so a slow/unreachable server can never trap the UI
  // (e.g. the splash waiting on a stale-token profile fetch).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new ApiError(
      e?.name === 'AbortError'
        ? 'Request timed out — please check your connection and that the server is reachable.'
        : 'Network error — please check your connection and that the server is reachable.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  // Parse JSON (some endpoints — e.g. PDFs — won't be JSON; those use raw fetch).
  let json: any = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  const code: number | undefined = json?.code;
  const ok =
    res.ok && (code === undefined ? json?.success !== false : code === 1);

  if (!ok) {
    const message =
      json?.message || `Request failed (${res.status})`;
    if (res.status === 401 || code === 3) {
      onUnauthorized?.();
    }
    throw new ApiError(message, res.status, code);
  }

  return (json?.data ?? json) as T;
}

/** Convenience verb helpers. */
export const api = {
  get: <T = any>(path: string, query?: RequestOptions['query'], auth = true) =>
    request<T>(path, { method: 'GET', query, auth }),
  post: <T = any>(path: string, body?: any, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  put: <T = any>(path: string, body?: any, auth = true) =>
    request<T>(path, { method: 'PUT', body, auth }),
  del: <T = any>(path: string, auth = true) =>
    request<T>(path, { method: 'DELETE', auth }),
  upload: <T = any>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST') =>
    request<T>(path, { method, body: form, isForm: true }),
};
