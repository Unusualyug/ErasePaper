import { useState } from 'react';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Files,
  Clock3,
  CircleCheck,
  CircleDashed,
  Sparkles,
  ShieldCheck,
  UserRound,
  CalendarDays,
} from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { useServices } from '../../context/ServicesContext';
import { useApi } from '../../hooks/useApi';
import { SERVICE_ICONS, SERVICE_COLORS, formatDate, whatsappUrl } from '../../lib/constants';
import { PageHeading, Spinner, ErrorState, Avatar } from '../../components/UI';
import RequestTable from '../../components/RequestTable';
import RequestDetails from '../../components/RequestDetails';
import { WhatsAppIcon } from '../../components/WhatsAppButton';
export default function Dashboard() {
  const { user } = useAppAuth();
  const services = useServices();
  const [selected, setSelected] = useState(null);
  const { data, loading, error, refresh: refreshRequests } = useApi('/requests?limit=5');
  const { data: summary, refresh: refreshSummary } = useApi('/requests/summary');
  const refresh = () => {
    refreshRequests();
    refreshSummary();
  };
  const requests = data?.items || [];
  const counts = summary?.stats || {};
  const stats = [
    [Files, 'Total requests', counts.total || 0, 'text-brand-600 bg-brand-50'],
    [Clock3, 'Pending', counts.pending || 0, 'text-amber-600 bg-amber-50'],
    [CircleDashed, 'In progress', counts.inProgress || 0, 'text-blue-600 bg-blue-50'],
    [CircleCheck, 'Completed', counts.completed || 0, 'text-emerald-600 bg-emerald-50'],
  ];
  return (
    <>
      <PageHeading
        title={`Good to see you, ${user?.fullName?.split(' ')[0]}.`}
        description="A little progress every day. Let’s keep your academic journey moving."
        action={
          <Link to="/requests/new" className="btn-primary">
            <Plus size={17} />
            New request
          </Link>
        }
      />
      <div className="relative mb-7 overflow-hidden rounded-xl bg-navy-900 p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border-[40px] border-white/[.025]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.13em] text-brand-300">
              <Sparkles size={13} />
              Your next step starts here
            </span>
            <h2 className="text-[25px] font-semibold tracking-[-.035em]">
              Big ambitions. One simple workspace.
            </h2>
            <p className="mt-2 max-w-lg text-xs leading-6 text-slate-400">
              From your first research question to your final submission, find the support you need—all in one
              place.
            </p>
            <a
              href="#available-services"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-brand-300"
            >
              Find your service
              <ArrowRight size={15} />
            </a>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-white/5 px-5 py-4 md:block">
            <CalendarDays size={20} className="mb-3 text-brand-300" />
            <p className="text-[10px] text-slate-400">Today’s date</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(new Date())}</p>
          </div>
        </div>
      </div>
      {error && (
        <div className="mb-5">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats.map(([Icon, label, number, color]) => (
          <div key={label} className="card flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-[30px] font-semibold tracking-tight">
                {loading ? '—' : <CountUp end={number} duration={1.2} />}
              </p>
            </div>
            <span className={`rounded-xl p-3 ${color}`}>
              <Icon size={21} strokeWidth={1.6} />
            </span>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_285px]">
        <div className="min-w-0 space-y-7">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <h2 className="text-base font-bold">My requests</h2>
                <p className="mt-1 text-[11px] text-slate-400">Your requirements, with a clear next step.</p>
              </div>
              <Link
                to="/requests"
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600"
              >
                View all
                <ArrowUpRight size={14} />
              </Link>
            </div>
            {loading ? (
              <Spinner label="Loading your requests…" />
            ) : (
              <RequestTable requests={requests.slice(0, 5)} onSelect={setSelected} compact />
            )}
          </section>
          <section id="available-services">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">What are you working on?</h2>
              <span className="text-[10px] text-slate-400">5 ways we can help</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const Icon = SERVICE_ICONS[service.icon];
                return (
                  <Link
                    to={`/requests/new?service=${service.slug}`}
                    key={service.slug}
                    className="card group flex items-center gap-3 p-4 transition hover:border-brand-200 hover:shadow-soft"
                  >
                    <span className={`icon-box ${SERVICE_COLORS[service.color]}`}>
                      <Icon size={20} strokeWidth={1.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-semibold">{service.shortName}</h3>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {service.slug === 'bulk-printing'
                          ? 'Print, bind & deliver'
                          : 'Guidance for your next step'}
                      </p>
                    </div>
                    <ArrowUpRight size={15} className="text-slate-300 group-hover:text-brand-600" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="card overflow-hidden">
            <div className="h-16 bg-brand-100" />
            <div className="-mt-8 px-5 pb-5 text-center">
              <Avatar name={user?.fullName} size="lg" className="ring-4 ring-white" />
              <h3 className="mt-3 text-sm font-bold">{user?.fullName}</h3>
              <p className="mt-1 text-[10px] text-slate-400">Student · {user?.studentId}</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-700">
                <ShieldCheck size={11} />
                Student account
              </span>
              <div className="mt-5 border-t border-slate-100 pt-4 text-left">
                <p className="text-[10px] text-slate-400">Mobile contact · not verified</p>
                <p className="mt-1 text-xs font-medium">{user?.phoneNumber}</p>
              </div>
              <Link to="/profile" className="btn-secondary btn-sm mt-5 w-full">
                <UserRound size={14} />
                View my profile
              </Link>
            </div>
          </section>
          <section className="rounded-xl border border-brand-100 bg-brand-50 p-5">
            <WhatsAppIcon size={25} className="mb-4 text-emerald-600" />
            <h3 className="text-sm font-bold">A conversation can help.</h3>
            <p className="mt-2 text-[11px] leading-6 text-slate-500">
              Questions about a service or an existing request? We’re just a message away.
            </p>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm mt-4 w-full"
            >
              Contact administrator
              <ArrowUpRight size={13} />
            </a>
          </section>
          <p className="flex items-start gap-2 px-2 text-[10px] leading-5 text-slate-400">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Your requests and personal information are visible only to you and authorized administrators.
          </p>
        </aside>
      </div>
      <RequestDetails
        request={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          refresh();
          setSelected(null);
        }}
      />
    </>
  );
}
