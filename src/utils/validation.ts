/**
 * Shared input validation/sanitisation helpers so name & mobile rules are
 * identical everywhere.
 */

/** Strip everything except digits; cap length (default 10 for Indian mobiles). */
export const onlyDigits = (s: string, max = 10): string =>
  (s || '').replace(/\D/g, '').slice(0, max);

/** A valid display name: letters/spaces/.'- only, starts with a letter, ≥2 chars. */
export const isValidName = (s: string): boolean => {
  const t = (s || '').trim();
  return t.length >= 2 && /^[A-Za-z][A-Za-z .'-]*$/.test(t);
};

export const NAME_ERROR = 'Enter a valid name (letters only, at least 2 characters).';

/** A valid Indian mobile: exactly 10 digits starting 6-9. */
export const isValidMobile = (s: string): boolean => /^[6-9]\d{9}$/.test(onlyDigits(s));

export const MOBILE_ERROR = 'Enter a valid 10-digit mobile number (starting 6-9).';

/**
 * Format a phone for display as "+<cc> <10 digits>". Robust to:
 *  - country code with/without "+",
 *  - a mobile number that ALREADY embeds the country code (avoids "+9191…"),
 *  - missing country code (defaults to +91).
 */
export const formatPhone = (countryCode?: string | null, mobile?: string | null): string => {
  const mob = onlyDigits(String(mobile || ''), 20);
  if (!mob) return '';
  let code = String(countryCode || '').replace(/\D/g, '');
  let digits = mob;
  // Strip an embedded country-code prefix so we don't show it twice.
  if (code && digits.length > 10 && digits.startsWith(code)) digits = digits.slice(code.length);
  const local = digits.slice(-10);
  if (!code) code = '91';
  return `+${code} ${local}`;
};
