import { useEffect, useId, useRef, useState } from 'react';
import { Bell, CheckCheck, UserRoundPlus, FileText, CircleCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { timeAgo } from '../lib/constants';
import { useToast } from '../context/ToastContext';
import { EmptyState, Spinner } from './UI';
export default function NotificationPanel({ dark = false, refreshKey = 0 }) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState({ items: [], unread: 0 }),
    [loading, setLoading] = useState(false);
  const ref = useRef(null),
    toast = useToast();
  const panelId = useId();
  async function load() {
    try {
      const response = await api.get('/notifications');
      setData(response.data);
    } catch {}
  }
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshKey]);
  useEffect(() => {
    function click(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function escape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  async function markRead() {
    setLoading(true);
    try {
      await api.post('/notifications/read', {});
      await load();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        type="button"
        aria-label={`Notifications, ${data.unread} unread`}
        aria-controls={panelId}
        aria-expanded={open}
        className={`notification-trigger relative rounded-lg p-2.5 transition ${dark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        <Bell size={19} strokeWidth={1.7} />
        {data.unread > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500 ring-2 ring-white" />
        )}
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-title`}
          className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-slate-200 bg-white text-navy-900 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
            <h3 id={`${panelId}-title`} className="text-sm font-semibold">
              Notifications{' '}
              {data.unread > 0 && (
                <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">
                  {data.unread}
                </span>
              )}
            </h3>
            <button
              disabled={!data.unread || loading}
              onClick={markRead}
              className="flex items-center gap-1 text-[10px] font-medium text-brand-600"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {data.items.length ? (
              data.items.slice(0, 12).map((n) => {
                const Icon =
                  n.type === 'registration' ? UserRoundPlus : n.type === 'status' ? CircleCheck : FileText;
                return (
                  <Link
                    key={n.id}
                    to={
                      dark
                        ? n.relatedUserId
                          ? `/admin/students/${n.relatedUserId}`
                          : '/admin/requests'
                        : n.relatedRequestId
                          ? `/requests?request=${n.relatedRequestId}`
                          : '/requests'
                    }
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 border-b border-slate-50 p-4 hover:bg-slate-50 ${!n.read ? 'bg-brand-50/40' : ''}`}
                  >
                    <span className="mt-0.5 rounded-lg bg-brand-50 p-2 text-brand-600">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{n.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{n.message}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </Link>
                );
              })
            ) : (
              <EmptyState
                title="You’re all caught up"
                description="New requests and updates will appear here."
                icon={Bell}
              />
            )}
          </div>
          <p className="bg-slate-50 px-4 py-2.5 text-center text-[10px] text-slate-400">
            Updates refresh automatically every 30 seconds
          </p>
        </div>
      )}
    </div>
  );
}
