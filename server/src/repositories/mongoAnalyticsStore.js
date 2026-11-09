import AnalyticsVisitor from '../models/AnalyticsVisitor.js';
import AnalyticsSession from '../models/AnalyticsSession.js';
import AnalyticsPageView from '../models/AnalyticsPageView.js';
import AnalyticsPresence from '../models/AnalyticsPresence.js';
import AnalyticsActivity from '../models/AnalyticsActivity.js';
import AnalyticsRevocation from '../models/AnalyticsRevocation.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const REVOCATION_MS = 400 * DAY_MS;
const emptySummary = {
  uniqueVisitors: 0,
  totalSessions: 0,
  pageViews: 0,
  newVisitors: 0,
  returningVisitors: 0,
};

function localDateKey(value) {
  const shifted = new Date(new Date(value).getTime() + 330 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function mergeBuckets(activityRows, pageRows) {
  const buckets = new Map(activityRows.map((row) => [row.key, { ...row, pageViews: 0 }]));
  for (const row of pageRows) {
    const bucket = buckets.get(row.key) || {
      key: row.key,
      visitors: 0,
      newVisitors: 0,
      returningVisitors: 0,
      pageViews: 0,
    };
    bucket.pageViews = row.pageViews;
    buckets.set(row.key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function createMongoAnalyticsStore() {
  async function isRevoked(visitorKey) {
    return Boolean(await AnalyticsRevocation.exists({ visitorKey }));
  }

  async function removeVisitorData(visitorKey) {
    await Promise.all([
      AnalyticsVisitor.deleteOne({ visitorKey }),
      AnalyticsSession.deleteMany({ visitorKey }),
      AnalyticsActivity.deleteMany({ visitorKey }),
      AnalyticsPresence.deleteMany({ visitorKey }),
    ]);
  }

  return {
    async heartbeat(input) {
      if (await isRevoked(input.visitorKey)) return { denied: true };
      let visitor;
      try {
        visitor = await AnalyticsVisitor.findOneAndUpdate(
          { visitorKey: input.visitorKey },
          {
            $set: { lastSeenAt: input.now, retentionAt: input.retentionAt },
            $setOnInsert: { firstSeenAt: input.now },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
          .select('+visitorKey')
          .lean();
      } catch (error) {
        if (error.code !== 11000) throw error;
        visitor = await AnalyticsVisitor.findOneAndUpdate(
          { visitorKey: input.visitorKey },
          { $set: { lastSeenAt: input.now, retentionAt: input.retentionAt } },
          { new: true },
        )
          .select('+visitorKey')
          .lean();
        if (!visitor) throw error;
      }

      try {
        await AnalyticsActivity.updateOne(
          { visitorKey: input.visitorKey, dayKey: input.dayKey },
          {
            $set: { firstSeenAt: visitor.firstSeenAt, retentionAt: input.retentionAt },
            $setOnInsert: { visitorKey: input.visitorKey, dayKey: input.dayKey },
          },
          { upsert: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        await AnalyticsActivity.updateOne(
          { visitorKey: input.visitorKey, dayKey: input.dayKey },
          { $set: { firstSeenAt: visitor.firstSeenAt, retentionAt: input.retentionAt } },
        );
      }

      const sessionUpdate = {
        $set: {
          lastSeenAt: input.now,
          userType: input.userType,
          device: input.device,
          expiresAt: input.expiresAt,
          retentionAt: input.retentionAt,
        },
        $setOnInsert: {
          visitorKey: input.visitorKey,
          startedAt: input.now,
          source: input.source,
        },
      };
      try {
        await AnalyticsSession.findOneAndUpdate({ sessionKey: input.sessionKey }, sessionUpdate, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        await AnalyticsSession.updateOne({ sessionKey: input.sessionKey }, sessionUpdate.$set);
      }

      const presenceUpdate = {
        $set: {
          visitorKey: input.visitorKey,
          userType: input.userType,
          lastSeenAt: input.now,
          expiresAt: input.expiresAt,
        },
      };
      try {
        await AnalyticsPresence.findOneAndUpdate(
          { sessionKey: input.sessionKey },
          { ...presenceUpdate, $setOnInsert: { sessionKey: input.sessionKey } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        await AnalyticsPresence.updateOne({ sessionKey: input.sessionKey }, presenceUpdate.$set);
      }

      if (await isRevoked(input.visitorKey)) {
        await removeVisitorData(input.visitorKey);
        return { denied: true };
      }
      return { firstSeenAt: visitor.firstSeenAt };
    },

    async aggregatePageView(input) {
      const filter = { dayKey: input.dayKey, pageKey: input.pageKey };
      const update = {
        $inc: { pageViews: 1 },
        $set: { retentionAt: input.retentionAt },
        $setOnInsert: { dayKey: input.dayKey, pageKey: input.pageKey },
      };
      try {
        await AnalyticsPageView.updateOne(filter, update, { upsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
        await AnalyticsPageView.updateOne(filter, {
          $inc: { pageViews: 1 },
          $set: { retentionAt: input.retentionAt },
        });
      }
      return true;
    },

    async removeVisitor(visitorKey) {
      const now = new Date();
      await AnalyticsRevocation.updateOne(
        { visitorKey },
        { $setOnInsert: { revokedAt: now, expiresAt: new Date(now.getTime() + REVOCATION_MS) } },
        { upsert: true },
      );
      await removeVisitorData(visitorKey);
      return { deleted: true };
    },

    async live(now = new Date()) {
      const entries = await AnalyticsPresence.find({ expiresAt: { $gt: now } })
        .select('+visitorKey +sessionKey')
        .sort({ lastSeenAt: -1 })
        .lean();
      const latestByVisitor = new Map();
      for (const entry of entries)
        if (!latestByVisitor.has(entry.visitorKey)) latestByVisitor.set(entry.visitorKey, entry.userType);
      const counts = { total: latestByVisitor.size, anonymous: 0, student: 0, admin: 0 };
      for (const type of latestByVisitor.values()) if (Object.hasOwn(counts, type)) counts[type] += 1;
      return { ...counts, lastUpdatedAt: now };
    },

    async report(range) {
      const start = new Date(range.startAt);
      const end = new Date(range.endAt);
      const startKey = localDateKey(start);
      const endKey = localDateKey(end);
      const activityMatch = { dayKey: { $gte: startKey, $lte: endKey } };
      const pageMatch = { dayKey: { $gte: startKey, $lte: endKey } };
      const sessionMatch = { startedAt: { $gte: start, $lte: end } };

      const [
        summaryRows,
        activityDaily,
        activityMonthly,
        pageDaily,
        pageMonthly,
        pageSummary,
        deviceRows,
        sourceRows,
        popularPages,
        totalSessions,
      ] = await Promise.all([
        AnalyticsActivity.aggregate([
          { $match: activityMatch },
          {
            $group: {
              _id: null,
              visitorKeys: { $addToSet: '$visitorKey' },
              newVisitorKeys: {
                $addToSet: {
                  $cond: [
                    { $and: [{ $gte: ['$firstSeenAt', start] }, { $lte: ['$firstSeenAt', end] }] },
                    '$visitorKey',
                    null,
                  ],
                },
              },
              returningVisitorKeys: {
                $addToSet: { $cond: [{ $lt: ['$firstSeenAt', start] }, '$visitorKey', null] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              uniqueVisitors: { $size: '$visitorKeys' },
              newVisitors: { $size: { $setDifference: ['$newVisitorKeys', [null]] } },
              returningVisitors: { $size: { $setDifference: ['$returningVisitorKeys', [null]] } },
            },
          },
        ]),
        AnalyticsActivity.aggregate([
          { $match: activityMatch },
          {
            $project: {
              key: '$dayKey',
              firstSeenKey: {
                $dateToString: { format: '%Y-%m-%d', date: '$firstSeenAt', timezone: 'Asia/Kolkata' },
              },
              visitorKey: 1,
            },
          },
          {
            $group: {
              _id: '$key',
              visitorKeys: { $addToSet: '$visitorKey' },
              newVisitorKeys: {
                $addToSet: { $cond: [{ $eq: ['$firstSeenKey', '$key'] }, '$visitorKey', null] },
              },
              returningVisitorKeys: {
                $addToSet: { $cond: [{ $ne: ['$firstSeenKey', '$key'] }, '$visitorKey', null] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              key: '$_id',
              visitors: { $size: '$visitorKeys' },
              newVisitors: { $size: { $setDifference: ['$newVisitorKeys', [null]] } },
              returningVisitors: { $size: { $setDifference: ['$returningVisitorKeys', [null]] } },
            },
          },
          { $sort: { key: 1 } },
        ]),
        AnalyticsActivity.aggregate([
          { $match: activityMatch },
          {
            $project: {
              key: { $substrBytes: ['$dayKey', 0, 7] },
              firstSeenKey: {
                $dateToString: { format: '%Y-%m', date: '$firstSeenAt', timezone: 'Asia/Kolkata' },
              },
              visitorKey: 1,
            },
          },
          {
            $group: {
              _id: '$key',
              visitorKeys: { $addToSet: '$visitorKey' },
              newVisitorKeys: {
                $addToSet: { $cond: [{ $eq: ['$firstSeenKey', '$key'] }, '$visitorKey', null] },
              },
              returningVisitorKeys: {
                $addToSet: { $cond: [{ $ne: ['$firstSeenKey', '$key'] }, '$visitorKey', null] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              key: '$_id',
              visitors: { $size: '$visitorKeys' },
              newVisitors: { $size: { $setDifference: ['$newVisitorKeys', [null]] } },
              returningVisitors: { $size: { $setDifference: ['$returningVisitorKeys', [null]] } },
            },
          },
          { $sort: { key: 1 } },
        ]),
        AnalyticsPageView.aggregate([
          { $match: pageMatch },
          { $group: { _id: '$dayKey', pageViews: { $sum: '$pageViews' } } },
          { $project: { _id: 0, key: '$_id', pageViews: 1 } },
          { $sort: { key: 1 } },
        ]),
        AnalyticsPageView.aggregate([
          { $match: pageMatch },
          { $project: { key: { $substrBytes: ['$dayKey', 0, 7] }, pageViews: 1 } },
          { $group: { _id: '$key', pageViews: { $sum: '$pageViews' } } },
          { $project: { _id: 0, key: '$_id', pageViews: 1 } },
          { $sort: { key: 1 } },
        ]),
        AnalyticsPageView.aggregate([
          { $match: pageMatch },
          { $group: { _id: null, pageViews: { $sum: '$pageViews' } } },
          { $project: { _id: 0, pageViews: 1 } },
        ]),
        AnalyticsSession.aggregate([
          { $match: sessionMatch },
          {
            $group: {
              _id: '$device',
              sessions: { $sum: 1 },
              visitorKeys: { $addToSet: '$visitorKey' },
            },
          },
          { $project: { _id: 0, device: '$_id', sessions: 1, visitors: { $size: '$visitorKeys' } } },
          { $sort: { sessions: -1, device: 1 } },
        ]),
        AnalyticsSession.aggregate([
          { $match: sessionMatch },
          {
            $group: {
              _id: '$source',
              sessions: { $sum: 1 },
              visitorKeys: { $addToSet: '$visitorKey' },
            },
          },
          { $project: { _id: 0, source: '$_id', sessions: 1, visitors: { $size: '$visitorKeys' } } },
          { $sort: { sessions: -1, source: 1 } },
        ]),
        AnalyticsPageView.aggregate([
          { $match: pageMatch },
          { $group: { _id: '$pageKey', pageViews: { $sum: '$pageViews' } } },
          { $project: { _id: 0, key: '$_id', pageViews: 1 } },
          { $sort: { pageViews: -1, key: 1 } },
          { $limit: 10 },
        ]),
        AnalyticsSession.countDocuments(sessionMatch),
      ]);

      const summary = summaryRows[0]
        ? {
            ...summaryRows[0],
            totalSessions,
            pageViews: pageSummary[0]?.pageViews || 0,
          }
        : { ...emptySummary, totalSessions, pageViews: pageSummary[0]?.pageViews || 0 };
      return {
        summary,
        daily: mergeBuckets(activityDaily, pageDaily),
        monthly: mergeBuckets(activityMonthly, pageMonthly),
        devices: deviceRows,
        sources: sourceRows,
        popularPages,
      };
    },
  };
}
