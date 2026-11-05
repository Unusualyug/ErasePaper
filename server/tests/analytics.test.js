import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createMemoryStore } from '../src/repositories/memoryStore.js';
import { seedDemo } from '../src/services/seedDemo.js';
import { createApp } from '../src/app.js';
import { dateKeyInIndia, getAnalyticsRange, normalizePage } from '../src/services/analytics.js';

let store, app, deletion, adminCookie, studentCookie;
const cookieFrom = (response) => response.headers['set-cookie'][0].split(';')[0];
const visitorId = '6c47f1f4-128a-4c02-8bfe-5ce10b071c30';
const sessionId = '25645e44-8b8d-4b90-a015-95ea9a82ed19';
const consentedPayload = (overrides = {}) => ({
  analyticsConsent: true,
  visitorId,
  sessionId,
  path: '/',
  hash: '',
  source: 'direct',
  ...overrides,
});

before(async () => {
  store = createMemoryStore();
  await seedDemo(store);
  ({ app, deletion } = createApp(store));
  adminCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' })
      .expect(200),
  );
  studentCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'aarav.sharma@example.com', password: 'DemoPassword123!' })
      .expect(200),
  );
});

after(() => deletion.stop());

test('analytics ranges use Asia/Kolkata boundaries and constrain custom periods', () => {
  assert.equal(dateKeyInIndia(new Date('2026-01-01T19:00:00.000Z')), '2026-01-02');
  const custom = getAnalyticsRange(
    'custom',
    '2026-11-03',
    '2026-11-03',
    new Date('2026-11-03T12:00:00.000Z'),
  );
  assert.equal(custom.startAt.toISOString(), '2026-11-02T18:30:00.000Z');
  assert.equal(custom.endAt.toISOString(), '2026-11-03T18:29:59.999Z');
  assert.throws(() =>
    getAnalyticsRange('custom', '2026-11-04', '2026-11-03', new Date('2026-11-03T12:00:00.000Z')),
  );
  assert.deepEqual(normalizePage({ path: '/requests/private-student-id' }), {
    key: 'request-details',
    title: 'Request details',
  });
  assert.deepEqual(normalizePage({ path: '/admin/students/private-student-id' }), {
    key: 'admin-student-details',
    title: 'Admin student details',
  });
});

