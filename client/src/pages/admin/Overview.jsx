import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import {
  UsersRound,
  Files,
  Clock3,
  CircleCheck,
  ArrowUpRight,
  ArrowRight,
  Activity,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAppAuth } from '../../context/AuthContext';
import { useServices } from '../../context/ServicesContext';
import { Avatar, ErrorState } from '../../components/UI';
import RequestDetails from '../../components/RequestDetails';
import RequestTable from '../../components/RequestTable';
import { formatDate, timeAgo } from '../../lib/constants';
import api, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
const actionLabels = {
  'demo.initialized': 'Demo workspace initialized',
  'student.registered': 'New student registered',
  'student.deletion_requested': 'Account deletion requested',
  'student.database_deleted': 'Student database records removed',
  'student.deleted': 'Student account securely deleted',
  'request.created': 'New service request submitted',
  'request.status_updated': 'Request status updated',
  'request.notes_updated': 'Internal request notes updated',
  'request.cancelled': 'Request cancelled by student',
  'admin.role_granted': 'Administrator access granted',
};
export { actionLabels };
export default function Overview() {
  const { data, loading, error, refresh } = useApi('/admin/overview');
  const [selected, setSelected] = useState(null),
    [retrying, setRetrying] = useState('');
  const retryLock = useRef(false);
  const { user, mode } = useAppAuth();
  const services = useServices();
  const toast = useToast();
  const stats = data?.stats;
  const max = Math.max(1, ...(stats?.months.map((m) => m.count) || [1]));
  const serviceMax = Math.max(1, ...(stats?.services.map((s) => s.count) || [1]));
  async function retry(id) {
    if (retryLock.current) return;
    retryLock.current = true;
    setRetrying(id);
    try {
      const { data } = await api.post(`/admin/deletions/${id}/retry`);
      toast(
        data.status === 'completed'
          ? 'Account cleanup completed.'
          : 'Cleanup is still pending. Check private-file storage and retry status.',
        data.status === 'completed' ? 'success' : 'info',
      );
      refresh();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      retryLock.current = false;
      setRetrying('');
    }
  }
  if (loading && !data)
    return (
      <div className="min-h-[60vh] space-y-6" role="status" aria-label="Loading administrator overview">
        <span className="sr-only">Preparing your admin overview…</span>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="skeleton-block h-3 w-32" />
            <div className="skeleton-block h-8 w-64 max-w-[70vw]" />
            <div className="skeleton-block h-3 w-80 max-w-[75vw]" />
          </div>
          <div className="skeleton-block hidden h-9 w-32 sm:block" />
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="admin-card space-y-4 p-5">
              <div className="skeleton-block h-3 w-28" />
              <div className="skeleton-block h-9 w-20" />
              <div className="skeleton-block h-3 w-36 max-w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="admin-card h-72 p-6">
            <div className="skeleton-block mb-5 h-4 w-40" />
            <div className="skeleton-block h-52 w-full" />
          </div>
          <div className="admin-card h-72 p-6">
            <div className="skeleton-block mb-5 h-4 w-36" />
            <div className="space-y-6">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <div className="skeleton-block h-3 w-full" />
                  <div className="skeleton-block h-1.5 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-brand-300">
            The bigger picture
          </p>
          <h1 className="text-[29px] font-semibold tracking-[-.035em]">
            Welcome back, {user?.fullName?.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Here’s what’s happening in your academic services workspace.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[.025] px-3 py-2 text-[11px] text-slate-400">
          {formatDate(new Date())}
        </span>
      </div>
      {mode === 'demo' && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-brand-400/15 bg-brand-500/[.07] px-4 py-3 text-[11px] text-brand-200">
          <Activity size={15} />
          <span>
            You’re exploring a demo workspace. All students, requests, and statistics below are illustrative.
          </span>
        </div>
      )}
      {data.deletions?.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle size={16} />
            Account cleanup needs attention
          </h2>
          <p className="mt-2 text-[11px] text-slate-400">
            Student access is blocked. Remaining cleanup retries automatically; you can also retry now.
          </p>
          {data.deletions.map((job) => (
            <div key={job.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>
                {job.studentId} · {job.stage.replaceAll('_', ' ')} · {job.attempts} attempts
              </span>
              <button
                disabled={!!retrying}
                onClick={() => retry(job.id)}
                className="btn btn-sm border border-amber-500/30 text-amber-300"
              >
                <RefreshCw size={13} className={retrying === job.id ? 'animate-spin' : ''} />
                {retrying === job.id ? 'Retrying…' : 'Retry cleanup'}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          [
            UsersRound,
            'Registered students',
            stats.students,
            'text-brand-300',
            'Your student community',
            '/admin/students',
          ],
          [
            Files,
            'Total requests',
            stats.requests,
            'text-blue-300',
            'Across all five services',
            '/admin/requests',
          ],
          [
            Clock3,
            'Pending requests',
            stats.pending,
            'text-amber-300',
            'Ready for your review',
            '/admin/requests?status=Pending',
          ],
          [
            CircleCheck,
            'Completed requests',
            stats.completed,
            'text-emerald-300',
            'Academic steps supported',
            '/admin/requests?status=Completed',
          ],
        ].map(([Icon, label, value, color, sub, to]) => (
          <Link to={to} key={label} className="admin-card group p-5 transition hover:border-brand-400/40">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium text-slate-400">{label}</p>
              <span className={`rounded-lg bg-white/5 p-2 ${color}`}>
                <Icon size={17} strokeWidth={1.6} />
              </span>
            </div>
            <p className="mt-2 text-[34px] font-semibold tracking-tight">
              <CountUp end={value} duration={1.3} />
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[.06] pt-3">
              <span className="text-[10px] text-slate-500">{sub}</span>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-brand-300" />
            </div>
          </Link>
        ))}
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="admin-card p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Request activity</h2>
              <p className="mt-1.5 text-[11px] text-slate-500">New requests over the last six months</p>
            </div>
            <span className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-slate-400">
              Last 6 months
            </span>
          </div>
          <div className="flex items-end gap-3 border-b border-white/10 pb-0 pl-1 sm:gap-6">
            <div className="flex h-[170px] flex-col justify-between pb-5 text-[9px] text-slate-600">
              <span>{max}</span>
              <span>{Math.round(max / 2)}</span>
              <span>0</span>
            </div>
            <div className="relative flex h-[190px] flex-1 items-end justify-around gap-3 px-2">
              <div className="pointer-events-none absolute inset-x-0 top-3 h-[145px] flex flex-col justify-between">
                <span className="border-t border-dashed border-white/[.06]" />
                <span className="border-t border-dashed border-white/[.06]" />
                <span className="border-t border-dashed border-white/[.06]" />
              </div>
              {stats.months.map((month, i) => (
                <div
                  key={month.key}
                  className="group relative flex h-full w-full max-w-12 flex-col items-center justify-end"
                >
                  <span className="mb-2 text-[10px] font-medium text-slate-400 opacity-0 transition group-hover:opacity-100">
                    {month.count}
                  </span>
                  <div
                    className={`min-h-[3px] w-full max-w-9 rounded-t-md transition group-hover:brightness-125 ${i === 5 ? 'bg-brand-500' : 'bg-brand-500/35'}`}
                    style={{ height: `${Math.max(2, (month.count / max) * 130)}px` }}
                    title={`${month.month}: ${month.count} requests`}
                  />
                  <span className="flex h-9 items-center text-[10px] text-slate-500">{month.month}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
            <span className="h-2 w-2 rounded-sm bg-brand-500" />
            Submitted requests<span className="ml-auto">{stats.inProgress} currently in progress</span>
          </div>
        </section>
        <section className="admin-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Requests by service</h2>
              <p className="mt-1.5 text-[11px] text-slate-500">Where students need your support</p>
            </div>
            <Files size={17} className="text-slate-500" />
          </div>
          <div className="space-y-5">
            {stats.services.map((service, i) => (
              <div key={service.slug}>
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{service.name}</span>
                  <span className="font-semibold text-slate-400">{service.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${['bg-brand-400', 'bg-blue-400', 'bg-teal-400', 'bg-amber-400', 'bg-indigo-400'][i]}`}
                    style={{ width: `${(service.count / serviceMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className="admin-card overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <div>
                <h2 className="text-sm font-semibold">Latest service requests</h2>
                <p className="mt-1 text-[11px] text-slate-500">A quick look at what needs your attention</p>
              </div>
              <Link
                to="/admin/requests"
                className="flex items-center gap-1 text-[10px] font-semibold text-brand-300"
              >
                View all
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <RequestTable requests={data.requests} onSelect={setSelected} admin compact cardsOnly />
          </section>
          <section className="admin-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <Link to="/admin/activity" className="text-[10px] font-semibold text-brand-300">
                View audit log
                <ArrowUpRight size={12} className="ml-1 inline" />
              </Link>
            </div>
            <div className="space-y-4">
              {data.activities.slice(0, 4).map((activity, i) => (
                <div key={activity._id} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-lg bg-white/5 p-2 text-brand-300">
                    <Activity size={13} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-300">
                      {actionLabels[activity.action] || activity.action}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-500">{activity.targetId}</p>
                  </div>
                  <span className="whitespace-nowrap text-[9px] text-slate-500">
                    {timeAgo(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="admin-card overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div>
              <h2 className="text-sm font-semibold">Recently registered</h2>
              <p className="mt-1 text-[11px] text-slate-500">New faces in your community</p>
            </div>
            <Link to="/admin/students" aria-label="View all students" className="text-brand-300">
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="px-5">
            {data.students.map((student) => (
              <Link
                to={`/admin/students/${student.id}`}
                key={student.id}
                className="flex items-center gap-3 border-b border-white/[.06] py-4 last:border-0"
              >
                <Avatar name={student.fullName} className="bg-brand-500/15 text-brand-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{student.fullName}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-500">
                    {student.email || student.phoneNumber}
                  </p>
                </div>
                <span className="text-[9px] text-slate-500">{timeAgo(student.createdAt)}</span>
              </Link>
            ))}
          </div>
          <div className="p-5">
            <Link
              to="/admin/students"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-400/30 py-2.5 text-[11px] font-medium text-brand-300 transition hover:bg-brand-500/10"
            >
              Manage students
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
      <RequestDetails
        request={selected}
        onClose={() => setSelected(null)}
        admin
        onUpdated={() => {
          setSelected(null);
          refresh();
        }}
      />
    </>
  );
}
