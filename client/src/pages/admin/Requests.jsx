import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Files, Download } from 'lucide-react';
import { useApi, useDebounced } from '../../hooks/useApi';
import { useServices } from '../../context/ServicesContext';
import { useToast } from '../../context/ToastContext';
import { Spinner, ErrorState, Pagination, EmptyState } from '../../components/UI';
import RequestTable from '../../components/RequestTable';
import RequestDetails from '../../components/RequestDetails';
export default function Requests() {
  const [params] = useSearchParams();
  const services = useServices();
  const [search, setSearch] = useState(''),
    [service, setService] = useState(''),
    [status, setStatus] = useState(params.get('status') || ''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null);
  const debounced = useDebounced(search);
  const toast = useToast();
  const query = new URLSearchParams({ search: debounced, service, status, page: String(page), limit: '10' });
  const { data, loading, error, refresh } = useApi(`/admin/requests?${query}`);
  useEffect(() => setPage(1), [debounced, service, status]);
  function exportCsv() {
    if (!data?.items.length) return;
    const rows = [
      ['Request ID', 'Student', 'Mobile', 'Service', 'Status', 'Submitted'],
      ...data.items.map((r) => [
        r.requestId,
        r.student?.fullName,
        r.student?.phoneNumber,
        r.serviceType,
        r.status,
        new Date(r.createdAt).toISOString(),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (v) =>
              `"${String(v || '')
                .replaceAll('"', '""')
                .replace(/^[\s]*[=+@-]/, "'")}"`,
          )
          .join(','),
      )
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `erasepaper-requests-page-${page}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${data.items.length} requests from this page. Handle student data securely.`, 'info');
  }
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-brand-300">
            From enquiry to progress
          </p>
          <h1 className="text-[29px] font-semibold tracking-[-.035em]">Service requests</h1>
          <p className="mt-2 text-xs text-slate-400">
            Review requirements, keep students updated, and move every request forward.
          </p>
        </div>
        <button
          className="btn btn-sm border border-white/10 text-slate-300 hover:bg-white/5"
          onClick={exportCsv}
          disabled={!data?.items.length}
        >
          <Download size={14} />
          Export this page
        </button>
      </div>
      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-white/[.07] p-5">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              className="admin-input pl-10"
              placeholder="Search request, topic, or student…"
              aria-label="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-input w-auto min-w-40"
            aria-label="Filter by service"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.shortName}
              </option>
            ))}
          </select>
          <select
            className="admin-input w-auto min-w-36"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {['Pending', 'In Progress', 'Completed', 'Cancelled'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {(search || service || status) && (
            <button
              className="p-2 text-slate-400 hover:text-white"
              aria-label="Clear request filters"
              onClick={() => {
                setSearch('');
                setService('');
                setStatus('');
              }}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <div className="flex overflow-x-auto border-b border-white/[.07] px-5">
          {[
            ['', 'All requests'],
            ['Pending', 'Pending'],
            ['In Progress', 'In progress'],
            ['Completed', 'Completed'],
            ['Cancelled', 'Cancelled'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`whitespace-nowrap border-b-2 px-4 py-4 text-[11px] font-medium ${status === value ? 'border-brand-400 text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        ) : loading && !data ? (
          <Spinner label="Loading requests…" />
        ) : data?.items.length ? (
          <>
            <div className={`bg-white transition-opacity ${loading ? 'opacity-50' : ''}`}>
              <RequestTable requests={data.items} onSelect={setSelected} admin compact />
            </div>
            <div className="[&_button]:border-white/10 [&_button]:bg-transparent [&_button]:text-slate-400">
              <Pagination {...data} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="text-slate-200">
            <EmptyState
              title="No matching requests"
              description="Try a different search, service, or status."
            />
          </div>
        )}
      </section>
      <p className="mt-5 text-[10px] text-slate-500">
        Internal administrative notes are never visible to students. Status changes create a student
        notification and an audit entry.
      </p>
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
