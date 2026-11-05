import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Mail,
  Smartphone,
  CalendarDays,
  Fingerprint,
  Files,
  Clock3,
  CircleCheck,
  ShieldCheck,
  ArrowUpRight,
  UserRound,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Avatar, Spinner, ErrorState } from '../../components/UI';
import { WhatsAppIcon } from '../../components/WhatsAppButton';
import RequestTable from '../../components/RequestTable';
import RequestDetails from '../../components/RequestDetails';
import DeleteStudentModal from '../../components/DeleteStudentModal';
import { formatDate, whatsappUrl } from '../../lib/constants';
export default function StudentDetail() {
  const { id } = useParams();
  const { data, loading, error, refresh } = useApi(`/admin/students/${id}`);
  const [selected, setSelected] = useState(null),
    [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();
  if (loading && !data) return <Spinner label="Loading student profile…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;
  const { user, requests, stats } = data;
  return (
    <>
      <Link
        to="/admin/students"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-300"
      >
        <ArrowLeft size={14} />
        Back to students
      </Link>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-brand-300">
            Student profile
          </p>
          <h1 className="text-[29px] font-semibold tracking-[-.035em]">{user.fullName}</h1>
          <p className="mt-2 text-xs text-slate-500">
            {user.studentId} · Registered {formatDate(user.createdAt)}
          </p>
        </div>
        <button
          onClick={() => setDeleting(user)}
          className="btn border border-red-400/25 bg-red-400/5 text-red-300 hover:bg-red-400/10"
        >
          <Trash2 size={15} />
          Delete student
        </button>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[310px_1fr]">
        <aside className="space-y-5">
          <section className="admin-card overflow-hidden">
            <div className="h-20 bg-brand-500/15" />
            <div className="-mt-9 px-6 pb-6 text-center">
              <Avatar
                name={user.fullName}
                size="xl"
                className="bg-brand-200 text-brand-800 ring-4 ring-[#172137]"
              />
              <h2 className="mt-4 text-lg font-semibold">{user.fullName}</h2>
              <p className="mt-1 text-[11px] text-slate-500">Student · {user.studentId}</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-300">
                <ShieldCheck size={11} />
                Student account
              </span>
              <a
                href={whatsappUrl(
                  user.phoneNumber,
                  `Hello ${user.fullName}, this is ErasePaper regarding your academic service requests.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn mt-6 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <WhatsAppIcon size={17} />
                Contact on WhatsApp
                <ArrowUpRight size={14} />
              </a>
            </div>
          </section>
          <section className="admin-card p-5">
            <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold">
              <UserRound size={15} className="text-brand-300" />
              Personal information
            </h2>
            <dl className="space-y-5">
              {[
                [Fingerprint, 'Username', user.username],
                [Smartphone, 'Mobile number (not verified)', user.phoneNumber],
                [Mail, 'Email (not verified)', user.email || 'Not added'],
                [CalendarDays, 'Account created', formatDate(user.createdAt)],
                [Clock3, 'Last login', formatDate(user.lastLoginAt, true)],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon size={14} className="mt-0.5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <dt className="text-[10px] text-slate-500">{label}</dt>
                    <dd className="mt-1.5 break-all text-[11px] leading-5 text-slate-300">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        </aside>
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              [Files, 'Total requests', stats.total],
              [Clock3, 'Pending', stats.pending],
              [CircleCheck, 'Completed', stats.completed],
              [ArrowUpRight, 'In progress', stats.inProgress],
            ].map(([Icon, label, value]) => (
              <div className="admin-card p-4" key={label}>
                <Icon size={17} className="mb-3 text-brand-300" />
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <section className="admin-card overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <div>
                <h2 className="text-sm font-semibold">Student requests</h2>
                <p className="mt-1 text-[11px] text-slate-500">Requirements, status, and previous activity</p>
              </div>
              <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">
                {requests.length} requests
              </span>
            </div>
            <div className="rounded-lg bg-white [&_td]:border-slate-100">
              <RequestTable requests={requests} onSelect={setSelected} admin compact cardsOnly />
            </div>
          </section>
          <div className="rounded-lg border border-white/[.07] p-4 text-[11px] leading-6 text-slate-500">
            Select a request to review the student’s complete requirements, update its status, or add private
            administrative notes. Use WhatsApp to contact the student at their registered number.
          </div>
        </div>
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
      <DeleteStudentModal
        student={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => navigate('/admin/students')}
      />
    </>
  );
}
