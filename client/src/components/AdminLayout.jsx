import { useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import AnimatedOutlet from './AnimatedOutlet';
import {
  LayoutDashboard,
  UsersRound,
  Files,
  Activity,
  ChartNoAxesCombined,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  LockKeyhole,
  Settings2,
  LoaderCircle,
} from 'lucide-react';
import { Logo, Avatar } from './UI';
import NotificationPanel from './NotificationPanel';
import { useAppAuth } from '../context/AuthContext';
import ThemeControl from './ThemeControl';
import LegalLinks from './LegalLinks';
import { useTheme } from '../context/ThemeContext';
import { useMobileDrawer } from '../hooks/useMobileDrawer';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: UsersRound },
  { to: '/admin/requests', label: 'Service requests', icon: Files },
  { to: '/admin/activity', label: 'Activity & audit log', icon: Activity },
  { to: '/admin/analytics', label: 'Website analytics', icon: ChartNoAxesCombined },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutLock = useRef(false);
  const triggerRef = useRef(null);
  const drawerRef = useRef(null);
  const { user, logout, mode } = useAppAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const closeDrawer = () => setOpen(false);
  useMobileDrawer(open, closeDrawer, drawerRef, triggerRef);
  const location = useLocation();
  async function signOut() {
    if (signOutLock.current) return;
    signOutLock.current = true;
    setSigningOut(true);
    try {
      await logout({ redirectUrl: '/' });
      if (mode === 'demo') navigate('/', { replace: true });
    } catch {
      navigate('/sign-in', { replace: true });
    } finally {
      signOutLock.current = false;
      setSigningOut(false);
    }
  }
  return (
    <div className="admin-scroll admin-shell min-h-screen bg-navy-950 text-slate-100">
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={drawerRef}
        id="admin-navigation-drawer"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-label={open ? 'Administrator navigation' : undefined}
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(304px,86vw)] flex-col border-r border-white/[.06] bg-[#101a2d] px-5 py-7 transition-transform lg:visible lg:w-[238px] lg:translate-x-0 ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-2">
          <Link to="/" aria-label="ErasePaper home">
            <Logo light={resolvedTheme === 'dark'} />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="drawer-close-trigger text-slate-400 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-8 mt-7 flex items-center gap-2 rounded-lg border border-brand-400/20 bg-brand-500/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] text-brand-300">
          <LockKeyhole size={13} />
          Administrator workspace
        </div>
        <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">
          Management
        </p>
        <nav className="space-y-1.5" aria-label="Administrator navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/admin/students'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive || (to === '/admin/students' && location.pathname.startsWith('/admin/students/')) ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`
              }
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4">
            <ShieldCheck className="mb-3 text-brand-300" size={23} />
            <p className="text-xs font-semibold">Protected by design</p>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Server-verified access. Every important action is logged.
            </p>
          </div>
          <Link to="/" className="nav-link mt-5 text-slate-400 hover:text-white">
            <ArrowUpRight size={17} />
            View website
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="nav-link w-full text-slate-400 hover:text-white"
          >
            {signingOut ? <LoaderCircle size={17} className="animate-spin" /> : <LogOut size={17} />}
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <div className="mt-4 flex items-center gap-2 border-t border-white/[.06] px-3 pt-5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${mode === 'demo' ? 'bg-amber-400' : 'bg-emerald-400'}`}
            />
            <span className="text-[10px] text-slate-500">
              {mode === 'demo' ? 'Demo mode · Illustrative data' : 'Live workspace'}
            </span>
          </div>
        </div>
      </aside>
      <div className="lg:pl-[238px]">
        <header className="admin-header sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-white/[.06] bg-navy-950/95 px-3 backdrop-blur-md sm:h-[76px] sm:px-8">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button
              ref={triggerRef}
              className="mobile-navigation-trigger rounded-lg text-slate-300 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-controls="admin-navigation-drawer"
              aria-expanded={open}
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="mobile-brand-link" aria-label="ErasePaper home">
              <Logo compact light={resolvedTheme === 'dark'} />
            </Link>
            <span className="hidden text-xs text-slate-500 sm:inline">Workspace</span>
            <ChevronRight size={13} className="hidden text-slate-600 sm:block" />
            <span className="hidden text-xs font-medium text-slate-300 sm:inline">Administration</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <span className="hidden rounded-md border border-white/10 px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-slate-400 sm:block">
              Admin access
            </span>
            <ThemeControl />
            <NotificationPanel dark={resolvedTheme === 'dark'} />
            <span className="hidden h-7 w-px bg-white/10 sm:block" />
            <Avatar name={user?.fullName} size="sm" className="bg-brand-500/20 text-brand-300" />
          </div>
        </header>
        <main className="mx-auto max-w-[1530px] p-5 pb-12 sm:p-8">
          <AnimatedOutlet />
        </main>
        <footer className="admin-footer border-t border-white/[.06] px-5 py-5 sm:px-8">
          <LegalLinks className="app-footer-legal" />
        </footer>
      </div>
    </div>
  );
}
