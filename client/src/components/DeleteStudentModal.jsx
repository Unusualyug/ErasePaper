import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react';
import { Modal, ErrorState, Avatar } from './UI';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
export default function DeleteStudentModal({ student, onClose, onDeleted }) {
  const [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const toast = useToast();
  useEffect(() => {
    setConfirmation('');
    setError('');
  }, [student?.id]);
  async function remove(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.delete(`/admin/students/${student.id}`, { data: { confirmation } });
      toast(data.message, data.status === 'completed' ? 'success' : 'info');
      onDeleted?.();
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!student}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Permanently delete student?"
      description="This action cannot be undone. Please review the details carefully."
      dark
    >
      {student && (
        <form onSubmit={remove} className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <Avatar name={student.fullName} />
            <div>
              <p className="text-sm font-semibold">{student.fullName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {student.phoneNumber} · {student.studentId}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 rounded-lg border border-red-400/20 bg-red-400/5 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
            <div className="text-xs leading-6 text-slate-300">
              <p>This permanently removes:</p>
              <ul className="mt-1 list-inside list-disc text-slate-400">
                <li>The student’s profile and service requests</li>
                <li>Associated attachments and notifications</li>
                <li>The student’s ErasePaper sign-in sessions</li>
              </ul>
              <p className="mt-2">
                The student will no longer be able to sign in. Minimal, non-identifying audit records are
                retained. If private-file cleanup fails, access stays blocked and cleanup retries
                automatically.
              </p>
            </div>
          </div>
          <div>
            <label className="admin-label" htmlFor="delete-confirm">
              Type <strong className="select-all text-slate-100">{student.fullName}</strong> to confirm
            </label>
            <input
              id="delete-confirm"
              className="admin-input"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Student’s full name"
              required
            />
          </div>
          {error && <ErrorState message={error} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn border border-white/10 text-slate-300 hover:bg-white/5"
              onClick={onClose}
              disabled={busy}
            >
              Keep student
            </button>
            <button className="btn-danger" disabled={busy || confirmation.trim() !== student.fullName}>
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {busy ? 'Deleting securely…' : 'Delete permanently'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
