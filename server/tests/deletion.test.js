import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { createMemoryStore } from '../src/repositories/memoryStore.js';
import { createDeletionService } from '../src/services/deletion.js';
import { createAuthProvider } from '../src/middleware/auth.js';
import { saveAttachments } from '../src/services/uploads.js';
import { hashPassword } from '../src/utils/passwords.js';
import config from '../src/config/env.js';

async function fixture() {
  const store = createMemoryStore();
  const username = 'deletion_student';
  const user = await store.users.create({
    username,
    usernameNormalized: username,
    passwordHash: await hashPassword('Long-Unique-Test-2026!'),
    fullName: 'Private Student',
    phoneNumber: '+919123456702',
    email: 'private@example.com',
  });
  const file = await saveAttachments([
    {
      originalname: 'private.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('Private test file'),
      size: 17,
    },
  ]);
  const req = await store.requests.create({
    userId: String(user._id),
    serviceSlug: 'research-paper',
    serviceType: 'Research Paper',
    title: 'Private requirements',
    description: 'Private',
    attachments: file,
  });
  await store.notifications.create({
    type: 'request',
    relatedUserId: String(user._id),
    relatedRequestId: String(req._id),
    title: 'New request',
    message: 'Private',
  });
  return { store, user, file, req };
}

function requestWithCookie(cookie) {
  return { headers: { cookie } };
}

function authenticate(auth, req) {
  return new Promise((resolve, reject) =>
    auth.authenticate(req, {}, (error) => (error ? reject(error) : resolve(req.user))),
  );
}

test('local deletion immediately revokes access, removes related data and cleans private files', async () => {
  const { store, user, file, req } = await fixture();
  const auth = createAuthProvider(store);
  let cookie;
  await auth.createSession(user, {
    cookie(name, value) {
      cookie = `${name}=${value}`;
    },
  });
  assert.equal((await authenticate(auth, requestWithCookie(cookie)))._id, user._id);

  const deletion = createDeletionService(store);
  const job = await deletion.enqueue(user, 'admin_test');
  await assert.rejects(authenticate(auth, requestWithCookie(cookie)), (error) => error.status === 401);
  assert.equal((await store.users.findById(user._id)).state, 'deleting');
  const result = await deletion.processJob(job._id);
  assert.equal(result.status, 'completed');
  assert.equal(await store.users.findById(user._id), null);
  assert.equal(await store.requests.findById(req._id), null);
  assert.equal((await store.requests.allForUser(user._id)).length, 0);
  assert.equal(
    store.data.sessions.some((session) => String(session.userId) === String(user._id)),
    false,
  );
  assert.equal(
    (await store.notifications.list({ role: 'admin' })).items.some(
      (notice) => notice.relatedUserId === String(user._id),
    ),
    false,
  );
  await assert.rejects(fs.access(path.join(config.uploadDir, file[0].storageName)));
  const logs = await store.logs.list(100);
  assert.ok(logs.some((entry) => entry.action === 'student.deleted'));
  assert.ok(!JSON.stringify(logs).includes(user.phoneNumber));
  assert.ok(!JSON.stringify(logs).includes(user.email));
});

test('failed file cleanup leaves a durable retry job without restoring the account', async () => {
  const { store, user, file } = await fixture();
  const deletion = createDeletionService(store);
  const badFile = { ...file[0], storageName: '../outside.txt' };
  await store.requests.update((await store.requests.allForUser(user._id))[0]._id, { attachments: [badFile] });
  const first = await deletion.deleteStudent(user, 'admin_test');
  assert.equal(first.status, 'processing');
  assert.equal(await store.users.findById(user._id), null);
  const job = await store.jobs.findForUser(String(user._id));
  assert.equal(job.stage, 'database_deleted');
  assert.equal(job.attempts, 1);
  assert.match(job.lastError, /No contact details retained/);

  await store.jobs.update(job._id, {
    attachmentKeys: [file[0].storageName],
    nextAttemptAt: new Date(),
    lockedAt: null,
  });
  const retry = await deletion.processJob(job._id);
  assert.equal(retry.status, 'completed');
  assert.equal(await store.jobs.findForUser(String(user._id)), null);
  await assert.rejects(fs.access(path.join(config.uploadDir, file[0].storageName)));
});

test('session records contain only a one-way token hash and the deletion job is unique per account', async () => {
  const { store, user } = await fixture();
  const auth = createAuthProvider(store);
  let cookie;
  await auth.createSession(user, {
    cookie(name, value) {
      cookie = `${name}=${value}`;
    },
  });
  const token = cookie.split('=')[1];
  const hash = createHmac('sha256', config.sessionSecret).update(token).digest('hex');
  assert.equal((await store.sessions.findByTokenHash(hash)).userId, user._id);
  assert.notEqual(hash, token);

  const deletion = createDeletionService(store);
  const first = await deletion.enqueue(user, 'admin_test');
  const second = await deletion.enqueue(user, 'admin_test');
  assert.equal(first._id, second._id);
  const completed = await deletion.processJob(first._id);
  assert.equal(completed.status, 'completed');
});
