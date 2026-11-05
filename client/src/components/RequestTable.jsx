import { ArrowUpRight, Eye } from 'lucide-react';
import { StatusBadge, Avatar, EmptyState } from './UI';
import { SERVICE_ICONS, SERVICE_COLORS, formatDate } from '../lib/constants';
import { useServices } from '../context/ServicesContext';

export default function RequestTable({
  requests = [],
  onSelect,
  admin = false,
  compact = false,
  cardsOnly = false,
}) {
  const services = useServices();
  if (!requests.length)
    return (
      <EmptyState
        title="No requests to show"
        description={
          admin
            ? 'New student requests will appear here. Try changing your filters.'
            : 'Your next academic step starts with a request. Choose a service to get going.'
        }
      />
    );

  const cardSurface = admin
    ? 'border-white/[.08] bg-white/[.025] text-slate-100'
    : 'border-slate-200 bg-white text-navy-900';
  const secondaryText = admin ? 'text-slate-400' : 'text-slate-500';
  const divider = admin ? 'border-white/[.08]' : 'border-slate-100';

  return (
    <>
      <div className={`request-card-list space-y-3 p-4 ${cardsOnly ? '' : 'xl:hidden'}`}>
        {requests.map((request) => {
          const service = services.find((item) => item.slug === request.serviceSlug);
          const Icon = SERVICE_ICONS[service?.icon] || ArrowUpRight;
          return (
            <article key={request.id} className={`rounded-xl border p-4 ${cardSurface}`}>
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(request)}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <span className="block break-words text-sm font-semibold leading-5">{request.title}</span>
                  <span className={`mt-1 block font-mono text-[10px] tracking-wide ${secondaryText}`}>
                    {request.requestId}
                  </span>
                </button>
                <StatusBadge status={request.status} />
              </div>
              <dl className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 ${divider}`}>
                {admin && (
                  <div className="col-span-2">
                    <dt className={`text-[10px] font-medium ${secondaryText}`}>Student</dt>
                    <dd className="mt-1 flex items-center gap-2 text-xs font-medium">
                      <Avatar name={request.student?.fullName} size="sm" />
                      <span className="break-words">{request.student?.fullName || 'Student'}</span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className={`text-[10px] font-medium ${secondaryText}`}>Service</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${SERVICE_COLORS[service?.color] || 'bg-slate-50 text-slate-500'}`}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="break-words">{compact ? service?.shortName : request.serviceType}</span>
                  </dd>
                </div>
                <div>
                  <dt className={`text-[10px] font-medium ${secondaryText}`}>Submitted</dt>
                  <dd className={`mt-1 text-xs ${secondaryText}`}>{formatDate(request.createdAt)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => onSelect(request)}
                className={`btn-secondary mt-3 min-h-11 w-full ${admin ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : ''}`}
              >
                <Eye size={16} />
                View request details
              </button>
            </article>
          );
        })}
      </div>
      <div className={`hidden overflow-x-auto ${cardsOnly ? '' : 'xl:block'}`}>
        <table className="request-table w-full min-w-[640px] text-left">
          <thead>
            <tr className="table-head">
              <th className="px-5 py-3.5">Request</th>
              {admin && <th className="px-4 py-3.5">Student</th>}
              <th className="px-4 py-3.5">Service</th>
              <th className="px-4 py-3.5">Submitted</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const service = services.find((item) => item.slug === request.serviceSlug);
              const Icon = SERVICE_ICONS[service?.icon] || ArrowUpRight;
              return (
                <tr key={request.id} className="group transition hover:bg-slate-50/80">
                  <td className="table-cell max-w-[260px]">
                    <button
                      type="button"
                      onClick={() => onSelect(request)}
                      className="block max-w-full text-left"
                    >
                      <span className="block truncate text-xs font-semibold text-navy-800 group-hover:text-brand-600">
                        {request.title}
                      </span>
                      <span className="mt-1 block font-mono text-[9px] tracking-wide text-slate-400">
                        {request.requestId}
                      </span>
                    </button>
                  </td>
                  {admin && (
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar name={request.student?.fullName} size="sm" />
                        <span className="whitespace-nowrap text-[11px] font-medium">
                          {request.student?.fullName || 'Student'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="table-cell">
                    <span className="flex items-center gap-2 whitespace-nowrap text-[11px] text-slate-500">
                      <span
                        className={`rounded-md p-1.5 ${SERVICE_COLORS[service?.color] || 'bg-slate-50 text-slate-500'}`}
                      >
                        <Icon size={13} />
                      </span>
                      {compact ? service?.shortName : request.serviceType}
                    </span>
                  </td>
                  <td className="table-cell whitespace-nowrap text-[11px] text-slate-500">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="table-cell text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(request)}
                      className="table-details-trigger inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                      aria-label={`View ${request.requestId}`}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
