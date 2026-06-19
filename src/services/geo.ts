import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { api } from '../api/client';

// Prefer Google Play Services fused location (far more reliable indoors than
// raw GPS) and let the lib handle its own permission prompts as a backup.
try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    locationProvider: 'auto',
  });
} catch {
  /* older lib version — ignore */
}

/**
 * One-shot device location (for capturing the ambulance pickup point) plus a
 * client-side haversine so the tracking screen can recompute the live distance
 * from each incoming ambulance position without a round-trip.
 */

export interface LatLng {
  lat: number;
  lng: number;
  address?: string;
}

const ensurePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    try {
      Geolocation.requestAuthorization();
    } catch {
      /* ignore */
    }
    return true;
  }
  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const getOnce = (highAccuracy: boolean, timeout: number): Promise<LatLng | null> =>
  new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 30000 },
    );
  });

/**
 * Resolve the current position, or null if denied/unavailable (never throws).
 * Tries high-accuracy GPS first, then falls back to network/coarse location —
 * which works indoors and on emulators where pure GPS often times out.
 */
export const getCurrentLocation = async (): Promise<LatLng | null> => {
  const ok = await ensurePermission();
  if (!ok) return null;
  return (await getOnce(true, 8000)) ?? (await getOnce(false, 8000));
};

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km (1 decimal); null if either point is missing/zero. */
export const distanceKm = (a?: LatLng | null, b?: LatLng | null): number | null => {
  if (!a || !b || (!a.lat && !a.lng) || (!b.lat && !b.lng)) return null;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10;
};

/** ~3 min/km city-traffic ETA estimate (min 1). */
export const etaMinutesFromKm = (km?: number | null): number | null =>
  km == null ? null : Math.max(1, Math.ceil(km * 3));

// Project Google API key (already shipped in the app for Maps/Firebase).
const GOOGLE_API_KEY = 'AIzaSyDjzyptw5_51JNh_gk53h1BlrLVvNLxwFk';

/**
 * Best-effort reverse geocode (coords → human address) via Google Geocoding.
 * Returns null on any failure so callers can fall back to showing coordinates —
 * never throws. Requires the Geocoding API to be enabled on the key.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  // Delegate to the structured version (backend SERVER key first, direct
  // Google as fallback) and return its formatted address — so the map's
  // pickup/drop label resolves to a real address, not "Pinned location (…)".
  const parts = await reverseGeocodeParts(lat, lng);
  return parts?.formatted || null;
};

/** Structured address fields parsed from the geocoder's components. */
export interface GeoAddressParts {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  formatted: string;
}

/**
 * Reverse geocode into STRUCTURED fields (city/state/pincode/line1) by reading
 * the geocoder's `address_components` — far more reliable than splitting the
 * formatted string. Returns null on any failure (caller falls back).
 */
