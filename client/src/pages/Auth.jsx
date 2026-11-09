import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Logo, ErrorState } from '../components/UI';
import { useAppAuth } from '../context/AuthContext';
import api, { errorMessage } from '../lib/api';
import { safeReturnPath } from '../lib/preferences';

function normalizeMobile(value) {
  const input = value.trim();
  if (input.startsWith('+')) return `+${input.slice(1).replace(/\D/g, '')}`;
  const digits = input.replace(/\D/g, '').replace(/^0+/, '');
  return `+91${digits}`;
}

function AuthScreen({ intent = 'signin' }) {
  const signup = intent === 'signup';
  const { mode, setAuthenticatedUser } = useAppAuth();
  const demo = mode === 'demo';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const returnTo = safeReturnPath(params.get('redirect_url') || location.state?.from);
  const serviceReturn = params.get('service')
    ? `/requests/new?service=${encodeURIComponent(params.get('service'))}`
    : null;
  const switchParams = new URLSearchParams();
  if (params.get('service')) switchParams.set('service', params.get('service'));
  if (returnTo) switchParams.set('redirect_url', returnTo);
  const switchQuery = switchParams.toString();
  const switchPath = `${signup ? '/sign-in' : '/sign-up'}${switchQuery ? `?${switchQuery}` : ''}`;

  function continueTo(user) {
    navigate(returnTo || (user.role === 'admin' ? '/admin' : serviceReturn || '/dashboard'), {
      replace: true,
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (signup && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    const mobile = normalizeMobile(phoneNumber);
    if (signup && !/^\+[1-9]\d{7,14}$/.test(mobile)) {
      setError('Enter a valid mobile number. Include a country code if you are outside India.');
      return;
    }
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    try {
      const endpoint = signup ? '/auth/register' : '/auth/login';
      const payload = signup
        ? { username: username.trim(), email: email.trim(), phoneNumber: mobile, password }
        : { email: email.trim(), password };
      const { data } = await api.post(endpoint, payload);
      setAuthenticatedUser(data.user);
      continueTo(data.user);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  async function quick(persona) {
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/demo/quick', { persona });
      setAuthenticatedUser(data.user);
      continueTo(data.user);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-82px)] bg-white lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#f1eefc] p-12 lg:flex lg:flex-col">
        <Link to="/">
          <Logo />
        </Link>
        <div className="my-auto py-14">
          <span className="mb-6 inline-flex rounded-xl bg-white p-3 text-brand-600 shadow-card">
            <Sparkles size={26} />
          </span>
          <h2 className="max-w-sm text-[44px] font-bold leading-[1.15] tracking-[-.05em]">
            A little support.
            <br />A world of
            <br />
            <span className="text-brand-600">possibility.</span>
          </h2>
          <p className="mt-6 max-w-xs text-sm leading-7 text-slate-500">
            Your academic services, your requests, and your next steps—all in one place.
          </p>
          <ul className="mt-10 space-y-5">
            {[
              'Five focused academic services',
              'Private password-protected account',
              'Progress you can follow, support you can reach',
            ].map((text) => (
              <li key={text} className="flex items-center gap-3 text-xs font-medium text-navy-700">
                <span className="rounded-full bg-white p-1 text-brand-600">
                  <Check size={13} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={16} className="text-brand-600" />
          Your work. Your growth. Our guidance.
        </p>
      </aside>

      <div className="flex flex-col items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <Link
            to="/"
            className="auth-text-action mb-6 inline-flex min-h-11 items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 sm:mb-8"
          >
            <ArrowLeft size={14} />
            Back to website
          </Link>
          <div className="mb-7">
            <span className="eyebrow">Your next chapter</span>
            <h1 className="mt-3 text-[30px] font-bold tracking-[-.04em]">
              {signup ? 'Make yourself at home.' : 'Welcome back.'}
            </h1>
            <p className="mt-3 text-[13px] leading-6 text-slate-500">
              {signup
                ? 'Create your account with an email address, username, mobile number, and password.'
                : 'Sign in with your email address and password to pick up where you left off.'}
            </p>
          </div>

          {demo && (
            <div className="mb-6 flex gap-2.5 rounded-lg border border-brand-100 bg-brand-50 p-3 text-[11px] leading-5 text-brand-700">
              <FlaskConical size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Interactive demo.</strong> Accounts are in-memory and reset when the server restarts.
                No email or SMS is sent.
              </span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
              {signup && (
                <p className="hint">Used for sign-in and service emails. This address is not verified.</p>
              )}
            </div>

            {signup && (
              <div>
                <label htmlFor="username" className="label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  className="input"
                  placeholder="e.g. aarav_sharma"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  maxLength={32}
                />
                <p className="hint">This will be your account username and initial display name.</p>
              </div>
            )}

            {signup && (
              <div>
                <label htmlFor="phoneNumber" className="label">
                  Mobile number
                </label>
                <div className="relative">
                  <Smartphone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="phoneNumber"
                    name="tel"
                    type="tel"
                    inputMode="tel"
                    className="input pl-10"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    required
                    maxLength={22}
                  />
                </div>
                <p className="hint">We use this as your account contact number. No code or SMS is sent.</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder={signup ? 'At least 7 characters' : 'Your password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={signup ? 7 : 1}
                maxLength={128}
              />
              {!signup && (
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="auth-text-action text-xs font-semibold text-brand-600"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}
            </div>

            {signup && (
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={7}
                  maxLength={128}
                />
              </div>
            )}

            {error && <ErrorState message={error} />}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <LoaderCircle size={17} className="animate-spin" /> : null}
              {signup ? 'Create account' : 'Sign in'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <LockKeyhole size={12} />
            Passwords are hashed; sessions use HTTP-only cookies (Secure over HTTPS).
          </p>
          <p className="mt-8 text-center text-xs text-slate-500">
            {signup ? 'Already have an account?' : 'New to ErasePaper?'}{' '}
            <Link to={switchPath} className="auth-text-action font-semibold text-brand-600">
              {signup ? 'Sign in' : 'Create an account'}
            </Link>
          </p>

          {demo && (
            <div className="mt-9 border-t border-slate-100 pt-6">
              <p className="mb-3 text-center text-[10px] uppercase tracking-wider text-slate-400">
                Explore a sample account
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => quick('student')}
                  className="btn-secondary btn-sm"
                >
                  <UsersRound size={15} />
                  Student demo
                </button>
              </div>
              <p className="mt-3 text-center text-[9px] leading-4 text-slate-400">
                Sample accounts and requests only. No real student information.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Auth({ intent }) {
  return <AuthScreen intent={intent} />;
}
