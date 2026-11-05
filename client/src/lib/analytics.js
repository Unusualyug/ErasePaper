const VISITOR_KEY = 'ep.analytics.visitor.v1';
const SESSION_KEY = 'ep.analytics.session.v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SERVICE_SLUGS = new Set([
  'literature-review',
  'research-paper',
  'survey-paper',
  'final-year-project',
  'bulk-printing',
]);

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function storedId(storageName, key) {
  try {
    const value = typeof window === 'undefined' ? null : window[storageName]?.getItem(key);
    return value && UUID_RE.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function readAnalyticsIds() {
  return {
    visitorId: storedId('localStorage', VISITOR_KEY),
    sessionId: storedId('sessionStorage', SESSION_KEY),
  };
}

export function getOrCreateAnalyticsIds() {
  let { visitorId, sessionId } = readAnalyticsIds();
  if (!visitorId) {
    visitorId = createId();
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(VISITOR_KEY, visitorId);
    } catch {
      // The tracker keeps this identifier in memory for the current page when storage is blocked.
    }
  }
  if (!sessionId) {
    sessionId = createId();
    try {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_KEY, sessionId);
    } catch {
      // The tracker keeps this identifier in memory for the current page when storage is blocked.
    }
  }
  return { visitorId, sessionId };
}

export function createAnalyticsSessionId() {
  const sessionId = createId();
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    // The tracker keeps the rotated ID in memory for the current page if storage is blocked.
  }
  return sessionId;
}

export function clearAnalyticsIds(expectedVisitorId, expectedSessionId) {
  try {
    if (
      typeof window !== 'undefined' &&
      (!expectedVisitorId || window.localStorage.getItem(VISITOR_KEY) === expectedVisitorId)
    )
      window.localStorage.removeItem(VISITOR_KEY);
  } catch {
    // Browser storage may have become unavailable after the user's choice changed.
  }
  try {
    if (
      typeof window !== 'undefined' &&
      (!expectedSessionId || window.sessionStorage.getItem(SESSION_KEY) === expectedSessionId)
    )
      window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // The page-local identifiers are already discarded by the tracker when consent is withdrawn.
  }
}

export function normalizedAnalyticsPath(pathname = '/') {
  if (/^\/requests\/[^/]+/.test(pathname)) return '/requests/:id';
  if (/^\/admin\/students\/[^/]+/.test(pathname)) return '/admin/students/:id';
  return pathname.startsWith('/') ? pathname.slice(0, 300) : '/';
}

export function safeAnalyticsHash(hash = '') {
  const value = String(hash).replace(/^#/, '').toLowerCase();
  return ['services', 'how-it-works', 'why-us', 'faqs'].includes(value) ? `#${value}` : '';
}

export function serviceSlugFromSearch(search = '') {
  const value = new URLSearchParams(search).get('service');
  return SERVICE_SLUGS.has(value) ? value : undefined;
}

export function classifyTrafficSource(referrer = '', currentHost = '') {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host === currentHost.toLowerCase().replace(/^www\./, '')) return 'direct';
    if (/google\.|bing\.com$|search\.yahoo\.|duckduckgo\.com$|baidu\.com$|yandex\./.test(host))
      return 'search';
    if (
      /facebook\.com$|instagram\.com$|linkedin\.com$|tiktok\.com$|x\.com$|twitter\.com$|youtube\.com$|reddit\.com$|pinterest\./.test(
        host,
      )
    )
      return 'social';
    return 'referral';
  } catch {
    return 'unknown';
  }
}
