import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  X,
  LoaderCircle,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  CircleDashed,
  CircleCheck,
  Ban,
} from 'lucide-react';
import { initials } from '../lib/constants';

export function Logo({ light = false, compact = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-600 text-white">
        <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M9 5h11l5 5v17H9V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M19 5v6h6M13 14h7M13 18h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m5 23 6-7 6 5-6 7H8l-3-5Z" fill="#C9BEFF" stroke="#6c57db" strokeWidth="1.2" />
        </svg>
      </span>
      {!compact && (
        <span
          className={`text-[22px] font-bold tracking-[-.055em] ${light ? 'text-white' : 'text-navy-900'}`}
        >
          Erase<span className={light ? 'text-brand-300' : 'text-brand-600'}>Paper</span>
          <span className="ml-0.5 text-brand-400">.</span>
        </span>
      )}
    </span>
  );
}
export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2.5 py-12 text-sm text-slate-500 ${className}`}
    >
      <LoaderCircle size={20} className="animate-spin text-brand-600" />
      {label}
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="error-state rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700"
    >
      <div className="flex items-start gap-2">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p>{message || 'Something went wrong.'}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 font-semibold underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-brand-50 p-4 text-brand-500">
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ${sizes[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
const statusStyles = {
  Pending: ['bg-amber-50 text-amber-700 ring-amber-600/10', Clock3],
  'In Progress': ['bg-blue-50 text-blue-700 ring-blue-600/10', CircleDashed],
  Completed: ['bg-emerald-50 text-emerald-700 ring-emerald-600/10', CircleCheck],
  Cancelled: ['bg-slate-100 text-slate-500 ring-slate-500/10', Ban],
};
export function StatusBadge({ status }) {
  const [classes, Icon] = statusStyles[status] || statusStyles.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${classes}`}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}
export function Pagination({ page = 1, pages = 1, total = 0, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-slate-500">
      <span>
        {total} {total === 1 ? 'result' : 'results'} · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} />
          Previous
        </button>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
let modalCount = 0;
let originalBodyOverflow = '';
export function Modal({ open, onClose, title, description, children, wide = false, dark = false }) {
  const id = useId();
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    if (modalCount === 0) originalBodyOverflow = document.body.style.overflow;
    modalCount++;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(
      () => panel.current?.querySelector('input, textarea, select, button, [tabindex="0"]')?.focus(),
      30,
    );
    function handleKey(e) {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const elements = [
          ...(panel.current?.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ) || []),
        ].filter((el) => el.offsetParent !== null);
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      modalCount = Math.max(0, modalCount - 1);
      if (modalCount === 0) document.body.style.overflow = originalBodyOverflow;
      document.removeEventListener('keydown', handleKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-navy-950/55 p-4 backdrop-blur-[3px] ${dark ? 'text-slate-100' : 'text-navy-900'}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`my-auto max-h-[90dvh] w-full overflow-y-auto rounded-2xl shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'} ${dark ? 'border border-white/10 bg-navy-800' : 'bg-white'}`}
      >
        <div
          className={`sticky top-0 z-10 flex items-start justify-between gap-4 border-b p-6 ${dark ? 'border-white/10 bg-navy-800' : 'border-slate-100 bg-white'}`}
        >
          <div>
            <h2 id={id} className="text-xl font-bold">
              {title}
            </h2>
            {description && (
              <p className={`mt-1.5 text-sm leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className={`rounded-lg p-1.5 ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[27px] font-bold tracking-[-.035em] sm:text-[30px]">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
export function CheckItem({ children }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed">
      <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
      <span>{children}</span>
    </li>
  );
}