test('analytics collection is consent-gated and reports are admin-only aggregate data', async () => {
  await request(app).get('/api/admin/analytics?range=today').expect(401);
  await request(app).get('/api/admin/analytics?range=today').set('Cookie', studentCookie).expect(403);

  await request(app)
    .post('/api/analytics/heartbeat')
    .send({ ...consentedPayload(), analyticsConsent: false })
    .expect(400);
  assert.equal(store.data.analyticsVisitors.length, 0);
  assert.equal(store.data.analyticsPageViews.length, 0);

  await request(app)
    .post('/api/analytics/page-view')
    .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile')
    .send(consentedPayload({ path: '/requests/private-id-should-not-be-stored', source: 'search' }))
    .expect(204);
  await request(app)
    .post('/api/analytics/page-view')
    .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile')
    .send(consentedPayload({ path: '/sign-up', serviceSlug: 'research-paper', source: 'direct' }))
    .expect(204);

  await request(app)
    .post('/api/analytics/heartbeat')
    .set('Cookie', studentCookie)
    .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36')
    .send(
      consentedPayload({
        visitorId: '7d55c984-4770-4b02-9b3b-0a3a9c80cae9',
        sessionId: '0b58a474-e1e6-45d3-8ad6-27e5c95eecb7',
        path: '/dashboard',
        source: 'direct',
      }),
    )
    .expect(204);
  await request(app)
    .post('/api/analytics/heartbeat')
    .set('Cookie', adminCookie)
    .set('User-Agent', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    .send(
      consentedPayload({
        visitorId: 'ab0cc917-204a-49d9-9104-4a04c4cf2ba4',
        sessionId: '3eea8aab-2e6c-4f25-9eec-f79442fdc7df',
        path: '/admin',
        source: 'referral',
      }),
    )
    .expect(204);

  const response = await request(app)
    .get('/api/admin/analytics?range=today')
    .set('Cookie', adminCookie)
    .expect(200);
  assert.deepEqual(response.body.summary, {
    uniqueVisitors: 3,
    totalSessions: 3,
    pageViews: 2,
    newVisitors: 3,
    returningVisitors: 0,
  });
  assert.deepEqual(response.body.live, {
    total: 3,
    anonymous: 1,
    student: 1,
    admin: 1,
    lastUpdatedAt: response.body.live.lastUpdatedAt,
    timeZone: 'Asia/Kolkata',
  });
  assert.equal(response.body.devices.find((item) => item.device === 'mobile').sessions, 1);
  assert.equal(response.body.devices.find((item) => item.device === 'desktop').sessions, 1);
  assert.equal(response.body.devices.find((item) => item.device === 'tablet').sessions, 1);
  assert.equal(response.body.sources.find((item) => item.source === 'search').sessions, 1);
  assert.equal(response.body.popularPages.find((item) => item.key === 'request-details').pageViews, 1);
  assert.equal(response.body.popularPages.find((item) => item.key === 'research-paper').pageViews, 1);
  assert.equal(
    response.body.popularPages.some((item) => 'uniqueVisitors' in item),
    false,
  );
  assert.equal(response.body.range.timeZone, 'Asia/Kolkata');
  assert.equal(JSON.stringify(response.body).includes(visitorId), false);
  assert.equal(JSON.stringify(response.body).includes('visitorKey'), false);
  const expiredLive = await store.analytics.live(new Date(Date.now() + 76_000));
  assert.equal(expiredLive.total, 0, 'live presence expires automatically after its heartbeat window');

  // Stored page counts are unlinkable daily aggregates; visitor/activity/session records carry no page path.
  assert.equal(store.data.analyticsPageViews.length, 2);
  assert.equal(
    store.data.analyticsPageViews.some((item) => 'visitorKey' in item || 'sessionKey' in item),
    false,
  );
  assert.equal(
    store.data.analyticsSessions.some((item) => 'currentPage' in item || 'entryPage' in item),
    false,
  );
  assert.equal(
    store.data.analyticsActivity.some((item) => 'pageKey' in item),
    false,
  );
  assert.ok(store.data.analyticsVisitors[0].visitorKey !== visitorId);
});

test('withdrawal deletes linked identifiers and blocks later collection while retaining only unlinkable page totals', async () => {
  const id = '89913811-7071-420f-86ed-f8dc9c918736';
  const tab = '3ec79531-5f90-4355-927c-68a6b35ad872';
  await request(app)
    .post('/api/analytics/page-view')
    .send(consentedPayload({ visitorId: id, sessionId: tab, path: '/privacy-policy' }))
    .expect(204);
  const before = store.data.analyticsPageViews.reduce((sum, item) => sum + item.pageViews, 0);
  await request(app).delete('/api/analytics/visitor').send({ visitorId: id }).expect(204);
  const hashedId = store.data.analyticsRevocations[0].visitorKey;
  assert.equal(
    store.data.analyticsVisitors.some((item) => item.visitorKey === hashedId),
    false,
  );
  assert.equal(
    store.data.analyticsSessions.some((item) => item.visitorKey === hashedId),
    false,
  );
  assert.equal(
    store.data.analyticsActivity.some((item) => item.visitorKey === hashedId),
    false,
  );
  assert.equal(
    store.data.analyticsPresence.some((item) => item.visitorKey === hashedId),
    false,
  );

  await request(app)
    .post('/api/analytics/heartbeat')
    .send(consentedPayload({ visitorId: id, sessionId: tab }))
    .expect(204);
  await request(app)
    .post('/api/analytics/page-view')
    .send(consentedPayload({ visitorId: id, sessionId: tab, path: '/requests/private-id' }))
    .expect(204);
  assert.equal(
    store.data.analyticsVisitors.some((item) => item.visitorKey === hashedId),
    false,
  );
  assert.equal(
    store.data.analyticsPageViews.reduce((sum, item) => sum + item.pageViews, 0),
    before,
  );
});

test('custom analytics reports reject malformed or future date ranges', async () => {
  await request(app)
    .get('/api/admin/analytics?range=custom&from=2026-12-01&to=2026-12-02')
    .set('Cookie', adminCookie)
    .expect(400);
  await request(app)
    .get('/api/admin/analytics?range=custom&from=bad&to=bad')
    .set('Cookie', adminCookie)
    .expect(400);
});
