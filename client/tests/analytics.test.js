import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTrafficSource,
  createAnalyticsSessionId,
  getOrCreateAnalyticsIds,
  normalizedAnalyticsPath,
  safeAnalyticsHash,
  serviceSlugFromSearch,
  readAnalyticsIds,
} from '../src/lib/analytics.js';

test('analytics helpers collapse dynamic paths and keep only approved service/anchor categories', () => {
  assert.equal(normalizedAnalyticsPath('/requests/EP-2026-ABCD?secret=1'), '/requests/:id');
  assert.equal(normalizedAnalyticsPath('/admin/students/legacy-account-id'), '/admin/students/:id');
  assert.equal(serviceSlugFromSearch('?service=research-paper'), 'research-paper');
  assert.equal(serviceSlugFromSearch('?service=unknown&email=private@example.com'), undefined);
  assert.equal(safeAnalyticsHash('#services'), '#services');
  assert.equal(safeAnalyticsHash('#reset-password?token=private'), '');
});

test('analytics source classification stores categories rather than referrer URLs', () => {
  assert.equal(classifyTrafficSource('', 'erasepaper.example'), 'direct');
  assert.equal(
    classifyTrafficSource('https://www.google.com/search?q=private', 'erasepaper.example'),
    'search',
  );
  assert.equal(classifyTrafficSource('https://instagram.com/profile', 'erasepaper.example'), 'social');
  assert.equal(
    classifyTrafficSource('https://university.example/path?private=1', 'erasepaper.example'),
    'referral',
  );
  assert.deepEqual(readAnalyticsIds(), { visitorId: null, sessionId: null });
});

test('analytics visitor and session identifiers are random UUIDs, not authentication tokens', () => {
  const ids = getOrCreateAnalyticsIds();
  assert.match(ids.visitorId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.match(ids.sessionId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(ids.visitorId, ids.sessionId);
  assert.match(
    createAnalyticsSessionId(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test('session rotation changes only the tab-scoped session identifier', () => {
  const originalWindow = globalThis.window;
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = { localStorage: storage, sessionStorage: storage };
  try {
    const first = getOrCreateAnalyticsIds();
    const nextSession = createAnalyticsSessionId();
    assert.notEqual(nextSession, first.sessionId);
    assert.deepEqual(readAnalyticsIds(), { visitorId: first.visitorId, sessionId: nextSession });
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
