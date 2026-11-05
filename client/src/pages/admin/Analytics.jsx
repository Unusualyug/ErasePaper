import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Eye,
  Globe2,
  Layers3,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  UsersRound,
} from 'lucide-react';
import api, { errorMessage } from '../../lib/api';
import { useAppAuth } from '../../context/AuthContext';
import { PageHeading, Spinner, ErrorState } from '../../components/UI';

const numberFormat = new Intl.NumberFormat('en-IN');
const periodOptions = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last7days', 'Last 7 days'],
  ['last30days', 'Last 30 days'],
  ['thisMonth', 'Current month'],
  ['last3months', 'Last 3 months'],
  ['custom', 'Custom dates'],
];
const pageLabels = {
  home: 'Homepage',
  services: 'Services section',
  'how-it-works': 'How it works',
  'why-us': 'Why ErasePaper',
  faqs: 'FAQs',
  'sign-in': 'Sign in',
  'sign-up': 'Create account',
  'student-dashboard': 'Student dashboard',
  'student-requests': 'My requests',
  'new-request': 'New service request',
  'request-details': 'Request details',
  'student-profile': 'Student profile',
  'privacy-policy': 'Privacy policy',
  'cookie-policy': 'Cookie policy',
  terms: 'Terms and conditions',
  'admin-overview': 'Admin overview',
  'admin-students': 'Admin students',
  'admin-student-details': 'Admin student details',
  'admin-requests': 'Admin requests',
  'admin-activity': 'Admin activity',
  'admin-settings': 'Admin settings',
  'admin-analytics': 'Website analytics',
  'literature-review': 'Literature Review service',
  'research-paper': 'Research Paper service',
  'survey-paper': 'Survey Paper service',
  'final-year-project': 'Final-Year Project service',
  'bulk-printing': 'Bulk Printing service',
  other: 'Other pages',
};
const deviceLabels = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' };
const sourceLabels = {
  direct: 'Direct',
  search: 'Search',
  social: 'Social',
  referral: 'Referral',
  unknown: 'Other / unknown',
};
const deviceIcons = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

function localDateValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateDaysAgo(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function relativeTime(value, now = Date.now()) {
  if (!value) return 'Waiting for the first update';
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

function MetricCard({ icon: Icon, label, value, description, tone = 'brand' }) {
  const toneClasses = {
    brand: 'bg-brand-500/10 text-brand-300',
    blue: 'bg-blue-500/10 text-blue-300',
    teal: 'bg-teal-500/10 text-teal-300',
    amber: 'bg-amber-500/10 text-amber-300',
  };
  return (
    <section className="admin-card min-w-0 p-5" aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
            {numberFormat.format(value || 0)}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">{description}</p>
    </section>
  );
}

function TrendChart({ data, metric }) {
  const width = 760;
  const height = 260;
  const pad = { top: 20, right: 18, bottom: 42, left: 42 };
  const values = data.map((item) => Number(item[metric] || 0));
  const maximum = Math.max(1, ...values);
  const scaleMaximum = Math.max(4, Math.ceil(maximum / 4) * 4);
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = (index) =>
    pad.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value) => pad.top + plotHeight - (value / scaleMaximum) * plotHeight;
  const hasData = values.some((value) => value > 0);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((scaleMaximum * index) / 4));

  return (
    <div className="relative min-h-[275px] w-full overflow-x-auto overflow-y-hidden">
      {hasData ? (
        <svg
          className="analytics-trend-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${metric === 'visitors' ? 'Unique visitors' : 'Page views'} trend`}
        >
          <defs>
            <linearGradient id="analytics-line-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b78f4" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#8b78f4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick, index) => {
            const gridY = pad.top + plotHeight - (index / 4) * plotHeight;
            return (
              <g key={`${tick}-${index}`}>
                <line
                  className="analytics-chart-grid"
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={gridY}
                  y2={gridY}
                />
                <text className="analytics-chart-label" x={pad.left - 9} y={gridY + 4} textAnchor="end">
                  {tick}
                </text>
              </g>
            );
          })}
          <polygon
            points={`${pad.left},${pad.top + plotHeight} ${points} ${width - pad.right},${pad.top + plotHeight}`}
            fill="url(#analytics-line-fill)"
          />
          <polyline className="analytics-chart-line" points={points} />
          {values.map((value, index) => (
            <g key={data[index].key}>
              <circle className="analytics-chart-point" cx={x(index)} cy={y(value)} r="3.5">
                <title>{`${data[index].label}: ${numberFormat.format(value)}`}</title>
              </circle>
              {(index % labelStep === 0 || index === data.length - 1) && (
                <text className="analytics-chart-label" x={x(index)} y={height - 13} textAnchor="middle">
                  {data[index].label}
                </text>
              )}
            </g>
          ))}
        </svg>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
          <div className="mb-3 rounded-xl bg-brand-500/10 p-3 text-brand-300">
            <Eye size={22} />
          </div>
          <p className="text-sm font-medium">No activity recorded in this period</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
            This chart will reflect real, consented visits as they are collected. No sample traffic is
            included.
          </p>
        </div>
      )}
    </div>
  );
}

