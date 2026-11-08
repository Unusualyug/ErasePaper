import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound,
  ShieldCheck,
  Mail,
  Smartphone,
  CalendarDays,
  Save,
  LogOut,
  LockKeyhole,
  LoaderCircle,
} from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeading, Avatar, ErrorState } from '../../components/UI';
import { formatDate } from '../../lib/constants';
import api, { errorMessage } from '../../lib/api';

export default function Profile() {
  const { user, mode, refresh, logout } = useAppAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState('details');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setName(user?.fullName || '');
    setEmail(user?.email || '');
  }, [user?.fullName, user?.email]);

  const dirty = name !== user?.fullName || email !== user?.email;
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.patch('/me', { fullName: name, email });
      await refresh();
      toast('Your profile has been updated.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <PageHeading
        title="My profile"
        description="Your details, your preferences, your academic workspace."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[190px_1fr]">
        <aside className="card p-2">
          {[
            [UserRound, 'My details', 'details'],
            [ShieldCheck, 'Account security', 'security'],
          ].map(([Icon, label, value]) => (
            <button
              key={value}
              onClick={() => setSection(value)}
              className={`nav-link w-full ${section === value ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            onClick={signOut}
            className="nav-link mt-2 w-full border-t border-slate-100 text-slate-500 hover:text-red-600"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="card overflow-hidden">
            <div className="relative h-32 overflow-hidden bg-[#eeebfa]">
              <div className="absolute -right-6 -top-20 h-64 w-64 rounded-full border-[35px] border-brand-200/30" />
              <div className="absolute right-28 top-8 h-24 w-24 rounded-full border border-brand-200" />
            </div>
            <div className="relative px-6 pb-6">
              <div className="-mt-10 mb-4 flex items-end justify-between">
                <Avatar name={user?.fullName} size="xl" className="ring-[5px] ring-white" />
                <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-700">
                  <ShieldCheck size={13} />
                  Student account
                </span>
              </div>
              <h2 className="text-2xl font-bold">{user?.fullName}</h2>
              <p className="mt-1.5 text-xs text-slate-400">
                @{user?.username} · {user?.studentId}
              </p>
            </div>
          </section>

          {section === 'details' ? (
            <form onSubmit={save} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-base font-bold">Personal information</h2>
                  <p className="mt-1 text-xs text-slate-400">Keep your profile details up to date.</p>
                </div>
                <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                  Student profile
                </span>
              </div>
              <div className="space-y-6 p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-name" className="label">
                      Display name
                    </label>
                    <input
                      id="profile-name"
                      className="input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-username">
                      Username
                    </label>
                    <input id="profile-username" className="input" value={user?.username || ''} disabled />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="profile-mobile">
                    Mobile number
                  </label>
                  <div className="relative">
                    <Smartphone size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="profile-mobile"
                      className="input pl-10"
                      value={user?.phoneNumber || ''}
                      disabled
                      aria-describedby="mobile-note"
                    />
                  </div>
                  <p id="mobile-note" className="hint">
                    This number is not verified. No SMS or verification code is sent.
                  </p>
                </div>
                <div>
                  <label htmlFor="profile-email" className="label">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="profile-email"
                      type="email"
                      className="input pl-10"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      maxLength={254}
                    />
                  </div>
                  <p className="hint">
                    {user?.email
                      ? 'Used for email-only sign-in and service emails. This address is not verified.'
                      : 'Add an email before your current session ends so you can sign in again and receive service emails. This address is not verified.'}
                  </p>
                </div>
                <div className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <CalendarDays size={13} />
                      Account created
                    </p>
                    <p className="mt-2 text-xs font-medium">{formatDate(user?.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Authentication</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                      <LockKeyhole size={13} className="text-brand-600" />
                      ErasePaper local account
                    </p>
                  </div>
                </div>
                {error && <ErrorState message={error} />}
              </div>
              <div className="profile-form-actions flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-5">
                <button
                  type="button"
                  className="btn-secondary w-full sm:w-auto"
                  onClick={() => {
                    setName(user?.fullName || '');
                    setEmail(user?.email || '');
                    setError('');
                  }}
                >
                  Reset changes
                </button>
                <button className="btn-primary w-full sm:w-auto" disabled={!dirty || busy}>
                  {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                  Save changes
                </button>
              </div>
            </form>
          ) : (
            <section className="card p-6">
              <h2 className="text-base font-bold">Account security</h2>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Your password is stored as a one-way scrypt hash, not as readable text. Sign-in sessions are
                held in HTTP-only cookies and can be ended by signing out.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <LockKeyhole size={20} className="mt-0.5 text-brand-600" />
                  <div>
                    <h3 className="text-xs font-semibold">Password sign-in</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your email address and password are used to sign in. Email addresses are not verified;
                      use a unique password of at least 7 characters.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <Smartphone size={20} className="mt-0.5 text-brand-600" />
                  <div>
                    <h3 className="text-xs font-semibold">Mobile contact</h3>
                    <p className="mt-1 text-xs text-slate-500">{user?.phoneNumber} · not verified</p>
                  </div>
                </div>
              </div>
              {mode === 'demo' && (
                <p className="mt-5 rounded-lg bg-brand-50 p-3 text-[11px] leading-6 text-brand-700">
                  This is an isolated, in-memory demo. Its sample accounts and changes are reset when the
                  server restarts.
                </p>
              )}
              {error && (
                <div className="mt-4">
                  <ErrorState message={error} />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
