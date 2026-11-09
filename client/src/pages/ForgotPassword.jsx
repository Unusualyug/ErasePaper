import { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api, { errorMessage } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submitLock = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="container-site mx-auto flex min-h-[62vh] max-w-[560px] items-center justify-center py-12 sm:py-16">
      <section className="card w-full overflow-hidden">
        <div className="h-1.5 bg-brand-600" />
        <div className="p-6 sm:p-9">
          <Link
            to="/sign-in"
            className="auth-text-action inline-flex min-h-10 items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>

          {sent ? (
            <motion.div
              className="pt-8"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              <span className="mb-5 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={24} />
              </span>
              <p className="eyebrow">Password recovery</p>
              <h1 className="mt-3 text-2xl font-bold tracking-[-.04em]">Check your inbox</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                If an account exists for that email address, we’ll send a password reset link shortly. Check
                your spam or junk folder too.
              </p>
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600" />
                The link is single-use and expires after 20 minutes.
              </p>
              <Link to="/sign-in" className="btn-primary mt-6 w-full">
                Return to sign in
              </Link>
            </motion.div>
          ) : (
            <>
              <span className="mb-5 mt-8 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600">
                <Mail size={23} />
              </span>
              <p className="eyebrow">Account security</p>
              <h1 className="mt-3 text-2xl font-bold tracking-[-.04em]">Forgot your password?</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter the email address for your ErasePaper account. If an account matches, we’ll send you a
                secure link to choose a new password.
              </p>

              <form onSubmit={submit} className="mt-7 space-y-4" aria-busy={busy}>
                <div>
                  <label htmlFor="recovery-email" className="label">
                    Email address
                  </label>
                  <input
                    id="recovery-email"
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
                </div>
                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <button className="btn-primary w-full" disabled={busy}>
                  {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={16} />}
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
