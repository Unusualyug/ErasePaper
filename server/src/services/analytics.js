import { createHash } from 'node:crypto';
import { AppError } from '../utils/errors.js';

export const ANALYTICS_TIME_ZONE = 'Asia/Kolkata';
export const PRESENCE_TTL_MS = 75_000;
export const ANALYTICS_RETENTION_DAYS = 400;
export const ANALYTICS_RETENTION_MS = ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const INDIA_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const rangeNames = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 days',
  last30days: 'Last 30 days',
  thisMonth: 'Current month',
  last3months: 'Last 3 months',
  custom: 'Custom date range',
};
const allowedSources = new Set(['direct', 'search', 'social', 'referral', 'unknown']);
const servicePages = {
  'literature-review': ['literature-review', 'Literature Review service'],
  'research-paper': ['research-paper', 'Research Paper service'],
  'survey-paper': ['survey-paper', 'Survey Paper service'],
  'final-year-project': ['final-year-project', 'Final-Year Project service'],
  'bulk-printing': ['bulk-printing', 'Bulk Printing service'],
};

export const hashAnalyticsId = (value) => createHash('sha256').update(value).digest('hex');

function datePartsInIndia(value = new Date()) {
  const shifted = new Date(new Date(value).getTime() + INDIA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function addCalendarDays(parts, amount) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function indiaMidnight(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - INDIA_OFFSET_MS);
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day)
    return null;
  return { year, month, day };
}

export function dateKeyInIndia(value, granularity = 'day') {
  const { year, month, day } = datePartsInIndia(value);
  return granularity === 'month'
    ? `${year}-${String(month).padStart(2, '0')}`
    : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getAnalyticsRange(range = 'last7days', from, to, now = new Date()) {
  const today = datePartsInIndia(now);
  let startParts;
  let endAt = new Date(now);
  if (range === 'today') startParts = today;
  else if (range === 'yesterday') {
    startParts = addCalendarDays(today, -1);
    endAt = new Date(indiaMidnight(today).getTime() - 1);
  } else if (range === 'last7days') startParts = addCalendarDays(today, -6);
  else if (range === 'last30days') startParts = addCalendarDays(today, -29);
  else if (range === 'thisMonth') startParts = { ...today, day: 1 };
  else if (range === 'last3months') startParts = addCalendarDays(today, -89);
  else if (range === 'custom') {
    const customFrom = parseDate(from);
    const customTo = parseDate(to);
    if (!customFrom || !customTo)
      throw new AppError(
        400,
        'Choose a valid start and end date for the custom range.',
        'INVALID_DATE_RANGE',
      );
    const startAt = indiaMidnight(customFrom);
    const endOfDay = new Date(indiaMidnight(addCalendarDays(customTo, 1)).getTime() - 1);
    const todayKey = dateKeyInIndia(now);
    const customToKey = `${customTo.year}-${String(customTo.month).padStart(2, '0')}-${String(customTo.day).padStart(2, '0')}`;
    if (endOfDay < startAt || customToKey > todayKey)
      throw new AppError(
        400,
        'The end date must be on or after the start date and no later than today.',
        'INVALID_DATE_RANGE',
      );
    if (endOfDay.getTime() - startAt.getTime() > 367 * DAY_MS)
      throw new AppError(
        400,
        'Custom analytics ranges are limited to 367 calendar days.',
        'DATE_RANGE_TOO_LARGE',
      );
    return { id: range, label: rangeNames[range], startAt, endAt: endOfDay, timeZone: ANALYTICS_TIME_ZONE };
  } else {
    throw new AppError(400, 'Choose a supported analytics date range.', 'INVALID_ANALYTICS_RANGE');
  }
  return {
    id: range,
    label: rangeNames[range],
    startAt: indiaMidnight(startParts),
    endAt,
    timeZone: ANALYTICS_TIME_ZONE,
  };
}

function keyParts(key, granularity) {
  return granularity === 'month'
    ? { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), day: 1 }
    : { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), day: Number(key.slice(8, 10)) };
}

