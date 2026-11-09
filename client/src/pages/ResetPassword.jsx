import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';
import api, { errorMessage } from '../lib/api';

function passwordStrength(value) {
  const checks = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter((pattern) => pattern.test(value)).length;
  const hasNonWhitespace = /\S/.test(value);
  const strong = hasNonWhitespace && (value.length >= 12 || (value.length >= 8 && checks >= 3));
  const fair = hasNonWhitespace && value.length >= 8 && checks >= 2;
  return { checks, strong, fair };
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const incomingToken = searchParams.get('token') || '';
  const [token, setToken] = useState(incomingToken);
  const { logout } = useAppAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(!token);
  const [error, setError] = useState('');
  const strength = passwordStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    if (!incomingToken) return;
    setToken(incomingToken);
    setInvalidLink(false);
    setError('');
    // The token is already in component state; remove it from the address bar and history entry.
    navigate('/reset-password', { replace: true });
  }, [incomingToken, navigate]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => navigate('/sign-in', { replace: true }), 2800);
    return () => window.clearTimeout(timer);
  }, [success, navigate]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!strength.strong) {
      setError(
        'Use 12 or more characters, or use at least 8 characters with three character types: lowercase, uppercase, number, and symbol.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
      await logout();
      setSuccess(true);
    } catch (requestError) {
      if (requestError.response?.data?.code === 'INVALID_RESET_TOKEN') {
        setInvalidLink(true);
      } else {
        setError(errorMessage(requestError));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container-site mx-auto flex min-h-[62vh] max-w-[560px] items-center justify-center py-12 sm:py-16">
      <section className="card w-full overflow-hidden">
        <div className="h-1.5 bg-brand-600" />
        <div className="p-6 sm:p-9">
          {success ? (
            <div className="py-8 text-center" role="status" aria-live="polite">
              <span className="mx-auto mb-5 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={27} />
              </span>
              <h1 className="text-2xl font-bold tracking-[-.04em]">Password updated</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your password has been successfully updated.
              </p>
              <p className="mt-2 text-xs text-slate-400">Redirecting you to sign in…</p>
              <Link to="/sign-in" className="btn-primary mt-6 w-full">
                Sign in now
              </Link>
            </div>
          ) : invalidLink ? (
            <div className="py-8">
              <span className="mb-5 inline-flex rounded-xl bg-amber-50 p-3 text-amber-600">
                <KeyRound size={24} />
              </span>
              <p className="eyebrow">Password recovery</p>
              <h1 className="mt-3 text-2xl font-bold tracking-[-.04em]">This link can’t be used</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                This password reset link is invalid, expired, or has already been used. Request a new link to
                continue.
              </p>
              <Link to="/forgot-password" className="btn-primary mt-6 w-full">
                Request a new link
              </Link>
              <Link
                to="/sign-in"
                className="auth-text-action mt-5 inline-flex min-h-10 items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="auth-text-action inline-flex min-h-10 items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
              <span className="mb-5 mt-8 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600">
                <LockKeyhole size={23} />
              </span>
              <p className="eyebrow">Secure your account</p>
              <h1 className="mt-3 text-2xl font-bold tracking-[-.04em]">Choose a new password</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Create a strong password you haven’t used for another account.
              </p>

              <form onSubmit={submit} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="new-password" className="label">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      className="input pr-12"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={8}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:text-brand-600"
                      onClick={() => setShowNewPassword((value) => !value)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2" aria-live="polite">
                    <div className="flex flex-1 gap-1" aria-hidden="true">
                      {[0, 1, 2].map((bar) => (
                        <span
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full ${
                            strength.strong
                              ? 'bg-emerald-500'
                              : strength.fair
                                ? bar < 2
                                  ? 'bg-amber-400'
                                  : 'bg-slate-200'
                                : newPassword.length > 0 && bar === 0
                                  ? 'bg-red-400'
                                  : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        strength.strong
                          ? 'text-emerald-700'
                          : strength.fair
                            ? 'text-amber-700'
                            : newPassword
                              ? 'text-red-600'
                              : 'text-slate-400'
                      }`}
                    >
                      {strength.strong
                        ? 'Strong'
                        : strength.fair
                          ? 'Fair'
                          : newPassword
                            ? 'Weak'
                            : 'Strength'}
                    </span>
                  </div>
                  <p className="hint">
                    Use 12+ characters, or 8+ characters with at least three of: lowercase, uppercase, number,
                    and symbol. Maximum 128 characters.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="label">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-new-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input pr-12"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={8}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:text-brand-600"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={
                        showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'
                      }
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p
                      className={`mt-2 text-xs ${passwordsMatch ? 'text-emerald-700' : 'text-red-600'}`}
                      aria-live="polite"
                    >
                      {passwordsMatch ? 'Passwords match.' : 'Passwords do not match.'}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600" />
                  Changing your password signs out all active ErasePaper sessions.
                </p>
                <button className="btn-primary w-full" disabled={busy}>
                  {busy ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={16} />}
                  {busy ? 'Updating password…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
