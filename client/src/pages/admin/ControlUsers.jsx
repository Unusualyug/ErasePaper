import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, Phone, ShieldCheck } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import { useToast } from '../../context/ToastContext';
import api, { errorMessage } from '../../lib/api';
import { formatPhoneNumber, normalizeContactNumber } from '../../lib/constants';
import { ErrorState, Modal, PageHeading, Spinner } from '../../components/UI';

export default function ControlUsers() {
  const { mode } = useAppAuth();
  const { whatsappNumber, setWhatsappNumber } = useSiteConfig();
  const toast = useToast();
  const [currentNumber, setCurrentNumber] = useState(whatsappNumber);
  const [draft, setDraft] = useState(() => formatPhoneNumber(whatsappNumber));
  const [pendingNumber, setPendingNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const { data } = await api.get('/admin/control-users');
      const normalized = normalizeContactNumber(data.whatsappNumber);
      if (!normalized) throw new Error('The server returned an invalid contact number.');
      setCurrentNumber(normalized);
      setDraft(formatPhoneNumber(normalized));
      setWhatsappNumber(normalized);
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [setWhatsappNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  function reviewChange(event) {
    event.preventDefault();
    setFormError('');
    setConfirmError('');
    const normalized = normalizeContactNumber(draft);
    if (!normalized) {
      setFormError('Enter a valid international phone number with country code, using 8–15 digits.');
      return;
    }
    if (normalized === currentNumber) {
      toast('That number is already active.', 'info');
      return;
    }
    setPendingNumber(normalized);
    setConfirmOpen(true);
  }

  async function confirmChange() {
    if (saving || !pendingNumber) return;
    setSaving(true);
    setConfirmError('');
    try {
      const { data } = await api.put('/admin/control-users', {
        whatsappNumber: pendingNumber,
        confirmed: true,
      });
      const normalized = normalizeContactNumber(data.whatsappNumber);
      if (!normalized) throw new Error('The server returned an invalid contact number.');
      setCurrentNumber(normalized);
      setDraft(formatPhoneNumber(normalized));
      setWhatsappNumber(normalized);
      setConfirmOpen(false);
      toast('Public WhatsApp and call number updated.');
    } catch (error) {
      setConfirmError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Website controls"
        title="Control Users"
        description="Update the public contact number used across the website. This does not change student or administrator account phone numbers."
      />
      {loading && !currentNumber ? (
        <Spinner label="Loading contact settings…" />
      ) : pageError ? (
        <ErrorState message={pageError} onRetry={load} />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="admin-card p-5 sm:p-7">
            <span className="settings-icon">
              <Phone size={18} />
            </span>
            <h2 className="mt-4 text-base font-semibold">Public WhatsApp and call number</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Current number: <strong className="text-slate-200">{formatPhoneNumber(currentNumber)}</strong>
            </p>
            <form className="mt-6 space-y-4" onSubmit={reviewChange}>
              <div>
                <label htmlFor="public-contact-number" className="admin-label">
                  New mobile number
                </label>
                <input
                  id="public-contact-number"
                  name="publicContactNumber"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={32}
                  className="admin-input mt-2"
                  placeholder="+91 98257 51614"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-describedby="contact-number-help"
                  required
                />
                <p id="contact-number-help" className="mt-2 text-[11px] leading-5 text-slate-500">
                  Include the country code. You can enter spaces, parentheses, or hyphens; the number is
                  stored in international digits-only format.
                </p>
              </div>
              {formError && <p className="text-xs text-red-300">{formError}</p>}
              <button type="submit" className="btn-primary" disabled={saving}>
                <CheckCircle2 size={16} />
                Review number change
              </button>
            </form>
          </section>
          <aside className="admin-card p-5 sm:p-6">
            <ShieldCheck className="text-brand-300" size={22} />
            <h2 className="mt-4 text-sm font-semibold">What this changes</h2>
            <ul className="mt-3 space-y-3 text-xs leading-5 text-slate-400">
              <li>Public WhatsApp links and call links will use the new number.</li>
              <li>Student and administrator account phone numbers are not changed.</li>
              <li>Changes are logged without storing the phone number in the audit log.</li>
            </ul>
            <p className="mt-5 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-slate-500">
              {mode === 'demo'
                ? 'Demo mode uses temporary memory. A change is available during this server session but resets when the demo server restarts.'
                : 'The setting is saved in the server database and remains active after a restart.'}
            </p>
          </aside>
        </div>
      )}
      <Modal
        open={confirmOpen}
        onClose={() => (saving ? null : setConfirmOpen(false))}
        title="Confirm contact number change"
        description="This number is public and will be used for WhatsApp and call links across the website."
        dark
      >
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-sm">
            <p className="text-slate-400">Current number</p>
            <p className="mt-1 font-semibold text-slate-100">{formatPhoneNumber(currentNumber)}</p>
            <p className="mb-2 mt-4 text-slate-400">New number</p>
            <p className="font-semibold text-brand-200">{formatPhoneNumber(pendingNumber)}</p>
          </div>
          {confirmError && <ErrorState message={confirmError} />}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="btn border border-white/10 text-slate-300 hover:bg-white/5"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={confirmChange} disabled={saving}>
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? 'Updating…' : 'Confirm and update'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
