export const CONSENT_STORAGE_KEY = 'erasepaper.cookie-consent.v1';
export const THEME_STORAGE_KEY = 'erasepaper.theme.v1';
export const CONSENT_VERSION = 1;
export const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const THEME_MODES = ['light', 'dark', 'system'];

export const DEFAULT_COOKIE_PREFERENCES = Object.freeze({
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
});

export function normalizeCookiePreferences(value = {}) {
  return {
    necessary: true,
    functional: value.functional === true,
    analytics: value.analytics === true,
    marketing: value.marketing === true,
  };
}

export function createConsentRecord(preferences, now = Date.now()) {
  return {
    version: CONSENT_VERSION,
    savedAt: new Date(now).toISOString(),
    expiresAt: now + CONSENT_LIFETIME_MS,
    preferences: normalizeCookiePreferences(preferences),
  };
}

export function parseConsentRecord(value, now = Date.now()) {
  if (!value) return null;
  try {
    const record = typeof value === 'string' ? JSON.parse(value) : value;
    if (!record || record.version !== CONSENT_VERSION) return null;
    const expiresAt = Number(record.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
    return {
      version: CONSENT_VERSION,
      savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date(now).toISOString(),
      expiresAt,
      preferences: normalizeCookiePreferences(record.preferences),
    };
  } catch {
    return null;
  }
}

export function readConsentRecord(storage, now = Date.now()) {
  try {
    const target = storage || globalThis.localStorage;
    return parseConsentRecord(target?.getItem(CONSENT_STORAGE_KEY), now);
  } catch {
    return null;
  }
}

export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return null;
  try {
    const parsed = new URL(value, 'https://erasepaper.invalid');
    if (parsed.origin !== 'https://erasepaper.invalid') return null;
    if (parsed.pathname.startsWith('/auth/tasks')) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
