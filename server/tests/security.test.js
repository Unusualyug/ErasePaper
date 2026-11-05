import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCsp } from '../src/config/security.js';
import { verifyPassword, hashPassword } from '../src/utils/passwords.js';

test('content security policy is same-origin and does not allow identity-provider scripts', () => {
  const { directives } = createCsp();
  assert.deepEqual(directives.connectSrc, ["'self'"]);
  assert.deepEqual(directives.frameSrc, ["'self'"]);
  assert.ok(directives.scriptSrc.includes("'self'"));
  assert.ok(directives.imgSrc.includes('data:'));
  assert.ok(directives.objectSrc.includes("'none'"));
  assert.ok(!JSON.stringify(directives).toLowerCase().includes('clerk'));
  assert.ok(!directives.scriptSrc.includes("'unsafe-inline'"));
  assert.ok(!directives.scriptSrc.includes("'unsafe-eval'"));
});

test('password hashes use salted scrypt and verify only the original password', async () => {
  const first = await hashPassword('Long-Unique-Test-2026!');
  const second = await hashPassword('Long-Unique-Test-2026!');
  assert.notEqual(first, second, 'random salts make equal passwords hash differently');
  assert.equal(await verifyPassword('Long-Unique-Test-2026!', first), true);
  assert.equal(await verifyPassword('not-the-password', first), false);
  assert.equal(await verifyPassword('Long-Unique-Test-2026!', 'not-a-hash'), false);
});
