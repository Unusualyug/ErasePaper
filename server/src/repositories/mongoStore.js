import mongoose from 'mongoose';
import User from '../models/User.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Service from '../models/Service.js';
import Notification from '../models/Notification.js';
import AdminLog from '../models/AdminLog.js';
import DeletionJob from '../models/DeletionJob.js';
import AuthSession from '../models/AuthSession.js';
import AnalyticsVisitor from '../models/AnalyticsVisitor.js';
import AnalyticsSession from '../models/AnalyticsSession.js';
import AnalyticsPageView from '../models/AnalyticsPageView.js';
import AnalyticsPresence from '../models/AnalyticsPresence.js';
import AnalyticsActivity from '../models/AnalyticsActivity.js';
import AnalyticsRevocation from '../models/AnalyticsRevocation.js';
import { createMongoAnalyticsStore } from './mongoAnalyticsStore.js';
import { SERVICES } from '../config/services.js';
import { newStudentId, newRequestId } from './memoryStore.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const plain = (doc) => (doc ? JSON.parse(JSON.stringify(doc)) : null);
const options = (tx) => (tx?.session ? { session: tx.session } : {});
function dateRange(from, to) {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(`${to.slice(0, 10)}T23:59:59.999Z`);
  return Object.keys(range).length ? range : undefined;
}
async function paginated(model, filter, q, populate = '') {
  const page = q.page || 1,
    limit = q.limit || 10;
  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populate)
      .lean(),
    model.countDocuments(filter),
  ]);
  return { items: plain(items), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
export function createMongoStore(connection) {
  const store = {
    kind: 'mongodb',
    analytics: createMongoAnalyticsStore(),
    async initialize() {
      // Transactions cannot rely on implicit collection creation. Provision collections and indexes first.
      await Promise.all(
        [
          User,
          ServiceRequest,
          Service,
          Notification,
          AdminLog,
          DeletionJob,
          AuthSession,
          AnalyticsVisitor,
          AnalyticsSession,
          AnalyticsPageView,
          AnalyticsPresence,
          AnalyticsActivity,
          AnalyticsRevocation,
        ].map((model) => model.createCollection()),
      );
      // Remove the former unique phone index so existing live databases permit shared contact numbers.
      const userIndexes = await User.collection.indexes();
      for (const index of userIndexes) {
        const keys = Object.keys(index.key || {});
        if (index.unique && keys.length === 1 && keys[0] === 'phoneNumber') {
          try {
            await User.collection.dropIndex(index.name);
          } catch (error) {
            if (error.code !== 27 && error.codeName !== 'IndexNotFound') throw error;
          }
        }
      }
      await Promise.all(
        [
          User,
          ServiceRequest,
          Service,
          Notification,
          AdminLog,
          DeletionJob,
          AuthSession,
          AnalyticsVisitor,
          AnalyticsSession,
          AnalyticsPageView,
          AnalyticsPresence,
          AnalyticsActivity,
          AnalyticsRevocation,
        ].map((model) => model.createIndexes()),
      );
    },
    async withTransaction(fn) {
      const session = await connection.startSession();
      try {
        let result;
        await session.withTransaction(async () => {
          result = await fn({ session });
        });
        return result;
      } finally {
        await session.endSession();
      }
    },
    users: {
      async findById(id, tx) {
        if (!mongoose.isValidObjectId(id)) return null;
        return plain(
          await User.findById(id)
            .session(tx?.session || null)
            .lean(),
        );
      },
      async findByUsernameNormalized(usernameNormalized) {
        return plain(await User.findOne({ usernameNormalized }).select('+passwordHash').lean());
      },
      async findByEmailNormalized(emailNormalized) {
        const emailRegex = new RegExp(`^${escapeRegex(emailNormalized)}$`, 'i');
        return plain(
          await User.find({
            $or: [{ emailNormalized }, { email: emailRegex }],
          })
            .select('+passwordHash')
            .limit(2)
            .lean(),
        );
      },
      async create(values, tx) {
        const [user] = await User.create([{ studentId: newStudentId(), ...values }], options(tx));
        return plain(user.toObject());
      },
      async update(id, values, tx) {
        return plain(
          await User.findByIdAndUpdate(
            id,
            { $set: values },
            { new: true, runValidators: true, ...options(tx) },
          ).lean(),
        );
      },
      async remove(id, tx) {
        await User.deleteOne({ _id: id }, options(tx));
      },
      async list(q) {
        const filter = { role: 'student', state: 'active' };
        if (q.search) {
          const regex = new RegExp(escapeRegex(q.search), 'i');
          filter.$or = [
            { fullName: regex },
            { username: regex },
            { phoneNumber: regex },
            { email: regex },
            { studentId: regex },
          ];
        }
        const createdAt = dateRange(q.from, q.to);
        if (createdAt) filter.createdAt = createdAt;
        return paginated(User, filter, q);
      },
      async recent(limit = 5) {
        return plain(
          await User.find({ role: 'student', state: 'active' }).sort({ createdAt: -1 }).limit(limit).lean(),
        );
      },
    },
    sessions: {
      async create(values, tx) {
        const [session] = await AuthSession.create([values], options(tx));
        return plain(session.toObject());
      },
      async findByTokenHash(tokenHash, tx) {
        return plain(
          await AuthSession.findOne({ tokenHash })
            .session(tx?.session || null)
            .lean(),
        );
      },
      async removeByTokenHash(tokenHash, tx) {
        await AuthSession.deleteOne({ tokenHash }, options(tx));
      },
      async removeForUser(userId, tx) {
        await AuthSession.deleteMany({ userId }, options(tx));
      },
    },
    requests: {
      async create(values, tx) {
        const [request] = await ServiceRequest.create(
          [{ requestId: newRequestId(), ...values }],
          options(tx),
        );
        return plain(request.toObject());
      },
      async findById(id, populate = false, tx) {
        if (!mongoose.isValidObjectId(id)) return null;
        let query = ServiceRequest.findById(id).session(tx?.session || null);
        if (populate) query = query.populate({ path: 'userId', options: { session: tx?.session || null } });
        return plain(await query.lean());
      },
      async findByRequestId(requestId) {
        return plain(await ServiceRequest.findOne({ requestId }).populate('userId').lean());
      },
      async list(q) {
        const filter = {};
        if (q.service) filter.serviceSlug = q.service;
        if (q.status) filter.status = q.status;
        if (q.userId) filter.userId = q.userId;
        const createdAt = dateRange(q.from, q.to);
        if (createdAt) filter.createdAt = createdAt;
        if (q.search) {
          const regex = new RegExp(escapeRegex(q.search), 'i');
          const users = await User.find({
            $or: [{ fullName: regex }, { phoneNumber: regex }, { email: regex }],
          })
            .select('_id')
            .lean();
          filter.$or = [
            { requestId: regex },
            { title: regex },
            { description: regex },
            { userId: { $in: users.map((u) => u._id) } },
          ];
        }
        return paginated(ServiceRequest, filter, q, 'userId');
      },
      async allForUser(userId, tx) {
        return plain(
          await ServiceRequest.find({ userId })
            .session(tx?.session || null)
            .sort({ createdAt: -1 })
            .populate('userId')
            .lean(),
        );
      },
      async update(id, values, tx) {
        return plain(
          await ServiceRequest.findByIdAndUpdate(
            id,
            { $set: values },
            { new: true, runValidators: true, ...options(tx) },
          )
            .populate('userId')
            .lean(),
        );
      },
      async removeForUser(userId, tx) {
        await ServiceRequest.deleteMany({ userId }, options(tx));
      },
    },
    services: {
      async list() {
        return plain(await Service.find({ active: true }).sort({ number: 1 }).lean());
      },
      async seed() {
        await Service.bulkWrite(
          SERVICES.map((s) => ({
            updateOne: { filter: { slug: s.slug }, update: { $set: { ...s, active: true } }, upsert: true },
          })),
        );
      },
    },
    notifications: {
      async create(values, tx) {
        const [n] = await Notification.create([values], options(tx));
        return plain(n.toObject());
      },
      async list(q) {
        const filter =
          q.role === 'admin'
            ? { recipientRole: 'admin' }
            : { recipientRole: 'student', recipientId: q.userId };
        const [items, unread] = await Promise.all([
          Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean(),
          Notification.countDocuments({ ...filter, readAt: null }),
        ]);
        return { items: plain(items), unread };
      },
      async markRead(q, ids) {
        const filter =
          q.role === 'admin'
            ? { recipientRole: 'admin' }
            : { recipientRole: 'student', recipientId: q.userId };
        if (ids?.length) filter._id = { $in: ids };
        await Notification.updateMany(filter, { $set: { readAt: new Date() } });
      },
      async removeForUser(userId, tx) {
        const requests = await ServiceRequest.find({ userId }, '_id', options(tx)).lean();
        await Notification.deleteMany(
          {
            $or: [
              { relatedUserId: String(userId) },
              { relatedRequestId: { $in: requests.map((r) => String(r._id)) } },
              { recipientRole: 'student', recipientId: String(userId) },
            ],
          },
          options(tx),
        );
      },
    },
    logs: {
      async create(values, tx) {
        const [log] = await AdminLog.create([values], options(tx));
        return plain(log.toObject());
      },
      async list(limit = 50) {
        return plain(await AdminLog.find().sort({ createdAt: -1 }).limit(limit).lean());
      },
    },
    jobs: {
      async enqueue(values, tx) {
        const result = await DeletionJob.findOneAndUpdate(
          { userId: values.userId },
          { $setOnInsert: { ...values, stage: 'pending', attempts: 0, nextAttemptAt: new Date() } },
          { upsert: true, returnDocument: 'before', ...options(tx) },
        ).lean();
        return {
          job: plain(
            result || (await DeletionJob.findOne({ userId: values.userId }, null, options(tx)).lean()),
          ),
          created: !result,
        };
      },
      async findForUser(userId) {
        return plain(await DeletionJob.findOne({ userId }).lean());
      },
      async claim(id) {
        return plain(
          await DeletionJob.findOneAndUpdate(
            {
              _id: id,
              stage: { $ne: 'completed' },
              nextAttemptAt: { $lte: new Date() },
              $or: [{ lockedAt: null }, { lockedAt: { $lt: new Date(Date.now() - 120000) } }],
            },
            { $set: { lockedAt: new Date() } },
            { new: true },
          ).lean(),
        );
      },
      async due() {
        return plain(
          await DeletionJob.find({ stage: { $ne: 'completed' }, nextAttemptAt: { $lte: new Date() } }).lean(),
        );
      },
      async update(id, values, tx) {
        return plain(
          await DeletionJob.findByIdAndUpdate(id, { $set: values }, { new: true, ...options(tx) }).lean(),
        );
      },
      async remove(id, tx) {
        await DeletionJob.deleteOne({ _id: id }, options(tx));
      },
      async pending() {
        const jobs = await DeletionJob.find({ stage: { $ne: 'completed' } }).lean();
        return jobs.map((j) => ({
          id: String(j._id),
          studentId: j.studentId,
          stage: j.stage,
          attempts: j.attempts,
          nextAttemptAt: j.nextAttemptAt,
          lastError: j.lastError,
        }));
      },
    },
    async requestSummary(userId) {
      const grouped = await ServiceRequest.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      const counts = Object.fromEntries(grouped.map((g) => [g._id, g.count]));
      return {
        total: grouped.reduce((sum, g) => sum + g.count, 0),
        pending: counts.Pending || 0,
        inProgress: counts['In Progress'] || 0,
        completed: counts.Completed || 0,
        cancelled: counts.Cancelled || 0,
      };
    },
    async dashboard() {
      const [students, grouped, services, monthly] = await Promise.all([
        User.countDocuments({ role: 'student', state: 'active' }),
        ServiceRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ServiceRequest.aggregate([{ $group: { _id: '$serviceSlug', count: { $sum: 1 } } }]),
        ServiceRequest.aggregate([
          {
            $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
          },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        ]),
      ]);
      const counts = Object.fromEntries(grouped.map((g) => [g._id, g.count]));
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 5 + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return {
          key,
          month: d.toLocaleString('en', { month: 'short' }),
          count: monthly.find((m) => m._id === key)?.count || 0,
        };
      });
      return {
        students,
        requests: grouped.reduce((n, g) => n + g.count, 0),
        pending: counts.Pending || 0,
        inProgress: counts['In Progress'] || 0,
        completed: counts.Completed || 0,
        cancelled: counts.Cancelled || 0,
        services: SERVICES.map((s) => ({
          slug: s.slug,
          name: s.shortName,
          count: services.find((g) => g._id === s.slug)?.count || 0,
        })),
        months,
      };
    },
  };
  return store;
}
