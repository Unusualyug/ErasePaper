import { useEffect, useState } from 'react';
import { ImagePlus, Pencil, RefreshCw, Trash2, UsersRound, X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import api, { errorMessage } from '../../lib/api';
import { EmptyState, ErrorState, PageHeading, Spinner } from '../../components/UI';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function MemberPhoto({ member }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="flex aspect-[4/5] items-center justify-center bg-white/[.04] text-slate-500">
      <UsersRound size={28} strokeWidth={1.4} aria-hidden="true" />
      <span className="sr-only">Photo unavailable for {member.name}</span>
    </div>
  ) : (
    <img
      src={member.photoUrl}
      alt={`Photo of ${member.name}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="aspect-[4/5] w-full object-cover"
    />
  );
}

export default function TeamMembers() {
  const { data, loading, error, refresh } = useApi('/admin/team');
  const toast = useToast();
  const members = data?.members || [];
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState('');
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    if (!photo) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(photo);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function resetForm() {
    setEditing(null);
    setName('');
    setPhoto(null);
    setFormError('');
    setPhotoError('');
    setPreviewFailed(false);
  }

  function startEdit(member) {
    setEditing(member);
    setName(member.name);
    setPhoto(null);
    setFormError('');
    setPhotoError('');
    setPreviewFailed(false);
    setConfirmingId('');
  }

  function choosePhoto(event) {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (!ALLOWED_PHOTO_TYPES.has(selected.type)) {
      setPhoto(null);
      setPhotoError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_PHOTO_SIZE) {
      setPhoto(null);
      setPhotoError('Team photos must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setPhoto(selected);
    setPhotoError('');
    setFormError('');
    setPreviewFailed(false);
  }

  async function saveMember(event) {
    event.preventDefault();
    if (saving) return;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      setFormError('Enter a name of 1–100 characters.');
      return;
    }
    if (!editing && !photo) {
      setFormError('Choose a photo for the new team member.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = new FormData();
      body.append('name', trimmedName);
      if (photo) body.append('photo', photo);
      if (editing) await api.patch(`/admin/team/${editing.id}`, body);
      else await api.post('/admin/team', body);
      toast(editing ? 'Team member updated.' : 'Team member added to the public website.');
      resetForm();
      refresh();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member) {
    if (removingId) return;
    setRemovingId(member.id);
    try {
      await api.delete(`/admin/team/${member.id}`);
      toast('Team member removed from the public website.');
      if (editing?.id === member.id) resetForm();
      setConfirmingId('');
      refresh();
    } catch (removeError) {
      toast(errorMessage(removeError), 'error');
    } finally {
      setRemovingId('');
    }
  }

  const preview = previewUrl || (editing ? editing.photoUrl : '');

  return (
    <>
      <PageHeading
        eyebrow="Public website"
        title="Our Team"
        description="Manage the names and photos shown in the Our Team section on the public homepage."
        action={
          <span className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-slate-400">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <section className="admin-card p-5 sm:p-6" aria-labelledby="team-member-form-title">
          <div className="flex items-start gap-3">
            <span className="settings-icon">
              <ImagePlus size={18} />
            </span>
            <div>
              <h2 id="team-member-form-title" className="text-base font-semibold">
                {editing ? 'Edit team member' : 'Add a team member'}
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Names and photos are public. Upload only a photo you have permission to publish.
              </p>
            </div>
          </div>
          <form className="mt-6 space-y-5" onSubmit={saveMember}>
            <div>
              <label htmlFor="team-member-name" className="admin-label">
                Name
              </label>
              <input
                id="team-member-name"
                name="name"
                className="admin-input mt-2"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Team member name"
                required
              />
            </div>
            <div>
              <label htmlFor="team-member-photo" className="admin-label">
                Photo {editing && <span className="font-normal text-slate-500">(optional when editing)</span>}
              </label>
              <input
                key={editing?.id || 'new-member'}
                id="team-member-photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="admin-input mt-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-200"
                onChange={choosePhoto}
                required={!editing}
                aria-describedby="team-photo-help"
              />
              <p id="team-photo-help" className="mt-2 text-[11px] leading-5 text-slate-500">
                JPG, PNG, or WebP · up to 5 MB. A replacement photo is published when you save.
              </p>
              {photoError && (
                <p className="mt-2 text-xs text-red-300" role="alert">
                  {photoError}
                </p>
              )}
            </div>
            {preview && (
              <div className="flex items-center gap-4 rounded-lg border border-white/[.07] bg-white/[.02] p-3">
                {previewFailed ? (
                  <span className="flex h-24 w-20 items-center justify-center rounded-lg bg-white/[.04] text-slate-500">
                    <UsersRound size={25} aria-hidden="true" />
                  </span>
                ) : (
                  <img
                    src={preview}
                    alt={`Preview of ${name || 'team member photo'}`}
                    onError={() => setPreviewFailed(true)}
                    className="h-24 w-20 rounded-lg object-cover"
                  />
                )}
                <p className="min-w-0 text-xs leading-5 text-slate-400">
                  {photo ? 'New photo preview' : 'Current public photo'}
                  <span className="mt-1 block break-all font-medium text-slate-200">
                    {name || 'Team member'}
                  </span>
                </p>
              </div>
            )}
            {formError && (
              <p className="text-xs text-red-300" role="alert">
                {formError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                <ImagePlus size={16} />
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add member'}
              </button>
              {editing && (
                <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
                  <X size={16} />
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-card overflow-hidden" aria-labelledby="team-member-list-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] p-5">
            <div>
              <h2 id="team-member-list-title" className="text-sm font-semibold">
                Public team profiles
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Profiles display in the order they were added.
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="btn btn-sm border border-white/10 text-slate-300"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
          {error && !data ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={refresh} />
            </div>
          ) : loading && !data ? (
            <Spinner label="Loading team profiles…" />
          ) : members.length ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="overflow-hidden rounded-xl border border-white/[.08] bg-white/[.025]"
                >
                  <MemberPhoto key={member.photoUrl} member={member} />
                  <div className="p-3.5">
                    <h3 className="break-words text-sm font-semibold text-slate-100">{member.name}</h3>
                    {confirmingId === member.id ? (
                      <div
                        className="mt-3 rounded-lg border border-red-400/20 bg-red-500/[.07] p-3"
                        role="alert"
                      >
                        <p className="text-[11px] leading-5 text-slate-300">
                          Remove {member.name} and their photo from the website?
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm border border-white/10 text-slate-300"
                            onClick={() => setConfirmingId('')}
                            disabled={removingId === member.id}
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm border border-red-400/30 bg-red-500/10 text-red-200"
                            onClick={() => removeMember(member)}
                            disabled={removingId === member.id}
                          >
                            {removingId === member.id ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm border border-white/10 text-slate-300"
                          onClick={() => startEdit(member)}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm border border-red-400/20 text-red-300 hover:bg-red-500/10"
                          onClick={() => setConfirmingId(member.id)}
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-slate-200">
              <EmptyState
                title="No team members yet"
                description="Add a name and photo to introduce your team on the public homepage."
                icon={UsersRound}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
