import { useState } from 'react';
import { Activity, Search, ShieldCheck, RefreshCw, UserRound, FileText } from 'lucide-react';
import { useApi, useDebounced } from '../../hooks/useApi';
import { Spinner, ErrorState, EmptyState } from '../../components/UI';
import { actionLabels } from './Overview';
import { formatDate } from '../../lib/constants';
export default function ActivityPage() {
  const { data, loading, error, refresh } = useApi('/admin/activities');
  const [search, setSearch] = useState('');
  const term = useDebounced(search).toLowerCase();
  const items = (data?.items || []).filter((item) =>
    `${actionLabels[item.action] || item.action} ${item.targetId} ${item.actorId}`
      .toLowerCase()
      .includes(term),
  );
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-brand-300">
            Accountability, built in
          </p>
          <h1 className="text-[29px] font-semibold tracking-[-.035em]">Activity & audit log</h1>
          <p className="mt-2 text-xs text-slate-400">
            A clear record of important actions across your workspace.
          </p>
        </div>
        <button onClick={refresh} className="btn btn-sm border border-white/10 text-slate-300">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
      <div className="mb-6 flex gap-3 rounded-xl border border-brand-400/15 bg-brand-500/5 p-4">
        <ShieldCheck size={20} className="shrink-0 text-brand-300" />
        <p className="text-[11px] leading-6 text-slate-400">
          Audit entries retain opaque identifiers and action metadata—not student names, phone numbers, email
          addresses, or requirement documents. Account-deletion events remain available after personal records
          are removed.
        </p>
      </div>
      <section className="admin-card overflow-hidden">
        <div className="border-b border-white/[.07] p-5">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              className="admin-input pl-10"
              aria-label="Search audit activity"
              placeholder="Search action, record ID, or actor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        ) : loading && !data ? (
          <Spinner />
        ) : items.length ? (
          <>
            <div className="activity-card-list space-y-3 p-4 lg:hidden">
              {items.map((item) => {
                const Icon = item.action.startsWith('student.')
                  ? UserRound
                  : item.action.startsWith('request.')
                    ? FileText
                    : Activity;
                return (
                  <article key={item._id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                    <div className="flex items-start gap-3">
                      <span className="rounded-lg bg-brand-500/10 p-2 text-brand-300">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-sm font-semibold text-slate-100">
                          {actionLabels[item.action] || item.action}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt, true)}</p>
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="admin-label mb-1">Record</dt>
                        <dd className="break-all font-mono text-xs text-slate-300">{item.targetId}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="admin-label mb-1">Actor</dt>
                        <dd className="break-all font-mono text-xs text-slate-300">
                          {item.actorId === 'demo_admin' ? 'Administrator (demo)' : item.actorId}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[670px] text-left">
                <thead className="border-b border-white/[.07] bg-white/[.015] text-[9px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Action</th>
                    <th className="px-5 py-4 font-medium">Record</th>
                    <th className="px-5 py-4 font-medium">Actor</th>
                    <th className="px-5 py-4 font-medium">Date & time</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const Icon = item.action.startsWith('student.')
                      ? UserRound
                      : item.action.startsWith('request.')
                        ? FileText
                        : Activity;
                    return (
                      <tr key={item._id} className="border-b border-white/[.05] hover:bg-white/[.02]">
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-3 text-xs text-slate-300">
                            <span className="rounded-lg bg-brand-500/10 p-2 text-brand-300">
                              <Icon size={14} />
                            </span>
                            {actionLabels[item.action] || item.action}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-[10px] text-slate-500">{item.targetId}</td>
                        <td className="max-w-[190px] truncate px-5 py-4 font-mono text-[10px] text-slate-500">
                          {item.actorId === 'demo_admin' ? 'Administrator (demo)' : item.actorId}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[11px] text-slate-500">
                          {formatDate(item.createdAt, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-slate-200">
            <EmptyState
              title="No matching activity"
              description="Important account and request actions will appear here."
            />
          </div>
        )}
      </section>
      <p className="mt-4 text-[10px] text-slate-500">
        Showing the latest 100 audit events. All timestamps are displayed in your local timezone.
      </p>
    </>
  );
}
