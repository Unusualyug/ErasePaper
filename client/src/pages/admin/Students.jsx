import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Trash2, UsersRound, X, ShieldCheck } from 'lucide-react';
import { useApi, useDebounced } from '../../hooks/useApi';
import { Avatar, Spinner, ErrorState, Pagination, EmptyState } from '../../components/UI';
import DeleteStudentModal from '../../components/DeleteStudentModal';
import { formatDate } from '../../lib/constants';
export default function Students() {
  const [search, setSearch] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [page, setPage] = useState(1),
    [deleting, setDeleting] = useState(null);
  const debounced = useDebounced(search);
  const query = new URLSearchParams({ search: debounced, from, to, page: String(page), limit: '8' });
  const { data, loading, error, refresh } = useApi(`/admin/students?${query}`);
  useEffect(() => setPage(1), [debounced, from, to]);
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-brand-300">
            Your student community
          </p>
          <h1 className="text-[29px] font-semibold tracking-[-.035em]">Students</h1>
          <p className="mt-2 text-xs text-slate-400">
            View profiles, understand activity, and manage student accounts.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-slate-400">
          <UsersRound size={15} />
          {data?.total ?? '—'} registered students
        </span>
      </div>
      <section className="admin-card overflow-hidden">
        <div className="student-filter-bar flex flex-col gap-3 border-b border-white/[.07] p-4 sm:flex-row sm:items-end sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3.5 top-4 text-slate-500" />
            <input
              className="admin-input pl-10"
              aria-label="Search students"
              placeholder="Search name, mobile, email, or student ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="student-date-filter grid grid-cols-2 gap-2 sm:w-[340px] sm:gap-3">
            <div className="min-w-0">
              <label className="admin-label mb-1.5" htmlFor="from-date">
                Registered from
              </label>
              <input
                id="from-date"
                type="date"
                className="admin-input w-full min-w-0 text-xs [color-scheme:dark]"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className="admin-label mb-1.5" htmlFor="to-date">
                Registered until
              </label>
              <input
                id="to-date"
                type="date"
                className="admin-input w-full min-w-0 text-xs [color-scheme:dark]"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          {(search || from || to) && (
            <button
              className="clear-student-filters min-h-11 rounded-lg p-2 text-slate-400 hover:text-white"
              aria-label="Clear student filters"
              onClick={() => {
                setSearch('');
                setFrom('');
                setTo('');
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {from && to && from > to && (
          <p className="p-4 text-xs text-amber-300">The start date must be before the end date.</p>
        )}
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        ) : loading && !data ? (
          <Spinner label="Loading students…" />
        ) : data?.items.length ? (
          <>
            <div className={`student-mobile-cards space-y-3 p-4 xl:hidden ${loading ? 'opacity-50' : ''}`}>
              {data.items.map((student) => (
                <article key={student.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={student.fullName} className="bg-brand-500/15 text-brand-300" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/students/${student.id}`} className="block min-h-11 py-1">
                        <span className="block break-words text-sm font-semibold text-slate-100">
                          {student.fullName}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-slate-400">
                          {student.studentId}
                        </span>
                      </Link>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="admin-label mb-1">Mobile number (not verified)</dt>
                      <dd className="break-all text-sm text-slate-200">{student.phoneNumber}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="admin-label mb-1">Email (not verified)</dt>
                      <dd className="break-words text-sm text-slate-200">{student.email || 'Not added'}</dd>
                    </div>
                    <div>
                      <dt className="admin-label mb-1">Registered</dt>
                      <dd className="text-sm text-slate-300">{formatDate(student.createdAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link to={`/admin/students/${student.id}`} className="btn-secondary min-h-11 w-full">
                      <Eye size={15} />
                      View profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleting(student)}
                      aria-label={`Delete ${student.fullName}`}
                      className="btn min-h-11 w-full border border-red-400/30 bg-red-400/5 text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div
              className={`hidden overflow-x-auto transition-opacity xl:block ${loading ? 'opacity-50' : ''}`}
            >
              <table className="w-full min-w-[840px] text-left">
                <thead className="border-b border-white/[.07] bg-white/[.015] text-[9px] uppercase tracking-[.1em] text-slate-500">
                  <tr>
                    {['Student ID', 'Student', 'Mobile number', 'Email address', 'Registered', 'Actions'].map(
                      (label) => (
                        <th key={label} className="px-5 py-4 font-medium">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-white/[.05] transition hover:bg-white/[.025]"
                    >
                      <td className="px-5 py-4 font-mono text-[10px] text-slate-500">{student.studentId}</td>
                      <td className="px-5 py-4">
                        <Link to={`/admin/students/${student.id}`} className="flex items-center gap-3">
                          <Avatar name={student.fullName} className="bg-brand-500/15 text-brand-300" />
                          <div>
                            <p className="whitespace-nowrap text-xs font-medium text-slate-200">
                              {student.fullName}
                            </p>
                            <p className="mt-1 text-[9px] text-slate-500">Student account</p>
                          </div>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[11px] text-slate-400">
                        {student.phoneNumber}
                      </td>
                      <td className="px-5 py-4 text-[11px] text-slate-400">
                        <p>{student.email || 'Not added'}</p>
                        {student.email && (
                          <span className="mt-1 inline-block text-[9px] text-slate-500">Not verified</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[11px] text-slate-500">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/admin/students/${student.id}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:border-brand-400/50 hover:text-brand-300"
                            aria-label={`View ${student.fullName}`}
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => setDeleting(student)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:border-red-400/40 hover:bg-red-400/5 hover:text-red-300"
                            aria-label={`Delete ${student.fullName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="[&_button]:border-white/10 [&_button]:bg-transparent [&_button]:text-slate-400">
              <Pagination {...data} onChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState
            title="No students found"
            description="Try another name, number, email, or registration date range."
          />
        )}
      </section>
      <p className="mt-5 flex items-center gap-2 text-[10px] leading-5 text-slate-500">
        <ShieldCheck size={14} />
        Student information is visible only to authorized administrators. Account deletions are recorded in
        the audit log.
      </p>
      <DeleteStudentModal student={deleting} onClose={() => setDeleting(null)} onDeleted={refresh} />
    </>
  );
}
