import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createMongoStore } from '../src/repositories/mongoStore.js';
import { createDeletionService } from '../src/services/deletion.js';
import { dateKeyInIndia, getAnalyticsRange } from '../src/services/analytics.js';
import { hashPassword, verifyPassword } from '../src/utils/passwords.js';
import AnalyticsPageView from '../src/models/AnalyticsPageView.js';
import AnalyticsSession from '../src/models/AnalyticsSession.js';
import PasswordResetToken from '../src/models/PasswordResetToken.js';

let replSet, connection, store;
before(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { serverSelectionTimeoutMS: 10000 });
  connection = mongoose.connection;
  // Simulate a previous deployment's unique phone index; initialization should remove it safely.
  await connection.createCollection('local_users_v2');
  await connection.collection('local_users_v2').createIndex({ phoneNumber: 1 }, { unique: true });
  store = createMongoStore(connection);
  await store.initialize();
  await store.services.seed();
});
after(async () => {
  if (connection?.readyState === 1) await connection.dropDatabase();
  await mongoose.disconnect();
  await replSet?.stop();
});

async function newUser(username, phoneNumber, extra = {}) {
  const values = { ...extra };
  if (typeof values.email === 'string' && values.email.trim())
    values.emailNormalized = values.email.trim().toLowerCase();
  return store.users.create({
    username,
    usernameNormalized: username.toLowerCase(),
    passwordHash: await hashPassword('Long-Unique-Test-2026!'),
    fullName: username,
    phoneNumber,
    ...values,
  });
}

