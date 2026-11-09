import assert from 'node:assert/strict';
import test from 'node:test';
import config from '../src/config/env.js';
import { sendRequestEmails, sendWelcomeEmail } from '../src/services/email.js';

test('transactional emails are disabled in demo mode without contacting Resend', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('The demo must not make an external request.');
  };

  try {
    assert.equal(await sendWelcomeEmail({ username: 'demo_student', email: 'student@example.com' }), false);
    await sendRequestEmails({
      user: { username: 'demo_student', email: 'student@example.com' },
      requestId: 'EP-TEST-1',
      serviceName: 'Research Paper Support',
    });
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('welcome email includes the sign-in email and reset guidance, never a password', async () => {
  const originalFetch = globalThis.fetch;
  const originalDemo = config.demo;
  const originalApiKey = config.resendApiKey;
  let payload;
  config.demo = false;
  config.resendApiKey = 'test-only-resend-key';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    payload = JSON.parse(options.body);
    return { ok: true, status: 200 };
  };

  try {
    assert.equal(
      await sendWelcomeEmail({
        username: 'student_demo',
        email: 'student@example.com',
        password: 'Never-send-this-plaintext!',
        passwordHash: 'scrypt-hash-placeholder',
      }),
      true,
    );
    assert.equal(payload.to[0], 'student@example.com');
    assert.match(payload.text, /Your sign-in email: student@example\.com/);
    assert.match(payload.html, /student@example\.com/);
    assert.match(payload.text, /never send your password by email/i);
    assert.match(payload.text, /https:\/\/erasepaper\.online\/forgot-password/);
    assert.match(payload.html, /request a password reset link/);
    assert.doesNotMatch(payload.text, /Never-send-this-plaintext!/);
    assert.doesNotMatch(payload.html, /Never-send-this-plaintext!/);
    assert.doesNotMatch(payload.text, /scrypt-hash-placeholder/);
    assert.doesNotMatch(payload.html, /scrypt-hash-placeholder/);
  } finally {
    config.demo = originalDemo;
    config.resendApiKey = originalApiKey;
    globalThis.fetch = originalFetch;
  }
});
