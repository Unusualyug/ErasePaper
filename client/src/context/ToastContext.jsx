import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const reduceMotion = useReducedMotion();
  const timers = useRef(new Map());
  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );
  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((items) => items.filter((t) => t.id !== id));
  }, []);
  const toast = useCallback(
    (message, type = 'success') => {
      const id = crypto.randomUUID();
      setToasts((items) => [...items.slice(-3), { id, message, type }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), 5500),
      );
    },
    [dismiss],
  );
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-6 left-1/2 z-[100] flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 flex-col gap-2"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = t.type === 'error' ? AlertCircle : t.type === 'info' ? Info : CheckCircle2;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 6 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.16, ease: 'easeOut' }}
                role={t.type === 'error' ? 'alert' : 'status'}
                aria-live={t.type === 'error' ? 'assertive' : 'polite'}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
              >
                <Icon
                  size={20}
                  className={`mt-0.5 shrink-0 ${t.type === 'error' ? 'text-red-500' : t.type === 'info' ? 'text-brand-600' : 'text-emerald-600'}`}
                />
                <p className="flex-1 text-sm leading-relaxed text-navy-800">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="text-slate-400 hover:text-navy-900"
                >
                  <X size={17} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