export function buildTrendKeys(range, granularity = 'day') {
  const first = datePartsInIndia(range.startAt);
  const last = datePartsInIndia(range.endAt);
  let cursor = granularity === 'month' ? { ...first, day: 1 } : { ...first };
  const end = granularity === 'month' ? { ...last, day: 1 } : last;
  const keys = [];
  for (let guard = 0; guard < 400; guard++) {
    const key = dateKeyInIndia(indiaMidnight(cursor), granularity);
    keys.push(key);
    if (key === dateKeyInIndia(indiaMidnight(end), granularity)) break;
    cursor =
      granularity === 'month'
        ? cursor.month === 12
          ? { year: cursor.year + 1, month: 1, day: 1 }
          : { ...cursor, month: cursor.month + 1 }
        : addCalendarDays(cursor, 1);
  }
  return keys.map((key) => {
    const parts = keyParts(key, granularity);
    const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
    const label = new Intl.DateTimeFormat('en-IN', {
      timeZone: ANALYTICS_TIME_ZONE,
      ...(granularity === 'month' ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }),
    }).format(utc);
    return { key, label };
  });
}

export function normalizePage({ path = '/', hash = '', serviceSlug = '' } = {}) {
  const normalizedPath =
    typeof path === 'string' && path.startsWith('/') ? path.split('?')[0].slice(0, 300) : '/';
  const slug = typeof serviceSlug === 'string' ? serviceSlug : '';
  if (servicePages[slug]) return { key: servicePages[slug][0], title: servicePages[slug][1] };
  if (normalizedPath === '/') {
    const section = String(hash).replace(/^#/, '').toLowerCase();
    const sections = {
      services: ['services', 'Services'],
      'how-it-works': ['how-it-works', 'How it works'],
      'why-us': ['why-us', 'Why ErasePaper'],
      faqs: ['faqs', 'FAQs'],
    };
    return sections[section]
      ? { key: sections[section][0], title: sections[section][1] }
      : { key: 'home', title: 'Homepage' };
  }
  if (normalizedPath === '/sign-in') return { key: 'sign-in', title: 'Sign in' };
  if (normalizedPath === '/sign-up') return { key: 'sign-up', title: 'Create account' };
  if (normalizedPath === '/dashboard') return { key: 'student-dashboard', title: 'Student dashboard' };
  if (normalizedPath === '/requests') return { key: 'student-requests', title: 'My requests' };
  if (normalizedPath === '/requests/new') return { key: 'new-request', title: 'New service request' };
  if (/^\/requests\/[^/]+/.test(normalizedPath)) return { key: 'request-details', title: 'Request details' };
  if (normalizedPath === '/profile') return { key: 'student-profile', title: 'Student profile' };
  if (normalizedPath === '/privacy-policy') return { key: 'privacy-policy', title: 'Privacy policy' };
  if (normalizedPath === '/cookie-policy') return { key: 'cookie-policy', title: 'Cookie policy' };
  if (normalizedPath === '/terms-and-conditions') return { key: 'terms', title: 'Terms and conditions' };
  if (normalizedPath === '/admin') return { key: 'admin-overview', title: 'Admin overview' };
  if (/^\/admin\/students\/[^/]+/.test(normalizedPath))
    return { key: 'admin-student-details', title: 'Admin student details' };
  if (normalizedPath === '/admin/students') return { key: 'admin-students', title: 'Admin students' };
  if (normalizedPath === '/admin/requests') return { key: 'admin-requests', title: 'Admin requests' };
  if (normalizedPath === '/admin/activity') return { key: 'admin-activity', title: 'Admin activity' };
  if (normalizedPath === '/admin/settings') return { key: 'admin-settings', title: 'Admin settings' };
  if (normalizedPath === '/admin/analytics') return { key: 'admin-analytics', title: 'Website analytics' };
  return { key: 'other', title: 'Other pages' };
}

export function normalizeAnalyticsSource(value) {
  return allowedSources.has(value) ? value : 'unknown';
}

export function createAnalyticsService(store) {
  function identifiers(input) {
    return {
      visitorKey: hashAnalyticsId(input.visitorId),
      sessionKey: hashAnalyticsId(input.sessionId),
    };
  }

  function classify(user) {
    return user?.role === 'admin' ? 'admin' : user?.role === 'student' ? 'student' : 'anonymous';
  }

  async function heartbeat(input, user, userAgent) {
    const ids = identifiers(input);
    const page = normalizePage(input);
    const now = new Date();
    const device = classifyDevice(userAgent);
    const source = normalizeAnalyticsSource(input.source);
    return store.analytics.heartbeat({
      ...ids,
      userType: classify(user),
      device,
      source,
      pageKey: page.key,
      dayKey: dateKeyInIndia(now),
      now,
      expiresAt: new Date(now.getTime() + PRESENCE_TTL_MS),
      retentionAt: new Date(now.getTime() + ANALYTICS_RETENTION_MS),
    });
  }

  async function pageView(input, user, userAgent) {
    const ids = identifiers(input);
    const page = normalizePage(input);
    const now = new Date();
    const dayKey = dateKeyInIndia(now);
    const visitor = await store.analytics.heartbeat({
      ...ids,
      userType: classify(user),
      device: classifyDevice(userAgent),
      source: normalizeAnalyticsSource(input.source),
      pageKey: page.key,
      dayKey,
      now,
      expiresAt: new Date(now.getTime() + PRESENCE_TTL_MS),
      retentionAt: new Date(now.getTime() + ANALYTICS_RETENTION_MS),
    });
    if (visitor.denied) return { recorded: false };
    const recorded = await store.analytics.pageView({
      visitorKey: ids.visitorKey,
      pageKey: page.key,
      dayKey,
      retentionAt: new Date(now.getTime() + ANALYTICS_RETENTION_MS),
    });
    return { recorded };
  }

  function removeVisitor(visitorId) {
    return store.analytics.removeVisitor(hashAnalyticsId(visitorId));
  }

  async function report(range) {
    const raw = await store.analytics.report(range);
    const dailyRaw = new Map(raw.daily.map((item) => [item.key, item]));
    const monthlyRaw = new Map(raw.monthly.map((item) => [item.key, item]));
    const daily = buildTrendKeys(range, 'day').map(({ key, label }) => {
      const item = dailyRaw.get(key) || {};
      return {
        key,
        label,
        visitors: item.visitors || 0,
        pageViews: item.pageViews || 0,
        newVisitors: item.newVisitors || 0,
        returningVisitors: item.returningVisitors || 0,
      };
    });
    const monthly = buildTrendKeys(range, 'month').map(({ key, label }) => {
      const item = monthlyRaw.get(key) || {};
      return {
        key,
        label,
        visitors: item.visitors || 0,
        pageViews: item.pageViews || 0,
        newVisitors: item.newVisitors || 0,
        returningVisitors: item.returningVisitors || 0,
      };
    });
    const live = await store.analytics.live(new Date());
    return {
      range: {
        id: range.id,
        label: range.label,
        startAt: range.startAt,
        endAt: range.endAt,
        timeZone: range.timeZone,
      },
      summary: raw.summary,
      live: { ...live, timeZone: ANALYTICS_TIME_ZONE },
      dailyTrends: daily,
      monthlyTrends: monthly,
      pageViewTrends: daily.map(({ key, label, pageViews }) => ({ key, label, pageViews })),
      newReturningTrends: daily.map(({ key, label, newVisitors, returningVisitors }) => ({
        key,
        label,
        newVisitors,
        returningVisitors,
      })),
      devices: raw.devices,
      sources: raw.sources,
      popularPages: raw.popularPages,
      retentionDays: ANALYTICS_RETENTION_DAYS,
    };
  }

  return { heartbeat, pageView, removeVisitor, report };
}

function classifyDevice(userAgent = '') {
  const agent = String(userAgent).toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(agent) || (/android/.test(agent) && !/mobile/.test(agent)))
    return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(agent)) return 'mobile';
  return 'desktop';
}
