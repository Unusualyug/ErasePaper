import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createMemoryStore } from '../src/repositories/memoryStore.js';
import { seedDemo } from '../src/services/seedDemo.js';
import { createApp } from '../src/app.js';
import { publicRequest, publicUser } from '../src/utils/serializers.js';
import { hashPassword, verifyPassword } from '../src/utils/passwords.js';

let store,
  app,
  auth,
  deletion,
  studentCookie,
  otherCookie,
  adminCookie,
  student,
  other,
  admin,
  createdRequest;
const cookieFrom = (response) => response.headers['set-cookie'][0].split(';')[0];
before(async () => {
  store = createMemoryStore();
  await seedDemo(store);
  ({ app, auth, deletion } = createApp(store));
  student = await store.users.findByUsernameNormalized('student_demo');
  other = await store.users.findByUsernameNormalized('student_2');
  admin = await store.users.findByUsernameNormalized('admin_demo');
  studentCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'aarav.sharma@example.com', password: 'DemoPassword123!' })
      .expect(200),
  );
  otherCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya.patel@example.com', password: 'DemoPassword123!' })
      .expect(200),
  );
  adminCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'DemoPassword123!' })
      .expect(200),
  );
});
after(() => deletion.stop());

test('public configuration is explicitly demo, with all five services', async () => {
  const config = await request(app).get('/api/config').expect(200);
  assert.equal(config.body.mode, 'demo');
  const services = await request(app).get('/api/services').expect(200);
  assert.equal(services.body.services.length, 5);
});
test('public demo access is student-only and rejects an Admin persona selector', async () => {
  await request(app).post('/api/auth/demo/quick').send({ persona: 'admin' }).expect(400);
  const studentDemo = await request(app)
    .post('/api/auth/demo/quick')
    .send({ persona: 'student' })
    .expect(200);
  assert.equal(studentDemo.body.user.role, 'student');
  await request(app).post('/api/auth/logout').set('Cookie', cookieFrom(studentDemo)).expect(200);
});
test('protected APIs reject unauthenticated requests', async () => {
  await request(app).get('/api/me').expect(401);
  await request(app).get('/api/me').set('Authorization', 'Bearer not-a-session').expect(401);
  await request(app).get('/api/admin/overview').expect(401);
  await request(app).get('/api/admin/students').expect(401);
});
test('API responses, including private records and auth errors, are not cacheable', async () => {
  const responses = await Promise.all([
    request(app).get('/api/health').expect(200),
    request(app).get('/api/me').set('Cookie', studentCookie).expect(200),
    request(app).get('/api/admin/overview').set('Cookie', adminCookie).expect(200),
    request(app).get('/api/me').expect(401),
    request(app).get('/api/health').set('Origin', 'https://unapproved.example').expect(403),
  ]);
  for (const response of responses) assert.equal(response.headers['cache-control'], 'no-store');
});
test('large API text payloads use negotiated gzip compression', async () => {
  const response = await request(app)
    .get('/api/admin/overview')
    .set('Cookie', adminCookie)
    .set('Accept-Encoding', 'gzip')
    .expect(200);
  assert.equal(response.headers['content-encoding'], 'gzip');
  assert.match(response.headers.vary, /Accept-Encoding/i);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.body.stats.students, 24);
});
test('a student cannot access admin APIs or escalate through profile fields', async () => {
  await request(app).get('/api/admin/overview').set('Cookie', studentCookie).expect(403);
  await request(app).get('/api/admin/requests').set('Cookie', studentCookie).expect(403);
  await request(app)
    .patch('/api/me')
    .set('Cookie', studentCookie)
    .send({ fullName: 'Aarav Sharma', role: 'admin' })
    .expect(400);
  assert.equal((await store.users.findById(student._id)).role, 'student');
});
test('registration requires email and sign-in is email-only with an HTTP-only cookie', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'missing_email', phoneNumber: '+919123456700', password: 'Long-Unique-Test-2026!' })
    .expect(400);

  const created = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'Test.User',
      email: 'test.user@example.com',
      phoneNumber: '+919123456701',
      password: 'Long-Unique-Test-2026!',
    })
    .expect(201);
  assert.equal(created.body.mode, 'demo');
  assert.equal(created.body.user.username, 'Test.User');
  assert.equal(created.body.user.email, 'test.user@example.com');
  assert.equal(created.body.user.fullName, 'Test.User');
  assert.equal(created.body.user.phoneNumber, '+919123456701');
  assert.equal(created.body.user.role, 'student');
  const setCookie = created.headers['set-cookie'][0];
  assert.match(setCookie, /^ep_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.doesNotMatch(setCookie, /Secure/i, 'the local demo is served over HTTP');
  const sessionCookie = cookieFrom(created);
  const registered = await store.users.findByUsernameNormalized('test.user');
  assert.equal(registered.emailNormalized, 'test.user@example.com');
  assert.notEqual(registered.passwordHash, 'Long-Unique-Test-2026!');
  assert.equal(await verifyPassword('Long-Unique-Test-2026!', registered.passwordHash), true);
  assert.equal(
    (await request(app).get('/api/me').set('Cookie', sessionCookie).expect(200)).body.user.username,
    'Test.User',
  );

  const signedIn = await request(app)
    .post('/api/auth/login')
    .send({ email: 'TEST.USER@EXAMPLE.COM', password: 'Long-Unique-Test-2026!' })
    .expect(200);
  assert.equal(signedIn.body.user.id, created.body.user.id);
  await request(app)
    .post('/api/auth/login')
    .send({ username: 'Test.User', password: 'Long-Unique-Test-2026!' })
    .expect(400);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'test.user@example.com', password: 'wrong password' })
    .expect(401);
  await request(app)
    .post('/api/auth/register')
    .send({
      username: 'test.user',
      email: 'duplicate.username@example.com',
      phoneNumber: '+919123456702',
      password: 'Another-Unique-2026!',
    })
    .expect(409);
  const sharedMobileAccount = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'another_user',
      email: 'duplicate.phone@example.com',
      phoneNumber: '+919123456701',
      password: 'Another-Unique-2026!',
    })
    .expect(201);
  assert.equal(sharedMobileAccount.body.user.phoneNumber, '+919123456701');
  assert.equal(sharedMobileAccount.body.user.email, 'duplicate.phone@example.com');
  await request(app)
    .post('/api/auth/register')
    .send({
      username: 'another_email_user',
      email: 'TEST.USER@EXAMPLE.COM',
      phoneNumber: '+919123456706',
      password: 'Another-Unique-2026!',
    })
    .expect(409);
  await request(app)
    .post('/api/auth/register')
    .send({
      username: 'admin_claim',
      email: 'admin.claim@example.com',
      phoneNumber: '+919123456703',
      password: 'Another-Unique-2026!',
      role: 'admin',
    })
    .expect(400);
  const sevenCharacterAccount = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'seven_char',
      email: 'seven.char@example.com',
      phoneNumber: '+919123456705',
      password: 'T7!qX4b',
    })
    .expect(201);
  assert.equal(sevenCharacterAccount.body.user.role, 'student');
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'seven.char@example.com', password: 'T7!qX4b' })
    .expect(200);
  await request(app)
    .post('/api/auth/register')
    .send({
      username: 'six_char',
      email: 'six.char@example.com',
      phoneNumber: '+919123456704',
      password: '123456',
    })
    .expect(400);
  const logout = await request(app).post('/api/auth/logout').set('Cookie', cookieFrom(signedIn)).expect(200);
  assert.match(logout.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970/i);
  await request(app).get('/api/me').set('Cookie', cookieFrom(signedIn)).expect(401);
  await request(app).post('/api/demo/start').send({}).expect(401);
  await request(app).post('/api/demo/verify').send({}).expect(401);
  await request(app).post('/api/webhooks/clerk').send({}).expect(401);
});
test('an active legacy account can add an email before its next email-only sign-in', async () => {
  const password = 'Legacy-Account-Test-2026!';
  const legacy = await store.users.create({
    username: 'legacy_user',
    usernameNormalized: 'legacy_user',
    passwordHash: await hashPassword(password),
    fullName: 'Legacy User',
    phoneNumber: '+919123456707',
  });
  assert.equal(legacy.email, '');

  let legacyCookie = '';
  await auth.createSession(legacy, {
    cookie(name, token) {
      legacyCookie = `${name}=${token}`;
    },
  });
  await request(app).post('/api/auth/login').send({ email: 'legacy@example.com', password }).expect(401);
  await request(app)
    .patch('/api/me')
    .set('Cookie', legacyCookie)
    .send({ fullName: 'Legacy User', email: 'aarav.sharma@example.com' })
    .expect(409);

  const profile = await request(app)
    .patch('/api/me')
    .set('Cookie', legacyCookie)
    .send({ fullName: 'Legacy User', email: 'Legacy@Example.com' })
    .expect(200);
  assert.equal(profile.body.user.email, 'Legacy@Example.com');
  assert.equal((await store.users.findById(legacy._id)).emailNormalized, 'legacy@example.com');
  await request(app).post('/api/auth/login').send({ email: 'LEGACY@EXAMPLE.COM', password }).expect(200);
});
test('dynamic service requirements are validated server-side', async () => {
  const payload = {
    serviceSlug: 'final-year-project',
    title: 'Smart campus project mentoring',
    description: 'I need implementation guidance and help preparing my own technical documentation.',
    integrityAcknowledged: true,
    details: { branch: 'Computer Engineering', college: 'Test University', projectStage: 'Implementation' },
  };
  const result = await request(app)
    .post('/api/requests')
    .set('Cookie', studentCookie)
    .send(payload)
    .expect(201);
  createdRequest = result.body.request;
  assert.equal(createdRequest.status, 'Pending');
  assert.ok(createdRequest.requestId.startsWith('EP-'));
  assert.equal(createdRequest.adminNotes, undefined);
  await request(app)
    .post('/api/requests')
    .set('Cookie', studentCookie)
    .send({ ...payload, details: {} })
    .expect(400);
  await request(app)
    .post('/api/requests')
    .set('Cookie', studentCookie)
    .send({ ...payload, integrityAcknowledged: false })
    .expect(400);
  await request(app)
    .post('/api/requests')
    .set('Cookie', studentCookie)
    .send({ ...payload, serviceSlug: 'unknown-service' })
    .expect(400);
});
test('students can read only their own requests and requirements', async () => {
  const mine = await request(app).get('/api/requests?limit=100').set('Cookie', studentCookie).expect(200);
  assert.ok(mine.body.items.every((r) => r.userId === String(student._id)));
  assert.ok(mine.body.items.every((r) => r.adminNotes === undefined));
  await request(app).get(`/api/requests/${createdRequest.id}`).set('Cookie', otherCookie).expect(404);
  await request(app).get(`/api/admin/students/${student._id}`).set('Cookie', otherCookie).expect(403);
});
test('admins can search and paginate students, and update requests with private notes', async () => {
  const search = await request(app)
    .get('/api/admin/students?search=Priya&limit=1')
    .set('Cookie', adminCookie)
    .expect(200);
  assert.equal(search.body.total, 1);
  assert.equal(search.body.items[0].fullName, 'Priya Patel');
  const result = await request(app)
    .patch(`/api/admin/requests/${createdRequest.id}`)
    .set('Cookie', adminCookie)
    .send({ status: 'In Progress', adminNotes: 'Private follow-up notes.' })
    .expect(200);
  assert.equal(result.body.request.status, 'In Progress');
  const own = await request(app)
    .get(`/api/requests/${createdRequest.id}`)
    .set('Cookie', studentCookie)
    .expect(200);
  assert.equal(own.body.request.adminNotes, undefined);
  const notes = await request(app).get('/api/notifications').set('Cookie', studentCookie).expect(200);
  assert.ok(notes.body.items.some((n) => n.relatedRequestId === createdRequest.id && n.type === 'status'));
  const otherNotes = await request(app).get('/api/notifications').set('Cookie', otherCookie).expect(200);
  assert.ok(otherNotes.body.items.every((n) => n.relatedRequestId !== createdRequest.id));
});
test('private attachment upload and ownership-protected download work', async () => {
  const result = await request(app)
    .post('/api/requests')
    .set('Cookie', studentCookie)
    .field('serviceSlug', 'research-paper')
    .field('title', 'Editing guidance for research draft')
    .field(
      'description',
      'Please review the structure of my draft and suggest improvements to the methodology.',
    )
    .field('integrityAcknowledged', 'true')
    .field('details', JSON.stringify({ researchArea: 'Computer science', researchStage: 'Draft ready' }))
    .attach('attachments', Buffer.from('Illustrative test requirements.'), {
      filename: 'requirements.txt',
      contentType: 'text/plain',
    })
    .expect(201);
  const item = result.body.request;
  assert.equal(item.attachments.length, 1);
  assert.equal(item.attachments[0].storageName, undefined);
  const path = `/api/requests/${item.id}/attachments/${item.attachments[0].id}`;
  await request(app).get(path).set('Cookie', otherCookie).expect(404);
  const file = await request(app).get(path).set('Cookie', studentCookie).expect(200);
  assert.match(file.headers['content-disposition'], /attachment/);
  await request(app)
    .post('/api/requests')
    .set('Cookie', studentCookie)
    .field('serviceSlug', 'research-paper')
    .field('title', 'Invalid file test')
    .field('description', 'Testing that executable files cannot be uploaded to the service.')
    .field('integrityAcknowledged', 'true')
    .field('details', JSON.stringify({ researchArea: 'Testing', researchStage: 'Draft ready' }))
    .attach('attachments', Buffer.from('executable'), {
      filename: 'payload.exe',
      contentType: 'application/octet-stream',
    })
    .expect(400);
});
test('profile email changes enforce uniqueness and cannot clear an email used for sign-in', async () => {
  await store.passwordResetTokens.replaceForUser(other._id, {
    tokenHash: 'e'.repeat(64),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000),
  });
  await request(app)
    .patch('/api/me')
    .set('Cookie', otherCookie)
    .send({ fullName: other.fullName, email: 'new.address@example.com' })
    .expect(200);
  assert.equal((await store.users.findById(other._id)).email, 'new.address@example.com');
  assert.equal((await store.users.findById(other._id)).emailNormalized, 'new.address@example.com');
  assert.equal(
    store.data.passwordResetTokens.some((token) => String(token.userId) === String(other._id)),
    false,
    'changing a sign-in email invalidates any existing reset link',
  );
  await request(app)
    .patch('/api/me')
    .set('Cookie', otherCookie)
    .send({ fullName: other.fullName, email: '' })
    .expect(400);
  await request(app)
    .post('/api/me/demo-email-verification')
    .set('Cookie', otherCookie)
    .send({ code: '123456' })
    .expect(404);
});
test('account deletion requires exact confirmation and protects admins', async () => {
  await request(app)
    .delete(`/api/admin/students/${other._id}`)
    .set('Cookie', adminCookie)
    .send({ confirmation: 'Wrong Name' })
    .expect(400);
  assert.ok(await store.users.findById(other._id));
  await request(app)
    .delete(`/api/admin/students/${admin._id}`)
    .set('Cookie', adminCookie)
    .send({ confirmation: admin.fullName })
    .expect(403);
});
test('secure deletion removes records, blocks old sessions, and keeps non-PII audit trail', async () => {
  const previousRequests = await store.requests.allForUser(other._id);
  await store.passwordResetTokens.replaceForUser(other._id, {
    tokenHash: 'f'.repeat(64),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000),
  });
  const result = await request(app)
    .delete(`/api/admin/students/${other._id}`)
    .set('Cookie', adminCookie)
    .send({ confirmation: other.fullName })
    .expect(200);
  assert.equal(result.body.status, 'completed');
  assert.equal(await store.users.findById(other._id), null);
  assert.equal((await store.requests.allForUser(other._id)).length, 0);
  assert.equal(
    store.data.passwordResetTokens.some((token) => String(token.userId) === String(other._id)),
    false,
    'account deletion removes pending reset links',
  );
  await request(app).get('/api/me').set('Cookie', otherCookie).expect(401);
  assert.equal(
    store.data.sessions.some((session) => String(session.userId) === String(other._id)),
    false,
  );
  const logs = await store.logs.list(100);
  assert.ok(logs.some((l) => l.action === 'student.deleted' && l.targetId === other.studentId));
  assert.ok(!JSON.stringify(logs).includes(other.phoneNumber));
  assert.ok(!JSON.stringify(logs).includes(other.email));
  const notes = await store.notifications.list({ role: 'admin' });
  assert.ok(
    notes.items.every(
      (n) =>
        n.relatedUserId !== String(other._id) &&
        !previousRequests.some((r) => String(r._id) === n.relatedRequestId),
    ),
  );
});
test('serializers never expose password hashes or attachment storage keys', () => {
  const user = publicUser({ ...student, passwordHash: 'secret' });
  assert.equal(user.passwordHash, undefined);
  const item = publicRequest({
    ...createdRequest,
    attachments: [{ id: 'x', name: 'x.txt', storageName: 'private.txt' }],
  });
  assert.equal(item.body, undefined);
  assert.equal(item.attachments[0].storageName, undefined);
});
