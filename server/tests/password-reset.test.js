import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import request from 'supertest';
import config from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createMemoryStore } from '../src/repositories/memoryStore.js';
import { hashPassword, verifyPassword } from '../src/utils/passwords.js';

let app;
let store;
let deletion;
let oldDemo;
let oldApiKey;
let originalFetch;
let outboundEmails;
let user;
let originalSessionCookie;
let secondSessionCookie;

const cookieFrom = (response) => response.headers['set-cookie'][0].split(';')[0];
const strongNewPassword = 'New-Recovery-Password-2026!';

before(async () => {
  oldDemo = config.demo;
  oldApiKey = config.resendApiKey;
  originalFetch = globalThis.fetch;
  config.demo = false;
  config.resendApiKey = 'test-only-resend-key';
  outboundEmails = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    outboundEmails.push(JSON.parse(options.body));
    return { ok: true, status: 200 };
  };

  store = createMemoryStore();
  const { app: testApp, deletion: testDeletion } = createApp(store);
  app = testApp;
  deletion = testDeletion;
  user = await store.users.create({
    username: 'recovery_user',
    usernameNormalized: 'recovery_user',
    passwordHash: await hashPassword('Old-Recovery-Password-2026!'),
    fullName: 'Recovery User',
    phoneNumber: '+919876543210',
    email: 'recovery@example.com',
    emailNormalized: 'recovery@example.com',
    role: 'student',
    state: 'active',
  });

  originalSessionCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Old-Recovery-Password-2026!' })
      .expect(200),
  );
  secondSessionCookie = cookieFrom(
    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Old-Recovery-Password-2026!' })
      .expect(200),
  );
});

after(async () => {
  deletion?.stop();
  config.demo = oldDemo;
  config.resendApiKey = oldApiKey;
  globalThis.fetch = originalFetch;
});

async function requestReset(email = user.email) {
  const response = await request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
  assert.equal(
    response.body.message,
    'If an account exists for that email, we will send a password reset link shortly.',
  );
  return response;
}

function latestResetToken() {
  const email = outboundEmails.at(-1);
  assert.ok(email, 'a reset email should have been sent through the HTTPS Resend client');
  assert.equal(email.subject, 'Reset your ErasePaper password');
  assert.match(email.from, /notifications@mail\.erasepaper\.online/i);
  assert.match(email.html, /Reset your password/);
  assert.match(email.html, /20 minutes/);
  const urlMatch = email.text.match(/https?:\/\/[^\s]+/);
  assert.ok(urlMatch, 'the reset email should include a link');
  const url = new URL(urlMatch[0]);
  assert.equal(url.pathname, '/reset-password');
  const token = url.searchParams.get('token');
  assert.ok(token);
  assert.equal(token.length, 43, 'a cryptographically strong 32-byte base64url token is used');
  return token;
}

test('password recovery is non-enumerating and reset links are hashed, expiring, single-use, and revoke sessions', async () => {
  const unknownResponse = await requestReset('no-account@example.com');
  assert.equal(outboundEmails.length, 0, 'unknown addresses never receive email');

  await request(app).get('/api/me').set('Cookie', originalSessionCookie).expect(200);
  await request(app).get('/api/me').set('Cookie', secondSessionCookie).expect(200);

  const knownResponse = await requestReset('RECOVERY@example.com');
  assert.deepEqual(
    knownResponse.body,
    unknownResponse.body,
    'known and unknown addresses have the same response',
  );
  assert.equal(outboundEmails.length, 1);
  let rawToken = latestResetToken();

  const storedToken = store.data.passwordResetTokens[0];
  assert.equal(store.data.passwordResetTokens.length, 1);
  assert.equal(storedToken.userId, user._id);
  assert.notEqual(storedToken.tokenHash, rawToken, 'only a digest is stored');
  assert.equal(storedToken.tokenHash, createHash('sha256').update(rawToken).digest('hex'));
  assert.equal(new Date(storedToken.expiresAt).getTime() - Date.now() <= 20 * 60 * 1000, true);
  assert.equal(new Date(storedToken.expiresAt).getTime() - Date.now() > 19 * 60 * 1000, true);

  await request(app)
    .post('/api/auth/reset-password')
    .send({
      token: 'not-a-valid-reset-token',
      newPassword: strongNewPassword,
      confirmPassword: strongNewPassword,
    })
    .expect(400);
  assert.equal(store.data.passwordResetTokens.length, 1, 'an invalid token does not consume the valid link');

  store.data.passwordResetTokens[0].expiresAt = new Date(Date.now() - 1000);
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: rawToken, newPassword: strongNewPassword, confirmPassword: strongNewPassword })
    .expect(400);
  assert.equal(
    await verifyPassword('Old-Recovery-Password-2026!', (await store.users.findById(user._id)).passwordHash),
    true,
    'an expired link does not change the password',
  );
  await request(app).get('/api/me').set('Cookie', originalSessionCookie).expect(200);

  await requestReset();
  rawToken = latestResetToken();
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: rawToken, newPassword: strongNewPassword, confirmPassword: strongNewPassword })
    .expect(200)
    .expect(({ body }) => {
      assert.equal(body.success, true);
      assert.match(body.message, /successfully updated/i);
    });

  const updatedUser = await store.users.findById(user._id);
  assert.notEqual(
    updatedUser.passwordHash,
    strongNewPassword,
    'the new password is never stored in plaintext',
  );
  assert.equal(await verifyPassword(strongNewPassword, updatedUser.passwordHash), true);
  assert.equal(await verifyPassword('Old-Recovery-Password-2026!', updatedUser.passwordHash), false);
  assert.equal(store.data.passwordResetTokens.length, 0, 'the token is invalidated after success');
  assert.equal(store.data.sessions.length, 0, 'all of the user’s active sessions are revoked');
  await request(app).get('/api/me').set('Cookie', originalSessionCookie).expect(401);
  await request(app).get('/api/me').set('Cookie', secondSessionCookie).expect(401);

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: rawToken, newPassword: strongNewPassword, confirmPassword: strongNewPassword })
    .expect(400)
    .expect(({ body }) => assert.equal(body.code, 'INVALID_RESET_TOKEN'));
  await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Old-Recovery-Password-2026!' })
    .expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: strongNewPassword })
    .expect(200);
});

test('reset passwords require strength and exact confirmation', async () => {
  await requestReset();
  const rawToken = latestResetToken();
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: rawToken, newPassword: 'weakpass', confirmPassword: 'weakpass' })
    .expect(400);
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: rawToken, newPassword: strongNewPassword, confirmPassword: 'Different-Password-2026!' })
    .expect(400);
  assert.equal(store.data.passwordResetTokens.length, 1, 'validation failures do not consume a valid link');
});
