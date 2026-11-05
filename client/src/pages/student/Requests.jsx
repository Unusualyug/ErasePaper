import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApi, useDebounced } from '../../hooks/useApi';
import { useServices } from '../../context/ServicesContext';
import { PageHeading, Spinner, ErrorState, Pagination, EmptyState } from '../../components/UI';
import RequestTable from '../../components/RequestTable';
import RequestDetails from '../../components/RequestDetails';
export default function Requests() {
  const services = useServices();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(''),
    [service, setService] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null);
  const debounced = useDebounced(search);
  const query = new URLSearchParams({ search: debounced, service, status, page: String(page), limit: '8' });
  const { data, loading, error, refresh } = useApi(`/requests?${query}`);
  useEffect(() => setPage(1), [debounced, service, status]);
  useEffect(() => {
    const id = params.get('request');
    if (id && data?.items) {
      const item = data.items.find((r) => r.id === id);
      if (item) setSelected(item);
    }
  }, [params, data]);
  function close() {
    setSelected(null);
    if (params.has('request')) setParams({}, { replace: true });
  }
  return (
    <>
      <PageHeading
        eyebrow="Your academic progress"
        title="My requests"
        description="Every requirement, every update, all in one place."
        action={
          <Link to="/requests/new" className="btn-primary">
            <Plus size={17} />
            New request
          </Link>
        }
      />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Search by request ID or topic…"
              aria-label="Search your requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter by service"
            className="input w-auto min-w-40"
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
            aria-label="Filter by status"
            className="input w-auto min-w-36"
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
              className="btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setService('');
                setStatus('');
              }}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5">
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
              className={`whitespace-nowrap border-b-2 px-3 py-4 text-xs font-medium transition ${status === value ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-navy-700'}`}
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
          <Spinner label="Finding your requests…" />
        ) : data?.items.length ? (
          <>
            <RequestTable requests={data.items} onSelect={setSelected} />
            <Pagination {...data} onChange={setPage} />
          </>
        ) : (
          <EmptyState
            title={search || service || status ? 'No matching requests' : 'Your first step is waiting'}
            description={
              search || service || status
                ? 'Try a different search or clear your filters.'
                : 'Choose a service, share what you need, and follow your progress right here.'
            }
            action={
              <Link to="/requests/new" className="btn-primary">
                <Plus size={16} />
                Create a request
              </Link>
            }
          />
        )}
      </div>
      <RequestDetails
        request={selected}
        onClose={close}
        onUpdated={() => {
          refresh();
          setSelected(null);
        }}
      />
    </>
  );
}
