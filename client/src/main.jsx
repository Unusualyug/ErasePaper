import { lazy, useEffect, useRef, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import './styles/analytics.css';
import api from './lib/api';
import { getScrollPlan } from './lib/navigation';
import { safeReturnPath } from './lib/preferences';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocalAuthProvider, useAppAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ServicesProvider } from './context/ServicesContext';
import CookieConsentExperience from './components/CookieConsent';
import { Logo, Spinner, ErrorState, EmptyState } from './components/UI';
import PublicLayout from './components/PublicLayout';
import StudentLayout from './components/StudentLayout';
import AdminLayout from './components/AdminLayout';
import AnalyticsTracker from './components/AnalyticsTracker';
import ApiProgress from './components/ApiProgress';
import { RouteFade } from './components/AnimatedOutlet';
import PaperCurlIntro from './components/PaperCurlIntro';
const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/student/Dashboard'));
const Requests = lazy(() => import('./pages/student/Requests'));
const NewRequest = lazy(() => import('./pages/student/NewRequest'));
const Profile = lazy(() => import('./pages/student/Profile'));
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const Students = lazy(() => import('./pages/admin/Students'));
const StudentDetail = lazy(() => import('./pages/admin/StudentDetail'));
const AdminRequests = lazy(() => import('./pages/admin/Requests'));
const AdminActivity = lazy(() => import('./pages/admin/Activity'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const PrivacyPolicy = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.PrivacyPolicy })),
);
const CookiePolicy = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.CookiePolicy })),
);
const TermsAndConditions = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.TermsAndConditions })),
);

function RouteEffects() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map());
  const previousLocation = useRef(null);
  const scrollJob = useRef({ raf: 0, timer: 0 });

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useEffect(() => {
    const savePosition = () => {
      positions.current.set(location.key, { top: window.scrollY, left: window.scrollX });
    };
    window.addEventListener('scroll', savePosition, { passive: true });
    return () => window.removeEventListener('scroll', savePosition);
  }, [location.key]);

  useEffect(() => {
    const previous = previousLocation.current;
    const plan = getScrollPlan({
      previousPath: previous?.pathname ?? location.pathname,
      nextPath: location.pathname,
      navigationType,
      savedPosition: positions.current.get(location.key),
      currentPosition: window.scrollY,
      hash: location.hash,
    });
    previousLocation.current = location;

    window.cancelAnimationFrame(scrollJob.current.raf);
    window.clearTimeout(scrollJob.current.timer);
    let attempts = 0;
    const applyScroll = () => {
      if (plan.type === 'hash') {
        let id = plan.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {}
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: 'start', behavior: 'auto' });
          return;
        }
        if (attempts < 24) {
          attempts += 1;
          scrollJob.current.timer = window.setTimeout(applyScroll, 75);
        }
        return;
      }

      const top = Math.max(0, plan.top || 0);
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(plan.left || 0, top);
      root.style.scrollBehavior = previousBehavior;

      const maxTop = Math.max(0, root.scrollHeight - window.innerHeight);
      if (navigationType === 'POP' && top > maxTop + 2 && attempts < 32) {
        attempts += 1;
        scrollJob.current.timer = window.setTimeout(applyScroll, 75);
      }
    };
    const scheduleScroll = () => {
      window.cancelAnimationFrame(scrollJob.current.raf);
      window.clearTimeout(scrollJob.current.timer);
      scrollJob.current.raf = window.requestAnimationFrame(() => {
        scrollJob.current.raf = window.requestAnimationFrame(applyScroll);
      });
    };
    const onRouteReady = (event) => {
      if (event.detail?.locationKey === location.key) scheduleScroll();
    };
    window.addEventListener('erasepaper:route-ready', onRouteReady);
    // Standalone routes and failed lazy imports still get a deterministic scroll plan.
    scrollJob.current.timer = window.setTimeout(scheduleScroll, 1800);

    return () => {
      window.removeEventListener('erasepaper:route-ready', onRouteReady);
      window.cancelAnimationFrame(scrollJob.current.raf);
      window.clearTimeout(scrollJob.current.timer);
    };
  }, [location, navigationType]);
  return null;
}

function SessionProblem({ title, message, signInUrl, onRetry, onSignIn, busy = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const first = dialogRef.current?.querySelector('button:not([disabled]), a[href]');
    (first || dialogRef.current)?.focus();
    function trapFocus(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href]') || [])];
      const firstItem = items[0];
      const lastItem = items.at(-1);
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem?.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem?.focus();
      }
    }
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      previous?.focus?.();
    };
  }, []);
  return (
    <div
      className="session-problem"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-problem-title"
    >
      <div ref={dialogRef} className="session-problem-card" tabIndex={-1}>
        <Logo />
        <h1 id="session-problem-title">{title}</h1>
        <p>{message}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {onRetry && (
            <button className="btn-secondary flex-1" onClick={onRetry} disabled={busy}>
              {busy ? 'Checking session…' : 'Try again'}
            </button>
          )}
          {onSignIn ? (
            <button className="btn-primary flex-1" onClick={onSignIn} disabled={busy}>
              Sign in again
            </button>
          ) : (
            <Link className="btn-primary flex-1" to={signInUrl}>
              Sign in
            </Link>
          )}
        </div>
        <Link className="session-home-link" to="/">
          Return to ErasePaper
        </Link>
      </div>
    </div>
  );
}