function NewReturningBars({ data }) {
  const max = Math.max(1, ...data.map((item) => item.newVisitors + item.returningVisitors));
  const hasData = data.some((item) => item.newVisitors + item.returningVisitors > 0);
  const labelStep = Math.max(1, Math.ceil(data.length / 7));
  if (!hasData)
    return (
      <div className="flex min-h-[165px] flex-col items-center justify-center text-center">
        <UsersRound size={23} className="text-slate-500" />
        <p className="mt-3 text-sm font-medium">No new or returning visitors yet</p>
        <p className="mt-1 text-xs text-slate-500">Counts update after consented page views are received.</p>
      </div>
    );
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[560px] items-end gap-2 pt-5" style={{ height: 170 }}>
        {data.map((item, index) => {
          const total = item.newVisitors + item.returningVisitors;
          const height = Math.max(3, (total / max) * 112);
          const freshHeight = total ? (item.newVisitors / total) * height : 0;
          const returningHeight = total ? (item.returningVisitors / total) * height : 0;
          return (
            <div
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              key={item.key}
            >
              <div
                className="flex w-full max-w-[30px] flex-col justify-end overflow-hidden rounded-t-md"
                style={{ height: total ? `${height}px` : '2px' }}
                title={`${item.label}: ${numberFormat.format(item.newVisitors)} new, ${numberFormat.format(item.returningVisitors)} returning`}
                aria-label={`${item.label}: ${item.newVisitors} new and ${item.returningVisitors} returning visitors`}
              >
                {item.returningVisitors > 0 && (
                  <span className="block w-full bg-teal-400" style={{ height: `${returningHeight}px` }} />
                )}
                {item.newVisitors > 0 && (
                  <span className="block w-full bg-brand-400" style={{ height: `${freshHeight}px` }} />
                )}
              </div>
              {(index % labelStep === 0 || index === data.length - 1) && (
                <span className="whitespace-nowrap text-[9px] text-slate-500">{item.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DistributionList({ title, subtitle, icon: Icon, items, kind }) {
  const isDevice = kind === 'device';
  const total = items.reduce((sum, item) => sum + item.sessions, 0);
  const max = Math.max(1, ...items.map((item) => item.sessions));
  const IconForDevice = (value) => deviceIcons[value] || Globe2;
  return (
    <section className="admin-card min-w-0 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-brand-500/10 p-2.5 text-brand-300">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{subtitle}</p>
        </div>
      </div>
      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const key = isDevice ? item.device : item.source;
            const ItemIcon = isDevice ? IconForDevice(key) : Globe2;
            const label = isDevice ? deviceLabels[key] || 'Other' : sourceLabels[key] || 'Other / unknown';
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-300">
                    <ItemIcon size={14} className="shrink-0 text-slate-500" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {numberFormat.format(item.sessions)} sessions · {numberFormat.format(item.visitors)}{' '}
                    visitors
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-[width] duration-500"
                    style={{ width: `${Math.max(2, (item.sessions / max) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-[10px] text-slate-500">
            {numberFormat.format(total)} consented sessions in this category.
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-7 text-center text-xs text-slate-500">
          No consented sessions recorded in this period.
        </p>
      )}
    </section>
  );
}

function PopularPages({ pages }) {
  return (
    <section className="admin-card min-w-0 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Popular pages & services</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Daily page totals only — not linked to visitor or session records.
          </p>
        </div>
        <Layers3 size={18} className="shrink-0 text-brand-300" />
      </div>
      {pages.length ? (
        <div className="mt-4 w-full min-w-0">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="w-[72%] py-3 pr-2 font-medium">Page or service</th>
                <th className="w-[28%] py-3 pl-2 text-right font-medium">Page views</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((item, index) => (
                <tr key={item.key} className="border-b border-white/[.06] last:border-0">
                  <td className="break-words py-3 pr-2">
                    <span className="mr-1 text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    {pageLabels[item.key] || 'Other pages'}
                  </td>
                  <td className="py-3 pl-2 text-right tabular-nums">{numberFormat.format(item.pageViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-white/10 px-4 py-8 text-center">
          <Eye size={21} className="mx-auto text-slate-500" />
          <p className="mt-3 text-xs text-slate-500">
            Popular pages appear after real, consented page views are recorded.
          </p>
        </div>
      )}
    </section>
  );
}

export default function AdminAnalytics() {
  const { mode } = useAppAuth();
  const today = useMemo(() => localDateValue(), []);
  const [period, setPeriod] = useState('last7days');
  const [fromDate, setFromDate] = useState(() => dateDaysAgo(today, 6));
  const [toDate, setToDate] = useState(today);
  const [applied, setApplied] = useState({ range: 'last7days' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [bucket, setBucket] = useState('daily');
  const [metric, setMetric] = useState('visitors');
  const [clock, setClock] = useState(Date.now());

  const params = useMemo(() => {
    if (applied.range === 'custom') return { range: 'custom', from: applied.from, to: applied.to };
    return { range: applied.range };
  }, [applied]);

  const loadReport = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const response = await api.get('/admin/analytics', { params });
        setData(response.data);
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params],
  );

  useEffect(() => {
    void loadReport(false);
    const refreshId = window.setInterval(() => void loadReport(true), 30_000);
    return () => window.clearInterval(refreshId);
  }, [loadReport]);

  useEffect(() => {
    const clockId = window.setInterval(() => setClock(Date.now()), 5_000);
    return () => window.clearInterval(clockId);
  }, []);

  function applyFilters(event) {
    event.preventDefault();
    setFilterError('');
    if (period === 'custom') {
      if (!fromDate || !toDate || fromDate > toDate) {
        setFilterError('Choose a valid start date and an end date on or after it.');
        return;
      }
      if (toDate > today) {
        setFilterError('The end date cannot be in the future (India Standard Time).');
        return;
      }
      setApplied({ range: 'custom', from: fromDate, to: toDate });
    } else {
      setApplied({ range: period });
    }
  }

  const summary = data?.summary || {};
  const live = data?.live || { total: 0, anonymous: 0, student: 0, admin: 0 };
  const trendData = bucket === 'monthly' ? data?.monthlyTrends || [] : data?.dailyTrends || [];
  const formattedRange = data?.range
    ? `${formatDate(data.range.startAt)} – ${formatDate(data.range.endAt)} · ${data.range.timeZone}`
    : '—';
  const liveUpdated = live.lastUpdatedAt
    ? relativeTime(live.lastUpdatedAt, clock)
    : 'Waiting for the first update';

  if (loading && !data)
    return <Spinner label="Loading consented website analytics…" className="min-h-[55vh]" />;
  if (error && !data) return <ErrorState message={error} onRetry={() => loadReport(false)} />;

  return (
    <>
      <PageHeading
        eyebrow="First-party · consent-based"
        title="Website analytics"
        description="Live presence and aggregate traffic from real page-view events. Visitor-level browsing histories are not exposed."
        action={
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => loadReport(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {error && data && (
        <div
          className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[.06] px-4 py-3 text-xs text-amber-300"
          role="status"
        >
          Could not refresh the report. Showing the last successful result. {error}
        </div>
      )}

      <section className="admin-card mb-6 overflow-hidden p-5 sm:p-6" aria-labelledby="live-visitors-title">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <Activity size={20} />
              {live.total > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-emerald-500/10 bg-emerald-400" />
              )}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id="live-visitors-title" className="text-sm font-semibold">
                  Live consented visitors
                </h2>
                <span className="text-[10px] text-slate-500">{liveUpdated}</span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Unique visitors with Analytics consent and a recent heartbeat. Heartbeats stop after 2 minutes
                idle; stale presence then expires within 75 seconds.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-5 md:gap-7">
            <div className="min-w-[72px]">
              <p className="text-3xl font-semibold tabular-nums">{numberFormat.format(live.total || 0)}</p>
              <p className="mt-1 text-[10px] text-slate-500">online now</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['Anonymous', live.anonymous, 'border-slate-500/20 bg-white/[.03] text-slate-300'],
                ['Students', live.student, 'border-blue-400/20 bg-blue-500/[.06] text-blue-300'],
                ['Admins', live.admin, 'border-brand-400/20 bg-brand-500/[.06] text-brand-300'],
              ].map(([label, value, style]) => (
                <span key={label} className={`rounded-full border px-3 py-1.5 text-[10px] ${style}`}>
                  {label} <strong className="ml-1 tabular-nums">{numberFormat.format(value || 0)}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={applyFilters} className="admin-card mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="admin-label mb-0 min-w-[180px]">
              Reporting period
              <select
                className="admin-input mt-2"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                {periodOptions.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {period === 'custom' && (
              <>
                <label className="admin-label mb-0">
                  From
                  <input
                    className="admin-input mt-2"
                    type="date"
                    value={fromDate}
                    max={today}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </label>
                <label className="admin-label mb-0">
                  To
                  <input
                    className="admin-input mt-2"
                    type="date"
                    value={toDate}
                    max={today}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </label>
              </>
            )}
            <button type="submit" className="btn-primary btn-sm min-h-[42px]">
              <CalendarDays size={14} /> Apply period
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} /> Aggregated only
            </span>
            <span>All dates in Asia/Kolkata</span>
            <span>{formattedRange}</span>
          </div>
        </div>
        {filterError && (
          <p className="mt-3 text-xs text-rose-400" role="alert">
            {filterError}
          </p>
        )}
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label="Unique visitors"
          value={summary.uniqueVisitors}
          description="Consented pseudonymous visitors in this period."
          tone="brand"
        />
        <MetricCard
          icon={Layers3}
          label="Sessions"
          value={summary.totalSessions}
          description="Distinct consented browser sessions observed during the period."
          tone="blue"
        />
        <MetricCard
          icon={Eye}
          label="Page views"
          value={summary.pageViews}
          description="Daily page totals are stored without visitor or session links."
          tone="teal"
        />
        <MetricCard
          icon={Activity}
          label="New visitors"
          value={summary.newVisitors}
          description={`${numberFormat.format(summary.returningVisitors || 0)} returning visitors in this period.`}
          tone="amber"
        />
      </div>

      <section className="admin-card mb-6 min-w-0 p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Traffic trends</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Daily and monthly trends use the same selected reporting period.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="analytics-toggle-group" role="group" aria-label="Trend interval">
              {['daily', 'monthly'].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={bucket === value}
                  onClick={() => setBucket(value)}
                >
                  {value === 'daily' ? 'Daily' : 'Monthly'}
                </button>
              ))}
            </div>
            <div className="analytics-toggle-group" role="group" aria-label="Trend metric">
              {[
                ['visitors', 'Visitors'],
                ['pageViews', 'Page views'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={metric === value}
                  onClick={() => setMetric(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <TrendChart data={trendData} metric={metric} />
      </section>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <section className="admin-card min-w-0 p-5 sm:p-6">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">New vs returning visitors</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Visitor classification is based on first-seen time, not an exposed browsing history.
              </p>
            </div>
            <UsersRound size={18} className="shrink-0 text-brand-300" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-sm bg-brand-400" /> New
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-sm bg-teal-400" /> Returning
            </span>
            <span className="text-slate-500">{bucket === 'daily' ? 'Daily' : 'Monthly'} buckets</span>
          </div>
          <NewReturningBars
            data={bucket === 'monthly' ? data?.monthlyTrends || [] : data?.dailyTrends || []}
          />
        </section>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <DistributionList
            title="Devices"
            subtitle="Coarse category inferred from the request header; raw user-agent strings are not stored."
            icon={Smartphone}
            items={data?.devices || []}
            kind="device"
          />
          <DistributionList
            title="Traffic sources"
            subtitle="Direct, search, social and referral categories; referrer URLs are not retained."
            icon={Globe2}
            items={data?.sources || []}
            kind="source"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PopularPages pages={data?.popularPages || []} />
        <section className="admin-card min-w-0 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Privacy & collection status</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                The tracker runs only after a visitor grants Analytics consent.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
            <li className="flex gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Random visitor/session IDs are hashed server-side; no raw IP address, full URL query, or full
                referrer is stored.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">•</span>
              <span>Admins can view aggregates only, never an individual visitor's page sequence.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Analytics is kept separate from student and service-request records, with a{' '}
                {data?.retentionDays || 400}-day retention window.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Withdrawing consent stops tracking and removes linked visitor/session records; unlinkable
                daily page totals remain aggregated.
              </span>
            </li>
          </ul>
          {mode === 'demo' && (
            <p className="mt-4 rounded-lg border border-brand-400/15 bg-brand-500/[.05] p-3 text-[10px] leading-5 text-slate-500">
              Demo mode does not seed analytics figures. Any values shown come only from consented visits to
              this running workspace.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
