import { useId, useState } from 'react';
import { MessageCircle, X, ArrowUpRight } from 'lucide-react';
import { formatPhoneNumber, phoneUrl, SUPPORT_EMAIL, whatsappUrl } from '../lib/constants';
export function WhatsAppIcon({ size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.5 11.7a8.6 8.6 0 0 1-12.7 7.6L3 20.5l1.3-4.6a8.6 8.6 0 1 1 16.2-4.2Z" />
      <path d="M8.1 7.5c.4-.4.8-.2 1 .3l.7 1.5c.1.3-.2.7-.5 1.1.7 1.5 1.7 2.5 3.3 3.1.4-.4.7-.8 1.1-.6l1.7.8c.5.2.4.6.2 1-.5 1-1.5 1.3-2.5 1-3.2-1-5.2-3-6.2-6.1-.3-1 .2-1.7 1.2-2.1Z" />
    </svg>
  );
}
export default function WhatsAppButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  const promptId = useId();
  return (
    <div
      className={`whatsapp-floating ${className} fixed bottom-5 right-3 z-40 flex flex-col items-end gap-3 print:hidden sm:bottom-6 sm:right-6`}
    >
      {open && (
        <div
          id={promptId}
          role="dialog"
          aria-labelledby={`${promptId}-title`}
          className="w-[min(18rem,calc(100vw-24px))] rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <p id={`${promptId}-title`} className="font-semibold text-navy-900">
              A little guidance goes a long way.
            </p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp chat prompt"
              className="ml-2 text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Have a question? Talk to us directly on WhatsApp.
          </p>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-between rounded-lg bg-[#168c62] px-4 py-3 text-sm font-semibold text-white"
          >
            Let’s talk
            <ArrowUpRight size={17} />
          </a>
          <p className="mt-3 text-center text-xs text-slate-500">
            Prefer a call?{' '}
            <a className="font-semibold text-brand-600 underline underline-offset-2" href={phoneUrl()}>
              {formatPhoneNumber()}
            </a>
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            Prefer email?{' '}
            <a
              className="break-all font-semibold text-brand-600 underline underline-offset-2"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        className="whatsapp-floating-trigger flex h-[54px] min-h-11 items-center gap-2 rounded-full bg-[#168c62] px-3.5 text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#107653]"
        aria-label="Contact ErasePaper on WhatsApp"
        aria-controls={promptId}
        aria-expanded={open}
      >
        <WhatsAppIcon size={23} />
        <span className="pr-1 text-xs font-semibold">WhatsApp</span>
      </button>
    </div>
  );
}