function Protected({ admin = false, children }) {
  const { user, loading, authError, sessionExpired, refresh, logout } = useAppAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
  const failed = sessionExpired || !!authError;
  const message = sessionExpired
    ? 'Your authentication session expired or could not be validated. Your open page remains in this tab while you decide what to do.'
    : authError || 'Authentication could not be verified. Please try again.';
  async function signInAgain() {
    if (user) {
      try {
        await logout({ redirectUrl: signInUrl });
      } catch {}
    }
    navigate(signInUrl, { replace: true });
  }

  if (loading && !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking your secure session…" />
      </div>
    );
  if (failed && user)
    return (
      <div className="relative min-h-screen">
        {children}
        <SessionProblem
          title={sessionExpired ? 'Your session needs attention' : 'Connection interrupted'}
          message={message}
          onRetry={refresh}
          onSignIn={signInAgain}
          busy={loading}
        />
      </div>
    );
  if (failed && !user)
    return (
      <SessionProblem
        title={sessionExpired ? 'Please sign in again' : 'We could not verify your session'}
        message={message}
        signInUrl={signInUrl}
        onRetry={refresh}
        busy={loading}
      />
    );
  if (!user) return <Navigate to={signInUrl} replace state={{ from: returnTo }} />;
  if (admin && user.role !== 'admin')
    return (
      <div className="access-denied-page">
        <EmptyState
          title="Administrator access is required"
          description="This account does not have administrator permissions. Roles are assigned by ErasePaper administrators and verified on the server."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link className="btn-primary" to="/dashboard">
                Go to student dashboard
              </Link>
              <Link className="btn-secondary" to="/">
                Return home
              </Link>
            </div>
          }
        />
      </div>
    );
  if (!admin && user.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}

function AuthComplete() {
  const { user, loading } = useAppAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const requested = safeReturnPath(params.get('redirect_url') || location.state?.from);
  useEffect(() => {
    if (!loading && user)
      navigate(requested || (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
  }, [user, loading, navigate, requested]);
  return loading ? (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Preparing your secure workspace…" />
    </div>
  ) : (
    <div className="p-10 text-center">
      <Link to="/sign-in" className="btn-primary">
        Continue to sign in
      </Link>
    </div>
  );
}

function Guest({ children }) {
  const { user, loading, sessionExpired, authError } = useAppAuth();
  if (loading && !user) return <Spinner label="Checking your account…" />;
  if (sessionExpired || authError) return children;
  return user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : children;
}

function HomeReady({ onReady }) {
  useEffect(() => {
    onReady(true);
  }, [onReady]);
  return <Home />;
}

function AppRoutes() {
  const [homeReady, setHomeReady] = useState(false);
  return (
    <>
      <AnalyticsTracker />
      <RouteEffects />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomeReady onReady={setHomeReady} />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="cookie-policy" element={<CookiePolicy />} />
          <Route path="terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route
            path="sign-in"
            element={
              <Guest>
                <Auth intent="signin" />
              </Guest>
            }
          />
          <Route
            path="sign-up"
            element={
              <Guest>
                <Auth intent="signup" />
              </Guest>
            }
          />
        </Route>
        <Route
          path="auth/complete"
          element={
            <RouteFade>
              <AuthComplete />
            </RouteFade>
          }
        />
        <Route
          element={
            <Protected>
              <StudentLayout />
            </Protected>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="requests/new" element={<NewRequest />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route
          path="admin"
          element={
            <Protected admin>
              <AdminLayout />
            </Protected>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route
          path="*"
          element={
            <RouteFade>
              <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
                <Link to="/">
                  <Logo />
                </Link>
                <h1 className="mt-10 text-5xl font-bold text-brand-600">404</h1>
                <h2 className="mt-4 text-xl font-semibold">This page took a different path.</h2>
                <p className="mt-3 text-sm text-slate-500">Let’s get you back to familiar ground.</p>
                <Link to="/" className="btn-primary mt-6">
                  Back to home
                </Link>
              </div>
            </RouteFade>
          }
        />
      </Routes>
      <PaperCurlIntro contentReady={homeReady} />
    </>
  );
}

function ModeApplication({ mode }) {
  const app = (
    <ServicesProvider>
      <ApiProgress />
      <AppRoutes />
    </ServicesProvider>
  );
  return <LocalAuthProvider mode={mode}>{app}</LocalAuthProvider>;
}

function ClientRoot() {
  const [mode, setMode] = useState(null);
  const [error, setError] = useState('');
  function load() {
    setError('');
    api
      .get('/config')
      .then(({ data }) => setMode(data.mode))
      .catch(() => {
        // Keep the public landing page visible if the free service is waking up or
        // the config endpoint is temporarily unavailable. Production is always live mode.
        if (import.meta.env.PROD && window.location.pathname === '/') {
          setMode('live');
          return;
        }
        setError('The application server is not available. Please try again in a moment.');
      });
  }
  useEffect(load, []);
  return (
    <>
      {error ? (
        <div className="mx-auto mt-24 max-w-lg p-6">
          <Logo />
          <div className="mt-8">
            <ErrorState message={error} onRetry={load} />
          </div>
        </div>
      ) : !mode ? (
        <div className="flex min-h-screen items-center justify-center">
          <Spinner label="Getting things ready…" />
        </div>
      ) : (
        <ModeApplication mode={mode} />
      )}
      <CookieConsentExperience />
    </>
  );
}

function Root() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <BrowserRouter>
              <ClientRoot />
            </BrowserRouter>
          </ToastProvider>
        </MotionConfig>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
