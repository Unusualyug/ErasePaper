import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_LIFETIME_MS,
  CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_PREFERENCES,
  createConsentRecord,
  normalizeCookiePreferences,
  parseConsentRecord,
  readConsentRecord,
  safeReturnPath,
} from '../src/lib/preferences.js';

test('necessary consent is always on and optional categories default off', () => {
  assert.deepEqual(normalizeCookiePreferences({ necessary: false, functional: 1, analytics: true }), {
    necessary: true,
    functional: false,
    analytics: true,
    marketing: false,
  });
  assert.deepEqual(normalizeCookiePreferences(DEFAULT_COOKIE_PREFERENCES), DEFAULT_COOKIE_PREFERENCES);
});

test('consent records expire and invalid or old versions require renewed consent', () => {
  const savedAt = Date.UTC(2026, 10, 3);
  const record = createConsentRecord({ functional: true }, savedAt);
  assert.equal(record.expiresAt, savedAt + CONSENT_LIFETIME_MS);
  assert.equal(parseConsentRecord(record, savedAt + 1).preferences.functional, true);
  assert.equal(parseConsentRecord(record, record.expiresAt), null);
  assert.equal(parseConsentRecord({ ...record, version: 999 }, savedAt), null);
  assert.equal(parseConsentRecord('{bad json', savedAt), null);
  assert.equal(CONSENT_STORAGE_KEY, 'erasepaper.cookie-consent.v1');
});

test('consent storage reads defensively and invalid JSON behaves as no saved choice', () => {
  const record = createConsentRecord({ functional: true }, 1000);
  const storage = { getItem: (key) => (key === CONSENT_STORAGE_KEY ? JSON.stringify(record) : null) };
  assert.equal(readConsentRecord(storage, 1001).preferences.functional, true);
  assert.equal(readConsentRecord({ getItem: () => '{bad json' }, 1001), null);
  assert.equal(
    readConsentRecord(
      {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      1001,
    ),
    null,
  );
});

test('return destinations allow safe in-app paths but reject external and auth-task redirects', () => {
  assert.equal(safeReturnPath('/admin/students?page=2'), '/admin/students?page=2');
  assert.equal(
    safeReturnPath('/requests/new?service=research-paper'),
    '/requests/new?service=research-paper',
  );
  assert.equal(safeReturnPath('https://attacker.test/'), null);
  assert.equal(safeReturnPath('//attacker.test/'), null);
  assert.equal(safeReturnPath('/\\\\attacker.test/'), null);
  assert.equal(safeReturnPath('/auth/tasks'), null);
  assert.equal(safeReturnPath('/auth/tasks?step=1'), null);
});