test('local repository enforces username and email uniqueness, allows shared phones, and isolates fresh accounts', async () => {
  assert.equal((await store.services.list()).length, 5);
  const indexes = await connection.collection('local_users_v2').indexes();
  assert.ok(
    !indexes.some(
      (index) => index.unique && Object.keys(index.key).length === 1 && index.key.phoneNumber === 1,
    ),
    'the legacy unique phone index should be removed on initialization',
  );
  const legacy = await connection.collection('users').insertOne({
    clerkUserId: 'legacy_clerk_record',
    fullName: 'Legacy user untouched',
    phoneNumber: '+919123456700',
  });
  assert.ok(legacy.insertedId);
  const legacyRequest = await connection.collection('servicerequests').insertOne({
    requestId: 'EP-LEGACY-001',
    userId: legacy.insertedId,
    serviceSlug: 'research-paper',
    serviceType: 'Research Paper',
    title: 'Legacy request untouched',
    description: 'Must not be migrated or displayed by the fresh account system.',
    status: 'Pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const user = await newUser('mongo_user', '+919123456703', { email: 'mongo@example.com' });
  assert.ok(user._id);
  assert.equal(user.role, 'student');
  await assert.rejects(newUser('mongo_user', '+919123456704'), (error) => error.code === 11000);
  const sharedPhoneUser = await newUser('another_user', '+919123456703', {
    email: 'shared.phone@example.com',
  });
  assert.equal(sharedPhoneUser.phoneNumber, user.phoneNumber);
  await assert.rejects(
    newUser('another_email_user', '+919123456704', { email: 'MONGO@EXAMPLE.COM' }),
    (error) => error.code === 11000,
  );
  const emailMatches = await store.users.findByEmailNormalized('MONGO@EXAMPLE.COM'.toLowerCase());
  assert.equal(emailMatches.length, 1);
  assert.equal(String(emailMatches[0]._id), String(user._id));

  const legacyEmailId = new mongoose.Types.ObjectId();
  await connection.collection('local_users_v2').insertOne({
    _id: legacyEmailId,
    studentId: 'EP-LEGACY-EMAIL',
    username: 'legacy_email',
    usernameNormalized: 'legacy_email',
    passwordHash: 'legacy-hash',
    fullName: 'Legacy Email',
    phoneNumber: '+919123456708',
    email: 'Legacy@Example.com',
    role: 'student',
    state: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const legacyEmailMatches = await store.users.findByEmailNormalized('legacy@example.com');
  assert.equal(legacyEmailMatches.length, 1);
  assert.equal(String(legacyEmailMatches[0]._id), String(legacyEmailId));
  assert.equal(
    (await connection.collection('local_users_v2').findOne({ _id: legacyEmailId })).emailNormalized,
    undefined,
    'querying a legacy record must not migrate it or assign it a normalized email',
  );

  const found = await store.users.findByUsernameNormalized('mongo_user');
  assert.equal(String(found._id), String(user._id));
  assert.equal(await store.users.findByUsernameNormalized('legacy_clerk_record'), null);
  assert.equal(await connection.collection('users').countDocuments({ _id: legacy.insertedId }), 1);
  assert.equal(
    await connection.collection('servicerequests').countDocuments({ _id: legacyRequest.insertedId }),
    1,
  );
  assert.equal((await store.requests.list({ page: 1, limit: 10 })).total, 0);
});

test('Mongo reset-token repository replaces, expires, and atomically consumes one hashed token per user', async () => {
  const user = await newUser('token_store_user', '+919123456709', { email: 'reset.mongo@example.com' });
  const previousHash = 'a'.repeat(64);
  const currentHash = 'b'.repeat(64);
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  await store.passwordResetTokens.replaceForUser(user._id, { tokenHash: previousHash, expiresAt });
  await store.passwordResetTokens.replaceForUser(user._id, { tokenHash: currentHash, expiresAt });
  assert.equal(await PasswordResetToken.countDocuments({ userId: user._id }), 1);
  assert.equal(
    await store.passwordResetTokens.consume(previousHash),
    null,
    'replacing a link invalidates the old hash',
  );

  const indexes = await PasswordResetToken.collection.indexes();
  assert.ok(indexes.some((index) => index.unique && index.key.tokenHash === 1));
  assert.ok(indexes.some((index) => index.unique && index.key.userId === 1));
  assert.ok(
    indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0),
    'the stored token has a MongoDB expiry index',
  );

  const consumed = await store.passwordResetTokens.consume(currentHash);
  assert.equal(consumed.tokenHash, currentHash);
  assert.equal(String(consumed.userId), String(user._id));
  assert.equal(
    await store.passwordResetTokens.consume(currentHash),
    null,
    'a consumed token cannot be reused',
  );

  const expiredHash = 'c'.repeat(64);
  await store.passwordResetTokens.replaceForUser(user._id, {
    tokenHash: expiredHash,
    expiresAt: new Date(Date.now() - 1000),
  });
  assert.equal(
    await store.passwordResetTokens.consume(expiredHash),
    null,
    'expiry is enforced before TTL cleanup',
  );
});

test('Mongo password reset atomically updates the password and revokes sessions', async () => {
  const user = await newUser('reset_transaction_user', '+919123456710', {
    email: 'reset.transaction@example.com',
  });
  const previousPassword = 'Long-Unique-Test-2026!';
  const nextPassword = 'New-Transaction-Password-2026!';
  const resetHash = 'd'.repeat(64);
  const sessionHash = 'e'.repeat(64);
  const now = new Date();
  await store.passwordResetTokens.replaceForUser(user._id, {
    tokenHash: resetHash,
    expiresAt: new Date(now.getTime() + 20 * 60 * 1000),
  });
  await store.sessions.create({
    tokenHash: sessionHash,
    userId: user._id,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  });
  const newPasswordHash = await hashPassword(nextPassword);

  const updateResetState = async (tx) => {
    const token = await store.passwordResetTokens.consume(resetHash, now, tx);
    assert.ok(token);
    await store.users.update(user._id, { passwordHash: newPasswordHash }, tx);
    await store.sessions.removeForUser(user._id, tx);
    await store.passwordResetTokens.deleteForUser(user._id, tx);
  };

  await assert.rejects(
    store.withTransaction(async (tx) => {
      await updateResetState(tx);
      throw new Error('Intentional password-reset rollback');
    }),
  );
  assert.equal(await PasswordResetToken.countDocuments({ userId: user._id }), 1);
  assert.ok(await store.sessions.findByTokenHash(sessionHash));
  assert.equal(
    await (
      await store.users.findByUsernameNormalized('reset_transaction_user')
    ).passwordHash,
    user.passwordHash,
  );

  await store.withTransaction(updateResetState);
  assert.equal(await PasswordResetToken.countDocuments({ userId: user._id }), 0);
  assert.equal(await store.sessions.findByTokenHash(sessionHash), null);
  const updatedUser = await store.users.findByUsernameNormalized('reset_transaction_user');
  assert.equal(await verifyPassword(nextPassword, updatedUser.passwordHash), true);
  assert.equal(await verifyPassword(previousPassword, updatedUser.passwordHash), false);
});

test('real MongoDB transaction rolls back all related writes on failure', async () => {
  const user = await newUser('rollback_user', '+919123456705');
  await assert.rejects(
    store.withTransaction(async (tx) => {
      await store.requests.create(
        {
          userId: String(user._id),
          serviceSlug: 'research-paper',
          serviceType: 'Research Paper',
          title: 'Rollback request',
          description: 'Must not persist',
        },
        tx,
      );
      await store.users.remove(user._id, tx);
      throw new Error('Intentional rollback');
    }),
  );
  assert.ok(await store.users.findById(user._id));
  assert.equal((await store.requests.allForUser(user._id)).length, 0);
});

test('local deletion uses real transactions to remove account data and revoke sessions', async () => {
  const user = await newUser('delete_user', '+919123456706', { email: 'delete@example.com' });
  const req = await store.requests.create({
    userId: String(user._id),
    serviceSlug: 'survey-paper',
    serviceType: 'Survey Paper',
    title: 'Private survey topic',
    description: 'Private requirements',
  });
  await store.notifications.create({
    type: 'request',
    relatedUserId: String(user._id),
    relatedRequestId: String(req._id),
    title: 'Private',
    message: 'Private',
  });
  const tokenHash = 'a'.repeat(64);
  await store.sessions.create({ tokenHash, userId: user._id, expiresAt: new Date(Date.now() + 86400000) });
  const deletion = createDeletionService(store);
  const result = await deletion.deleteStudent(user, 'admin_test');
  assert.equal(result.status, 'completed');
  assert.equal(await store.users.findById(user._id), null);
  assert.equal(await store.requests.findById(req._id), null);
  assert.equal(await store.sessions.findByTokenHash(tokenHash), null);
  assert.equal(await store.jobs.findForUser(String(user._id)), null);
  assert.equal(
    (await store.notifications.list({ role: 'admin' })).items.some(
      (notice) => notice.relatedUserId === String(user._id),
    ),
    false,
  );
  const logs = await store.logs.list(100);
  assert.ok(logs.some((entry) => entry.action === 'student.deleted'));
  assert.ok(!JSON.stringify(logs).includes(user.phoneNumber));
  assert.ok(!JSON.stringify(logs).includes(user.email));
});

test('dashboard and student summary use database aggregation', async () => {
  const user = await store.users.findByUsernameNormalized('mongo_user');
  await store.requests.create({
    userId: String(user._id),
    serviceSlug: 'research-paper',
    serviceType: 'Research Paper',
    title: 'Methodology guidance',
    description: 'Private',
    status: 'Completed',
  });
  const summary = await store.requestSummary(user._id);
  assert.equal(summary.total, 1);
  assert.equal(summary.completed, 1);
  const dashboard = await store.dashboard();
  assert.equal(dashboard.services.length, 5);
  assert.equal(dashboard.months.length, 6);
  assert.ok(dashboard.students >= 1);
  const search = await store.users.list({ search: 'mongo_user', page: 1, limit: 1 });
  assert.equal(search.total, 1);
});

test('MongoDB analytics stores anonymous all-visit page totals and returns consented aggregate reports', async () => {
  const now = new Date();
  const dayKey = dateKeyInIndia(now);
  const retentionAt = new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + 75_000);
  const visitorOne = 'a'.repeat(64);
  const visitorTwo = 'b'.repeat(64);
  const sessionOne = 'c'.repeat(64);
  const sessionTwo = 'd'.repeat(64);
  const base = {
    dayKey,
    now,
    expiresAt,
    retentionAt,
    pageKey: 'home',
    source: 'search',
    device: 'mobile',
    userType: 'anonymous',
  };

  await store.analytics.heartbeat({ ...base, visitorKey: visitorOne, sessionKey: sessionOne });
  await store.analytics.aggregatePageView({ pageKey: 'home', dayKey, retentionAt });
  await store.analytics.aggregatePageView({ pageKey: 'home', dayKey, retentionAt });
  await store.analytics.heartbeat({
    ...base,
    visitorKey: visitorTwo,
    sessionKey: sessionTwo,
    userType: 'student',
    device: 'desktop',
    source: 'direct',
  });

  const report = await store.analytics.report(getAnalyticsRange('today'));
  assert.deepEqual(report.summary, {
    uniqueVisitors: 2,
    newVisitors: 2,
    returningVisitors: 0,
    totalSessions: 2,
    pageViews: 2,
  });
  assert.equal(report.daily.find((item) => item.key === dayKey).visitors, 2);
  assert.equal(report.daily.find((item) => item.key === dayKey).pageViews, 2);
  assert.equal(report.devices.find((item) => item.device === 'mobile').sessions, 1);
  assert.equal(report.sources.find((item) => item.source === 'direct').sessions, 1);
  assert.equal(report.popularPages[0].pageViews, 2);
  assert.equal('visitorKey' in report.popularPages[0], false);

  const live = await store.analytics.live(now);
  assert.deepEqual(
    { total: live.total, anonymous: live.anonymous, student: live.student, admin: live.admin },
    {
      total: 2,
      anonymous: 1,
      student: 1,
      admin: 0,
    },
  );
  assert.equal((await store.analytics.live(new Date(now.getTime() + 76_000))).total, 0);
  const [pageBucket] = await AnalyticsPageView.find().lean();
  assert.equal(pageBucket.pageViews, 2);
  assert.equal('visitorKey' in pageBucket, false);
  assert.equal('sessionKey' in pageBucket, false);
  const sessions = await AnalyticsSession.find().select('+visitorKey +sessionKey').lean();
  assert.equal(
    sessions.some((item) => 'currentPage' in item || 'entryPage' in item),
    false,
  );

  await store.analytics.removeVisitor(visitorOne);
  const afterWithdrawal = await store.analytics.report(getAnalyticsRange('today'));
  assert.equal(afterWithdrawal.summary.uniqueVisitors, 1);
  assert.equal(afterWithdrawal.summary.totalSessions, 1);
  assert.equal(afterWithdrawal.summary.pageViews, 2);
  const denied = await store.analytics.heartbeat({ ...base, visitorKey: visitorOne, sessionKey: sessionOne });
  assert.equal(denied.denied, true);
  await store.analytics.aggregatePageView({ pageKey: 'home', dayKey, retentionAt });
  const afterAnonymousView = await store.analytics.report(getAnalyticsRange('today'));
  assert.equal(afterAnonymousView.summary.pageViews, 3);
});
