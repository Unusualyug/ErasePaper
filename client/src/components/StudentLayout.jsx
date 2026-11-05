import { useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  CirclePlus,
  UserRound,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  ChevronRight,
  LifeBuoy,
  ShieldCheck,
  BookOpenCheck,
} from 'lucide-react';
import { Logo, Avatar } from './UI';
import WhatsAppButton from './WhatsAppButton';
import NotificationPanel from './NotificationPanel';
import { useAppAuth } from '../context/AuthContext';
import { whatsappUrl } from '../lib/constants';
import ThemeControl from './ThemeControl';
import LegalLinks from './LegalLinks';
import { useMobileDrawer } from '../hooks/useMobileDrawer';

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/requests', label: 'My requests', icon: Files },
  { to: '/requests/new', label: 'New request', icon: CirclePlus },
  { to: '/profile', label: 'My profile', icon: UserRound },
];
const quickNav = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/requests/new', label: 'Services', icon: BookOpenCheck },
  { to: '/requests', label: 'My requests', icon: Files, end: true },
  { to: '/profile', label: 'Profile', icon: UserRound, end: true },
];

export default function StudentLayout() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const drawerRef = useRef(null);
  const { user, logout, mode } = useAppAuth();
  const navigate = useNavigate();
  const closeDrawer = () => setOpen(false);
  useMobileDrawer(open, closeDrawer, drawerRef, triggerRef);
  async function signOut() {
    try {
      await logout({ redirectUrl: '/' });
      if (mode === 'demo') navigate('/', { replace: true });
    } catch {
      navigate('/sign-in', { replace: true });
    }
  }
  return (
    <div className="student-shell min-h-screen bg-[#f6f7fb]" data-drawer-open={open ? 'true' : undefined}>
      <a
        href="#student-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to dashboard
      </a>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={drawerRef}
        id="student-navigation-drawer"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-label={open ? 'Student navigation' : undefined}
        className={`student-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(304px,86vw)] flex-col bg-navy-900 px-5 py-7 text-white transition-transform lg:visible lg:w-[236px] lg:translate-x-0 ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-2">
          <Link to="/" aria-label="ErasePaper home">
            <Logo light />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="drawer-close-trigger text-slate-400 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-5 mt-8 rounded-lg border border-white/[.07] bg-white/[.04] px-3 py-2.5">
          <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.13em] text-slate-400">
            <ShieldCheck size={13} />
            Student workspace
          </span>
        </div>
        <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Menu</p>
        <nav className="space-y-1.5" aria-label="Student navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/requests'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-950/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`
              }
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
              {to === '/requests/new' && <span className="ml-auto text-base font-light">+</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          <div className="rounded-xl border border-white/[.08] bg-white/[.035] p-4">
            <LifeBuoy size={23} className="mb-3 text-brand-300" />
            <h3 className="text-xs font-semibold">A question on your mind?</h3>
            <p className="mb-4 mt-2 text-[11px] leading-5 text-slate-400">
              Your next step could start with a simple conversation.
            </p>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="student-whatsapp-link flex min-h-11 items-center justify-between gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-200"
              aria-label="Contact ErasePaper on WhatsApp at +91 98257 51614"
            >
              WhatsApp · +91 98257 51614
              <ArrowUpRight size={14} className="shrink-0" />
            </a>
          </div>
          <Link to="/" className="nav-link mt-5 text-slate-400 hover:text-white">
            <ArrowUpRight size={17} />
            Back to website
          </Link>
          <button onClick={signOut} className="nav-link w-full text-slate-400 hover:text-white">
            <LogOut size={17} />
            Sign out
          </button>
          {mode === 'demo' && (
            <p className="mt-3 px-3 text-[9px] text-slate-500">Demo workspace · Sample data only</p>
          )}
        </div>
      </aside>
      <div className="lg:pl-[236px]">
        <header className="student-header sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-slate-200/70 bg-white px-3 sm:h-[76px] sm:px-8 lg:px-6">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button
              ref={triggerRef}
              className="mobile-navigation-trigger rounded-lg text-navy-700 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-controls="student-navigation-drawer"
              aria-expanded={open}
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="mobile-brand-link" aria-label="ErasePaper home">
              <Logo compact />
            </Link>
            <span className="hidden text-xs text-slate-400 sm:inline">Student portal</span>
            <ChevronRight size={13} className="hidden text-slate-300 sm:block" />
            <span className="hidden text-xs font-medium text-navy-700 sm:inline">
              Your academic workspace
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <ThemeControl />
            <NotificationPanel />
            <span className="hidden h-7 w-px bg-slate-200 sm:block" />
            <Link
              to="/profile"
              className="student-profile-trigger flex items-center justify-center gap-2.5 sm:justify-start"
            >
              <Avatar name={user?.fullName} size="sm" />
              <span className="hidden text-xs font-semibold sm:block">{user?.fullName?.split(' ')[0]}</span>
            </Link>
          </div>
        </header>
        <main
          id="student-content"
          className="mx-auto max-w-[1440px] px-4 py-5 pb-28 sm:p-8 sm:pb-32 lg:p-9 lg:pb-16"
        >
          <Outlet />
        </main>
        <footer className="student-footer border-t border-slate-200/70 px-5 py-5 sm:px-8 lg:px-9">
          <LegalLinks className="app-footer-legal" />
        </footer>
      </div>
      <nav className="student-bottom-nav lg:hidden" aria-label="Student quick navigation">
        {quickNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `student-bottom-link${isActive ? ' is-active' : ''}`}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <WhatsAppButton className="student-whatsapp-button" />
    </div>
  );
}
