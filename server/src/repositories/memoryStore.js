import { randomUUID, randomBytes } from 'node:crypto';
import { SERVICES } from '../config/services.js';
import { createMemoryAnalyticsStore } from './memoryAnalyticsStore.js';

const clone = (value) => (value == null ? null : structuredClone(value));
const matchesId = (value, id) => String(value?._id || value) === String(id);
const normalizedEmail = (user) => (user.emailNormalized || user.email || '').trim().toLowerCase();
export const newId = () => randomBytes(12).toString('hex');
export const newStudentId = () => `EP-ST-${randomBytes(3).toString('hex').toUpperCase()}`;
export const newRequestId = () =>
  `EP-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
const pageResult = (items, page = 1, limit = 10) => ({
  items: clone(items.slice((page - 1) * limit, page * limit)),
  total: items.length,
  page: Number(page),
  pages: Math.max(1, Math.ceil(items.length / limit)),
});
const dateSorted = (items) => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export function createMemoryStore() {
  const data = {
    users: [],
    sessions: [],
    requests: [],
    services: SERVICES.map((s) => ({ ...clone(s), _id: s.slug, active: true })),
    logs: [],
    notifications: [],
    jobs: [],
    analyticsVisitors: [],
    analyticsSessions: [],
    analyticsPageViews: [],
    analyticsPresence: [],
    analyticsActivity: [],
    analyticsRevocations: [],
  };
  const state = () => data;
  const joinRequest = (request) => ({
    ...request,
    userId: data.users.find((u) => matchesId(u._id, request.userId)) || request.userId,
  });
  const requestMatch = (r, q) => {
    const u = data.users.find((u) => matchesId(u._id, r.userId));
    const haystack =
      `${r.requestId} ${r.title} ${r.description} ${u?.fullName || ''} ${u?.phoneNumber || ''}`.toLowerCase();
    return (
      (!q.search || haystack.includes(q.search.toLowerCase())) &&
      (!q.service || r.serviceSlug === q.service) &&
      (!q.status || r.status === q.status) &&
      (!q.userId || matchesId(r.userId, q.userId)) &&
      (!q.from || new Date(r.createdAt) >= new Date(q.from)) &&
      (!q.to || new Date(r.createdAt) <= new Date(`${q.to.slice(0, 10)}T23:59:59.999Z`))
    );
  };
  const store = {
    kind: 'memory',
    data,
    analytics: createMemoryAnalyticsStore(data),
    async withTransaction(fn) {
      const backup = clone(data);
      try {
        return await fn(store);
      } catch (error) {
        for (const key of Object.keys(data)) data[key] = backup[key];
        throw error;
      }
    },
    users: {
      async findById(id) {
        return clone(data.users.find((u) => matchesId(u._id, id)));
      },
      async findByUsernameNormalized(usernameNormalized) {
        return clone(data.users.find((u) => u.usernameNormalized === usernameNormalized));
      },
      async findByEmailNormalized(emailNormalized) {
        return clone(data.users.filter((u) => normalizedEmail(u) === emailNormalized).slice(0, 2));
      },
      async create(values) {
        const emailNormalized = values.emailNormalized || (values.email || '').trim().toLowerCase();
        if (
          data.users.some(
            (u) =>
              u.usernameNormalized === values.usernameNormalized ||
              (emailNormalized && normalizedEmail(u) === emailNormalized),
          )
        ) {
          const e = new Error('Duplicate user');
          e.code = 11000;
          throw e;
        }
        const user = {
          _id: newId(),
          studentId: newStudentId(),
          email: '',
          role: 'student',
          state: 'active',
          ...clone(values),
          createdAt: values.createdAt || new Date(),
          updatedAt: new Date(),
        };
        data.users.push(user);
        return clone(user);
      },
      async update(id, values) {
        const u = data.users.find((u) => matchesId(u._id, id));
        if (!u) return null;
        const emailNormalized = values.emailNormalized;
        if (
          emailNormalized &&
          data.users.some((other) => other !== u && normalizedEmail(other) === emailNormalized)
        ) {
          const error = new Error('Duplicate email');
          error.code = 11000;
          throw error;
        }
        Object.assign(u, clone(values), { updatedAt: new Date() });
        return clone(u);
      },
      async remove(id) {
        data.users = data.users.filter((u) => !matchesId(u._id, id));
      },
      async list(q = {}) {
        const items = dateSorted(
          data.users.filter((u) => {
            const haystack =
              `${u.fullName} ${u.username || ''} ${u.phoneNumber} ${u.email} ${u.studentId}`.toLowerCase();
            return (
              u.role === 'student' &&
              u.state !== 'deleting' &&
              (!q.search || haystack.includes(q.search.toLowerCase())) &&
              (!q.from || new Date(u.createdAt) >= new Date(q.from)) &&
              (!q.to || new Date(u.createdAt) <= new Date(`${q.to.slice(0, 10)}T23:59:59.999Z`))
            );
          }),
        );
        return pageResult(items, q.page, q.limit);
      },
      async recent(limit = 5) {
        return clone(
          dateSorted(data.users.filter((u) => u.role === 'student' && u.state === 'active')).slice(0, limit),
        );
      },
    },
    sessions: {
      async create(values) {
        const session = { _id: newId(), ...clone(values), createdAt: new Date() };
        data.sessions.push(session);
        return clone(session);
      },
      async findByTokenHash(tokenHash) {
        return clone(data.sessions.find((session) => session.tokenHash === tokenHash));
      },
      async removeByTokenHash(tokenHash) {
        data.sessions = data.sessions.filter((session) => session.tokenHash !== tokenHash);
      },
      async removeForUser(userId) {
        data.sessions = data.sessions.filter((session) => !matchesId(session.userId, userId));
      },
    },
    requests: {
      async create(values) {
        const request = {
          requestId: newRequestId(),
          status: 'Pending',
          adminNotes: '',
          attachments: [],
          ...clone(values),
          _id: newId(),
          createdAt: values.createdAt || new Date(),
          updatedAt: values.updatedAt || new Date(),
        };
        data.requests.push(request);
        return clone(request);
      },
      async findById(id, populate = false, tx) {
        const r = data.requests.find((r) => matchesId(r._id, id));
        return clone(r ? (populate ? joinRequest(r) : r) : null);
      },
      async findByRequestId(id) {
        const r = data.requests.find((r) => r.requestId === id);
        return clone(r ? joinRequest(r) : null);
      },
      async list(q = {}) {
        const items = dateSorted(data.requests.filter((r) => requestMatch(r, q))).map(joinRequest);
        return pageResult(items, q.page, q.limit);
      },
      async allForUser(userId) {
        return clone(dateSorted(data.requests.filter((r) => matchesId(r.userId, userId))).map(joinRequest));
      },
      async update(id, values) {
        const r = data.requests.find((r) => matchesId(r._id, id));
        if (!r) return null;
        Object.assign(r, clone(values), { updatedAt: new Date() });
        return clone(joinRequest(r));
      },
      async removeForUser(userId) {
        data.requests = data.requests.filter((r) => !matchesId(r.userId, userId));
      },
    },
    services: {
      async list() {
        return clone(data.services.filter((s) => s.active));
      },
      async seed() {
        for (const service of SERVICES)
          if (!data.services.some((s) => s.slug === service.slug))
            data.services.push({ ...clone(service), _id: service.slug, active: true });
      },
    },
    notifications: {
      async create(values) {
        const n = {
          _id: newId(),
          recipientRole: 'admin',
          recipientId: null,
          readAt: null,
          ...clone(values),
          createdAt: values.createdAt || new Date(),
        };
        data.notifications.push(n);
        return clone(n);
      },
      async list(q) {
        const items = dateSorted(
          data.notifications.filter(
            (n) => n.recipientRole === q.role && (q.role === 'admin' || matchesId(n.recipientId, q.userId)),
          ),
        );
        return { items: clone(items.slice(0, 50)), unread: items.filter((n) => !n.readAt).length };
      },
      async markRead(q, ids) {
        for (const n of data.notifications)
          if (
            n.recipientRole === q.role &&
            (q.role === 'admin' || matchesId(n.recipientId, q.userId)) &&
            (!ids?.length || ids.includes(String(n._id)))
          )
            n.readAt = new Date();
      },
      async removeForUser(userId) {
        const requestIds = data.requests.filter((r) => matchesId(r.userId, userId)).map((r) => String(r._id));
        data.notifications = data.notifications.filter(
          (n) =>
            !matchesId(n.relatedUserId, userId) &&
            !requestIds.includes(String(n.relatedRequestId)) &&
            !(n.recipientRole === 'student' && matchesId(n.recipientId, userId)),
        );
      },
    },
    logs: {
      async create(values) {
        const log = { ...clone(values), _id: newId(), createdAt: new Date() };
        data.logs.push(log);
        return clone(log);
      },
      async list(limit = 50) {
        return clone(dateSorted(data.logs).slice(0, limit));
      },
    },
    jobs: {
      async enqueue(values) {
        const existing = data.jobs.find((j) => j.userId === values.userId);
        if (existing) return { job: clone(existing), created: false };
        const job = {
          _id: newId(),
          stage: 'pending',
          attempts: 0,
          nextAttemptAt: new Date(),
          attachmentKeys: [],
          ...clone(values),
          createdAt: new Date(),
        };
        data.jobs.push(job);
        return { job: clone(job), created: true };
      },
      async findForUser(userId) {
        return clone(data.jobs.find((j) => j.userId === userId));
      },
      async claim(id) {
        const j = data.jobs.find(
          (j) =>
            String(j._id) === String(id) &&
            j.stage !== 'completed' &&
            new Date(j.nextAttemptAt) <= new Date() &&
            (!j.lockedAt || Date.now() - new Date(j.lockedAt).getTime() > 120000),
        );
        if (!j) return null;
        j.lockedAt = new Date();
        return clone(j);
      },
      async due() {
        return clone(
          data.jobs.filter((j) => j.stage !== 'completed' && new Date(j.nextAttemptAt) <= new Date()),
        );
      },
      async update(id, values, tx) {
        const j = data.jobs.find((j) => String(j._id) === String(id));
        if (j) Object.assign(j, clone(values), { updatedAt: new Date() });
        return clone(j);
      },
      async remove(id) {
        data.jobs = data.jobs.filter((j) => String(j._id) !== String(id));
      },
      async pending() {
        return clone(
          data.jobs
            .filter((j) => j.stage !== 'completed')
            .map((j) => ({
              id: j._id,
              studentId: j.studentId,
              stage: j.stage,
              attempts: j.attempts,
              nextAttemptAt: j.nextAttemptAt,
              lastError: j.lastError,
            })),
        );
      },
    },
    async requestSummary(userId) {
      const requests = data.requests.filter((r) => matchesId(r.userId, userId));
      return {
        total: requests.length,
        pending: requests.filter((r) => r.status === 'Pending').length,
        inProgress: requests.filter((r) => r.status === 'In Progress').length,
        completed: requests.filter((r) => r.status === 'Completed').length,
        cancelled: requests.filter((r) => r.status === 'Cancelled').length,
      };
    },
    async dashboard() {
      const requests = data.requests;
      const count = (status) => requests.filter((r) => r.status === status).length;
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 5 + i);
        const key = d.toISOString().slice(0, 7);
        return {
          month: d.toLocaleString('en', { month: 'short' }),
          key,
          count: requests.filter((r) => new Date(r.createdAt).toISOString().startsWith(key)).length,
        };
      });
      return {
        students: data.users.filter((u) => u.role === 'student' && u.state === 'active').length,
        requests: requests.length,
        pending: count('Pending'),
        inProgress: count('In Progress'),
        completed: count('Completed'),
        cancelled: count('Cancelled'),
        services: SERVICES.map((s) => ({
          slug: s.slug,
          name: s.shortName,
          count: requests.filter((r) => r.serviceSlug === s.slug).length,
        })),
        months,
      };
    },
  };
  return store;
}
