import { useEffect, useState } from 'react';
import {
  Paperclip,
  Download,
  CalendarDays,
  Save,
  MessageCircle,
  ShieldCheck,
  LoaderCircle,
  Ban,
} from 'lucide-react';
import { Modal, StatusBadge, ErrorState, Avatar } from './UI';
import { WhatsAppIcon } from './WhatsAppButton';
import { useToast } from '../context/ToastContext';
import { FIELD_LABELS, formatDate, whatsappUrl } from '../lib/constants';
import api, { errorMessage, downloadAttachment } from '../lib/api';
export default function RequestDetails({ request, onClose, admin = false, onUpdated }) {
  const [status, setStatus] = useState(request?.status || 'Pending'),
    [notes, setNotes] = useState(request?.adminNotes || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [cancelConfirm, setCancelConfirm] = useState(false);
  const toast = useToast();
  useEffect(() => {
    setStatus(request?.status || 'Pending');
    setNotes(request?.adminNotes || '');
    setError('');
    setCancelConfirm(false);
  }, [request?.id, request?.updatedAt]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch(`/admin/requests/${request.id}`, { status, adminNotes: notes });
      toast('Request updated. The student has been notified of status changes.');
      onUpdated?.(data.request);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      const { data } = await api.post(`/requests/${request.id}/cancel`);
      toast('Your request has been cancelled.');
      onUpdated?.(data.request);
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function download(file) {
    try {
      await downloadAttachment(request.id, file);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }
  return (
    <>
      <Modal
        open={!!request}
        onClose={onClose}
        title={request?.title || 'Request details'}
        description={request?.requestId}
        wide
        dark={admin}
      >
        {request && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`text-xs font-medium ${admin ? 'text-brand-300' : 'text-brand-600'}`}>
                {request.serviceType}
              </span>
              <StatusBadge status={request.status} />
            </div>
            {admin && request.student && (
              <div
                className={`flex items-center justify-between gap-3 rounded-lg p-3.5 ${admin ? 'bg-white/5' : 'bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={request.student.fullName} size="sm" />
                  <div>
                    <p className="text-xs font-semibold">{request.student.fullName}</p>
                    <p className={`mt-1 text-[11px] ${admin ? 'text-slate-400' : 'text-slate-500'}`}>
                      {request.student.phoneNumber}
                    </p>
                  </div>
                </div>
                <a
                  href={whatsappUrl(
                    request.student.phoneNumber,
                    `Hello ${request.student.fullName}, this is ErasePaper regarding your request ${request.requestId}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500"
                >
                  <WhatsAppIcon size={16} />
                  WhatsApp
                </a>
              </div>
            )}
            <div
              className={`flex flex-wrap gap-5 border-y py-3 text-[11px] ${admin ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'}`}
            >
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} />
                Submitted {formatDate(request.createdAt)}
              </span>
              <span>Last updated {formatDate(request.updatedAt)}</span>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold">Requirements</h3>
              <p
                className={`whitespace-pre-wrap text-sm leading-7 ${admin ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {request.description}
              </p>
            </div>
            <dl
              className={`grid gap-x-6 gap-y-4 rounded-xl p-4 sm:grid-cols-2 ${admin ? 'bg-white/[.035]' : 'bg-slate-50'}`}
            >
              {Object.entries(request.details || {})
                .filter(([, value]) => value !== '' && value != null)
                .map(([key, value]) => (
                  <div key={key} className={key === 'deliveryAddress' ? 'sm:col-span-2' : ''}>
                    <dt className={`text-[10px] font-medium ${admin ? 'text-slate-500' : 'text-slate-400'}`}>
                      {FIELD_LABELS[key] || key}
                    </dt>
                    <dd
                      className={`mt-1.5 text-xs leading-relaxed ${admin ? 'text-slate-200' : 'text-navy-800'}`}
                    >
                      {key === 'deadline' ? formatDate(value) : String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
            {request.additionalInfo && (
              <div>
                <h3 className="mb-2 text-xs font-bold">Additional information</h3>
                <p
                  className={`whitespace-pre-wrap text-xs leading-6 ${admin ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  {request.additionalInfo}
                </p>
              </div>
            )}
            {request.attachments?.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold">
                  <Paperclip size={14} />
                  Attachments
                </h3>
                <div className="space-y-2">
                  {request.attachments.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => download(file)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${admin ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <Paperclip size={16} className="text-brand-400" />
                      <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                      <span className="text-[10px] text-slate-500">{Math.ceil(file.size / 1024)} KB</span>
                      <Download size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {admin ? (
              <div className={`space-y-4 border-t pt-5 ${admin ? 'border-white/10' : ''}`}>
                <div>
                  <label htmlFor="request-status" className="admin-label">
                    Request status
                  </label>
                  <select
                    id="request-status"
                    className="admin-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {['Pending', 'In Progress', 'Completed', 'Cancelled'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-notes" className="admin-label">
                    Internal administrative notes
                  </label>
                  <textarea
                    id="admin-notes"
                    className="admin-input min-h-28"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={6000}
                    placeholder="Add context, follow-ups, or next steps…"
                  />
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                    <ShieldCheck size={12} />
                    Only administrators can see these notes.
                  </p>
                </div>
                {error && <ErrorState message={error} />}
                <div className="flex justify-end gap-3">
                  <button
                    className="btn border border-white/10 text-slate-300 hover:bg-white/5"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    onClick={save}
                    className="btn-primary"
                    disabled={busy || (status === request.status && notes === (request.adminNotes || ''))}
                  >
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}Save
                    changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-[11px] leading-5 text-brand-700">
                  <MessageCircle size={16} className="mt-0.5 shrink-0" />
                  Need to add something? Contact us on WhatsApp and mention{' '}
                  <strong>{request.requestId}</strong>.
                </div>
                {error && <ErrorState message={error} />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {request.status === 'Pending' && (
                    <button
                      onClick={() => setCancelConfirm(true)}
                      className="text-[11px] text-slate-400 underline underline-offset-4 hover:text-red-500"
                    >
                      Cancel this request
                    </button>
                  )}
                  <a
                    href={whatsappUrl(
                      undefined,
                      `Hello ErasePaper, I would like to discuss my request ${request.requestId}.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary ml-auto text-xs"
                  >
                    <WhatsAppIcon size={16} className="text-emerald-600" />
                    Contact administrator
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        title="Cancel this request?"
        description="This will mark your request as cancelled. You can always submit a new request later."
      >
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setCancelConfirm(false)}>
            Keep request
          </button>
          <button className="btn-danger" disabled={busy} onClick={cancel}>
            <Ban size={15} />
            Cancel request
          </button>
        </div>
      </Modal>
    </>
  );
}
