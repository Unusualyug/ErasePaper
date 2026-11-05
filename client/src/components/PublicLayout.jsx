import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowUpRight, Menu, X, ArrowRight, ShieldCheck, UserRound, LogIn } from 'lucide-react';
import { Logo } from './UI';
import WhatsAppButton, { WhatsAppIcon } from './WhatsAppButton';
import { useAppAuth } from '../context/AuthContext';
import { whatsappUrl } from '../lib/constants';
import ThemeControl from './ThemeControl';
import LegalLinks from './LegalLinks';

const links = [
  ['Services', '/#services'],
  ['How it works', '/#how-it-works'],
  ['Why ErasePaper', '/#why-us'],
  ['FAQs', '/#faqs'],
];

export default function PublicLayout() {
  const [menu, setMenu] = useState(false);
  const menuTriggerRef = useRef(null);
  const menuRef = useRef(null);
  const { user, mode } = useAppAuth();
  useEffect(() => {
    if (!menu) return undefined;
    menuRef.current?.querySelector('a')?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      menuTriggerRef.current?.focus();
    };
  }, [menu]);
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[100] rounded bg-white p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <header className="site-header sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="container-site flex h-[82px] items-center justify-between gap-4">
          <Link to="/" aria-label="ErasePaper home" className="public-brand-link">
            <Logo className="hidden sm:inline-flex" />
            <Logo compact className="sm:hidden" />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[12px] font-medium text-navy-500 transition hover:text-brand-600"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            {user ? (
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary btn-sm">
                My dashboard
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/sign-in" className="text-xs font-semibold text-navy-800 hover:text-brand-600">
                  Sign in
                </Link>
                <Link to="/sign-up" className="btn-primary btn-sm">
                  Get started
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeControl />
            <Link
              to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/sign-in'}
              className="public-account-trigger lg:hidden"
              aria-label={user ? 'Open your dashboard' : 'Sign in'}
            >
              {user ? <UserRound size={19} /> : <LogIn size={19} />}
            </Link>
            <button
              ref={menuTriggerRef}
              className="public-menu-trigger rounded-lg lg:hidden"
              onClick={() => setMenu((value) => !value)}
              aria-label={menu ? 'Close menu' : 'Open menu'}
              aria-controls="public-mobile-navigation"
              aria-expanded={menu}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav
            ref={menuRef}
            id="public-mobile-navigation"
            className="mobile-site-menu border-t border-slate-100 bg-white px-6 py-5 lg:hidden"
            aria-label="Mobile navigation"
          >
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenu(false)}
                className="block py-3 text-sm font-medium"
              >
                {label}
              </a>
            ))}
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact ErasePaper on WhatsApp at +91 98257 51614"
              className="public-menu-whatsapp mt-2 flex min-h-11 items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"
              onClick={() => setMenu(false)}
            >
              <span className="flex items-center gap-2">
                <WhatsAppIcon size={17} />
                WhatsApp · +91 98257 51614
              </span>
              <ArrowUpRight size={15} />
            </a>
            <div className="mt-3 flex gap-3">
              <Link
                className="btn-secondary flex-1"
                to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/sign-in'}
                onClick={() => setMenu(false)}
              >
                {user ? 'Dashboard' : 'Sign in'}
              </Link>
              {!user && (
                <Link className="btn-primary flex-1" to="/sign-up" onClick={() => setMenu(false)}>
                  Get started
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer border-t border-slate-100 bg-[#f8f9fc]">
        <div className="container-site grid gap-10 pb-10 pt-14 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Link to="/">
              <Logo />
            </Link>
            <p className="mt-4 max-w-[255px] text-[13px] leading-7 text-slate-500">
              Thoughtful academic support.
              <br />A simpler path from idea to submission.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ShieldCheck size={14} className="text-brand-600" />
              Your work. Your growth. Our guidance.
            </span>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-bold">Explore</h3>
            <div className="flex flex-col gap-3 text-xs text-slate-500">
              <a href="/#services" className="hover:text-brand-600">
                Our services
              </a>
              <a href="/#how-it-works" className="hover:text-brand-600">
                How it works
              </a>
              <a href="/#why-us" className="hover:text-brand-600">
                Why ErasePaper
              </a>
              <a href="/#faqs" className="hover:text-brand-600">
                FAQs
              </a>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-bold">Your account</h3>
            <div className="flex flex-col gap-3 text-xs text-slate-500">
              <Link to="/sign-up" className="hover:text-brand-600">
                Create an account
              </Link>
              <Link to="/sign-in" className="hover:text-brand-600">
                Student sign in
              </Link>
              <Link to="/requests" className="hover:text-brand-600">
                Track a request
              </Link>
              <Link to="/profile" className="hover:text-brand-600">
                Profile settings
              </Link>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-bold">Let’s connect</h3>
            <p className="text-xs leading-6 text-slate-500">
              Big question or small doubt?
              <br />
              We’re just a message away.
            </p>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-navy-800 hover:text-brand-600"
            >
              <WhatsAppIcon size={17} className="text-emerald-600" />
              +91 98257 51614
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
        <div className="container-site flex flex-col justify-between gap-4 border-t border-slate-200/70 py-6 text-[10px] leading-relaxed text-slate-400 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} ErasePaper. All rights reserved.</span>
          <span className="flex flex-wrap items-center gap-3">
            Academic assistance, mentoring &amp; documentation support.
            {mode === 'demo' && (
              <Link to="/sign-in" className="rounded bg-brand-100 px-2 py-0.5 font-semibold text-brand-700">
                Interactive demo
              </Link>
            )}
          </span>
          <LegalLinks className="public-footer-legal" />
        </div>
      </footer>
      <WhatsAppButton className="public-whatsapp-button" />
    </>
  );
}