export const reverseGeocodeParts = async (
  lat: number,
  lng: number,
): Promise<GeoAddressParts | null> => {
  // Prefer the backend: it uses the SERVER Google key, which (unlike the app's
  // Maps-SDK-restricted key) is allowed to call the Geocoding web service. The
  // direct client call below is just a fallback.
  try {
    const data = await api.get<GeoAddressParts | null>('/patient/geocode/reverse', {
      lat: String(lat),
      lng: String(lng),
    });
    if (data && (data.city || data.state || data.pincode || data.line1)) {
      return {
        line1: data.line1 || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        formatted: data.formatted || '',
      };
    }
  } catch {
    // fall through to the direct call
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`,
    );
    const json = await res.json();
    const result = json?.results?.[0];
    if (!result) return null;
    const comps: Array<{ types?: string[]; long_name?: string }> =
      result.address_components || [];
    const get = (type: string) =>
      comps.find((c) => c.types?.includes(type))?.long_name || '';
    const pincode = get('postal_code');
    const state = get('administrative_area_level_1');
    // In India the town/city is usually `locality`; fall back to the smaller
    // admin areas (level_3, then level_2/district) when locality is absent.
    const city =
      get('locality') ||
      get('administrative_area_level_3') ||
      get('administrative_area_level_2');
    // Street-level line: street number + route, else sublocality/neighborhood.
    const line1 =
      [get('street_number'), get('route') || get('sublocality') || get('neighborhood')]
        .filter(Boolean)
        .join(' ')
        .trim() || result.formatted_address;
    return { line1, city, state, pincode, formatted: result.formatted_address };
  } catch {
    return null;
  }
};

/**
 * A place suggestion for the manual address search box. Carries either a
 * Places `placeId` (resolved later via Place Details) or, when we fall back to
 * the Geocoding API, the coordinates directly.
 */
export interface PlaceSuggestion {
  description: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

/**
 * Forward search for a typed address. Tries Google Places Autocomplete first
 * (best suggestions, needs the Places API enabled on the key); on any failure
 * — including REQUEST_DENIED when Places isn't enabled — it falls back to the
 * Geocoding API (already enabled, used by reverseGeocode). Never throws;
 * returns [] when nothing matches.
 */
export const searchPlaces = async (query: string): Promise<PlaceSuggestion[]> => {
  const q = query.trim();
  if (q.length < 3) return [];

  // 0) Backend (SERVER key) — the app's key can't call the Places/Geocoding web
  // services, so this is the path that actually returns results.
  try {
    const data = await api.get<PlaceSuggestion[]>('/patient/geocode/search', { q });
    if (Array.isArray(data) && data.length) return data;
  } catch {
    /* fall through to the direct calls below */
  }

  // 1) Places Autocomplete (biased to India).
  try {
    const res = await fetch(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
        `?input=${encodeURIComponent(q)}&components=country:in&key=${GOOGLE_API_KEY}`,
    );
    const json = await res.json();
    if (json?.status === 'OK' && Array.isArray(json.predictions)) {
      return json.predictions.map((p: any) => ({
        description: p.description as string,
        placeId: p.place_id as string,
      }));
    }
  } catch {
    /* fall through to geocoding */
  }

  // 2) Fallback: forward geocode the raw text.
  try {
    const res = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json' +
        `?address=${encodeURIComponent(q)}&components=country:IN&key=${GOOGLE_API_KEY}`,
    );
    const json = await res.json();
    if (json?.status === 'OK' && Array.isArray(json.results)) {
      return json.results.slice(0, 5).map((r: any) => ({
        description: r.formatted_address as string,
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
};

/**
 * Resolve a chosen suggestion to coordinates + address. Uses the coords
 * directly if the suggestion already carries them (geocoding fallback),
 * otherwise looks up the Place Details, and as a last resort forward-geocodes
 * the description. Returns null on failure (never throws).
 */
export const resolvePlace = async (s: PlaceSuggestion): Promise<LatLng | null> => {
  if (s.lat != null && s.lng != null) {
    return { lat: s.lat, lng: s.lng, address: s.description };
  }
  // Backend (SERVER key) first — reliable Place Details / forward geocode.
  try {
    const data = await api.get<LatLng | null>('/patient/geocode/resolve', {
      placeId: s.placeId || '',
      description: s.description || '',
    });
    if (data && (data as any).lat != null) {
      return { lat: (data as any).lat, lng: (data as any).lng, address: (data as any).address || s.description };
    }
  } catch {
    /* fall through to the direct calls below */
  }
  if (s.placeId) {
    try {
      const res = await fetch(
        'https://maps.googleapis.com/maps/api/place/details/json' +
          `?place_id=${s.placeId}&fields=formatted_address,geometry&key=${GOOGLE_API_KEY}`,
      );
      const json = await res.json();
      const loc = json?.result?.geometry?.location;
      if (loc) {
        return { lat: loc.lat, lng: loc.lng, address: json.result.formatted_address || s.description };
      }
    } catch {
      /* fall through */
    }
  }
  // Last resort: forward geocode the description string.
  try {
    const res = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json' +
        `?address=${encodeURIComponent(s.description)}&key=${GOOGLE_API_KEY}`,
    );
    const json = await res.json();
    const r = json?.results?.[0];
    if (r?.geometry?.location) {
      return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, address: r.formatted_address || s.description };
    }
  } catch {
    /* ignore */
  }
  return null;
};
