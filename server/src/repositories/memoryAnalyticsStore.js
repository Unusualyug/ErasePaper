const clone = (value) => (value == null ? null : structuredClone(value));
const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(value) {
  const shifted = new Date(new Date(value).getTime() + 330 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function withinRange(value, start, end) {
  const time = new Date(value).getTime();
  return time >= start && time <= end;
}

export function createMemoryAnalyticsStore(data) {
  data.analyticsVisitors ||= [];
  data.analyticsSessions ||= [];
  data.analyticsPageViews ||= [];
  data.analyticsPresence ||= [];
  data.analyticsActivity ||= [];
  data.analyticsRevocations ||= [];

  function purge(now = new Date()) {
    const current = now.getTime();
    data.analyticsVisitors = data.analyticsVisitors.filter(
      (item) => new Date(item.retentionAt).getTime() > current,
    );
    data.analyticsSessions = data.analyticsSessions.filter(
      (item) => new Date(item.retentionAt).getTime() > current,
    );
    data.analyticsPageViews = data.analyticsPageViews.filter(
      (item) => new Date(item.retentionAt).getTime() > current,
    );
    data.analyticsPresence = data.analyticsPresence.filter(
      (item) => new Date(item.expiresAt).getTime() > current,
    );
    data.analyticsActivity = data.analyticsActivity.filter(
      (item) => new Date(item.retentionAt).getTime() > current,
    );
    data.analyticsRevocations = data.analyticsRevocations.filter(
      (item) => new Date(item.expiresAt).getTime() > current,
    );
  }

  function removeVisitorData(visitorKey) {
    data.analyticsVisitors = data.analyticsVisitors.filter((item) => item.visitorKey !== visitorKey);
    data.analyticsSessions = data.analyticsSessions.filter((item) => item.visitorKey !== visitorKey);
    data.analyticsActivity = data.analyticsActivity.filter((item) => item.visitorKey !== visitorKey);
    data.analyticsPresence = data.analyticsPresence.filter((item) => item.visitorKey !== visitorKey);
  }

  return {
    async heartbeat(input) {
      purge(input.now);
      if (data.analyticsRevocations.some((item) => item.visitorKey === input.visitorKey))
        return { denied: true };

      let visitor = data.analyticsVisitors.find((item) => item.visitorKey === input.visitorKey);
      if (!visitor) {
        visitor = {
          visitorKey: input.visitorKey,
          firstSeenAt: input.now,
          lastSeenAt: input.now,
          retentionAt: input.retentionAt,
        };
        data.analyticsVisitors.push(visitor);
      } else {
        visitor.lastSeenAt = input.now;
        visitor.retentionAt = input.retentionAt;
      }

      const hasActivity = data.analyticsActivity.some(
        (item) => item.visitorKey === input.visitorKey && item.dayKey === input.dayKey,
      );
      if (!hasActivity) {
        data.analyticsActivity.push({
          visitorKey: input.visitorKey,
          dayKey: input.dayKey,
          firstSeenAt: new Date(visitor.firstSeenAt),
          retentionAt: input.retentionAt,
        });
      }

      let session = data.analyticsSessions.find((item) => item.sessionKey === input.sessionKey);
      if (!session) {
        session = {
          sessionKey: input.sessionKey,
          visitorKey: input.visitorKey,
          startedAt: input.now,
          lastSeenAt: input.now,
          userType: input.userType,
          device: input.device,
          source: input.source,
          expiresAt: input.expiresAt,
          retentionAt: input.retentionAt,
        };
        data.analyticsSessions.push(session);
      } else {
        Object.assign(session, {
          lastSeenAt: input.now,
          userType: input.userType,
          device: input.device,
          expiresAt: input.expiresAt,
          retentionAt: input.retentionAt,
        });
      }

      let presence = data.analyticsPresence.find((item) => item.sessionKey === input.sessionKey);
      if (!presence) {
        presence = {
          sessionKey: input.sessionKey,
          visitorKey: input.visitorKey,
          userType: input.userType,
          lastSeenAt: input.now,
          expiresAt: input.expiresAt,
        };
        data.analyticsPresence.push(presence);
      } else {
        Object.assign(presence, {
          visitorKey: input.visitorKey,
          userType: input.userType,
          lastSeenAt: input.now,
          expiresAt: input.expiresAt,
        });
      }

      if (data.analyticsRevocations.some((item) => item.visitorKey === input.visitorKey)) {
        removeVisitorData(input.visitorKey);
        return { denied: true };
      }
      return { firstSeenAt: new Date(visitor.firstSeenAt) };
    },

    async pageView(input) {
      if (data.analyticsRevocations.some((item) => item.visitorKey === input.visitorKey)) return false;
      let bucket = data.analyticsPageViews.find(
        (item) => item.pageKey === input.pageKey && item.dayKey === input.dayKey,
      );
      if (!bucket) {
        bucket = {
          pageKey: input.pageKey,
          dayKey: input.dayKey,
          pageViews: 0,
          retentionAt: input.retentionAt,
        };
        data.analyticsPageViews.push(bucket);
      }
      bucket.pageViews += 1;
      bucket.retentionAt = input.retentionAt;
      if (data.analyticsRevocations.some((item) => item.visitorKey === input.visitorKey)) {
        bucket.pageViews = Math.max(0, bucket.pageViews - 1);
        return false;
      }
      return true;
    },

    async removeVisitor(visitorKey) {
      const now = new Date();
      if (!data.analyticsRevocations.some((item) => item.visitorKey === visitorKey))
        data.analyticsRevocations.push({
          visitorKey,
          revokedAt: now,
          expiresAt: new Date(now.getTime() + 400 * DAY_MS),
        });
      removeVisitorData(visitorKey);
      return { deleted: true };
    },

    async live(now = new Date()) {
      purge(now);
      const activeByVisitor = new Map();
      for (const entry of [...data.analyticsPresence].sort(
        (a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt),
      )) {
        if (!activeByVisitor.has(entry.visitorKey)) activeByVisitor.set(entry.visitorKey, entry.userType);
      }
      const counts = { total: activeByVisitor.size, anonymous: 0, student: 0, admin: 0 };
      for (const type of activeByVisitor.values()) if (Object.hasOwn(counts, type)) counts[type] += 1;
      return { ...counts, lastUpdatedAt: new Date(now) };
    },

    async report(range) {
      purge(new Date());
      const start = new Date(range.startAt).getTime();
      const end = new Date(range.endAt).getTime();
      const startKey = dateKey(range.startAt);
      const endKey = dateKey(range.endAt);
      const activities = data.analyticsActivity.filter(
        (item) => item.dayKey >= startKey && item.dayKey <= endKey,
      );
      const sessions = data.analyticsSessions.filter((item) => withinRange(item.startedAt, start, end));
      const pageBuckets = data.analyticsPageViews.filter(
        (item) => item.dayKey >= startKey && item.dayKey <= endKey,
      );
      const visitorFirstSeen = new Map();
      for (const item of activities) {
        if (
          !visitorFirstSeen.has(item.visitorKey) ||
          new Date(item.firstSeenAt) < visitorFirstSeen.get(item.visitorKey)
        )
          visitorFirstSeen.set(item.visitorKey, new Date(item.firstSeenAt));
      }
      const summary = {
        uniqueVisitors: visitorFirstSeen.size,
        totalSessions: sessions.length,
        pageViews: pageBuckets.reduce((sum, item) => sum + item.pageViews, 0),
        newVisitors: [...visitorFirstSeen.values()].filter(
          (value) => value.getTime() >= start && value.getTime() <= end,
        ).length,
        returningVisitors: [...visitorFirstSeen.values()].filter((value) => value.getTime() < start).length,
      };

      const trends = (granularity) => {
        const groups = new Map();
        const keyFor = (key) => (granularity === 'month' ? key.slice(0, 7) : key);
        const ensure = (key) => {
          if (!groups.has(key))
            groups.set(key, {
              visitors: new Set(),
              newVisitors: new Set(),
              returningVisitors: new Set(),
              pageViews: 0,
            });
          return groups.get(key);
        };
        for (const item of activities) {
          const key = keyFor(item.dayKey);
          const group = ensure(key);
          group.visitors.add(item.visitorKey);
          const firstSeenKey = dateKey(item.firstSeenAt);
          const firstBucket = keyFor(firstSeenKey);
          (firstBucket === key ? group.newVisitors : group.returningVisitors).add(item.visitorKey);
        }
        for (const item of pageBuckets) ensure(keyFor(item.dayKey)).pageViews += item.pageViews;
        return [...groups.entries()].map(([key, value]) => ({
          key,
          visitors: value.visitors.size,
          newVisitors: value.newVisitors.size,
          returningVisitors: value.returningVisitors.size,
          pageViews: value.pageViews,
        }));
      };

      const categoryCounts = (field) => {
        const groups = new Map();
        for (const session of sessions) {
          const key = session[field] || 'unknown';
          if (!groups.has(key)) groups.set(key, { sessions: 0, visitors: new Set() });
          const group = groups.get(key);
          group.sessions += 1;
          group.visitors.add(session.visitorKey);
        }
        return [...groups.entries()]
          .map(([key, value]) => ({ [field]: key, sessions: value.sessions, visitors: value.visitors.size }))
          .sort((a, b) => b.sessions - a.sessions);
      };

      const pageCounts = new Map();
      for (const item of pageBuckets)
        pageCounts.set(item.pageKey, (pageCounts.get(item.pageKey) || 0) + item.pageViews);
      const popularPages = [...pageCounts.entries()]
        .map(([key, pageViews]) => ({ key, pageViews }))
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, 10);

      return {
        summary,
        daily: trends('day'),
        monthly: trends('month'),
        devices: categoryCounts('device'),
        sources: categoryCounts('source'),
        popularPages,
      };
    },
  };
}
