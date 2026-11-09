import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const SHOW_DELAY_MS = 160;
const HIDE_DELAY_MS = 90;

export default function ApiProgress() {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    function onActivity(event) {
      const active = Number(event.detail?.active) || 0;
      if (active > 0) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
        if (!visibleRef.current && !showTimer.current) {
          showTimer.current = window.setTimeout(() => {
            showTimer.current = null;
            visibleRef.current = true;
            setVisible(true);
          }, SHOW_DELAY_MS);
        }
        return;
      }

      clearTimeout(showTimer.current);
      showTimer.current = null;
      if (visibleRef.current && !hideTimer.current) {
        hideTimer.current = window.setTimeout(() => {
          hideTimer.current = null;
          visibleRef.current = false;
          setVisible(false);
        }, HIDE_DELAY_MS);
      }
    }

    window.addEventListener('erasepaper:api-activity', onActivity);
    return () => {
      window.removeEventListener('erasepaper:api-activity', onActivity);
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="api-progress"
          role="status"
          aria-live="polite"
          aria-label="Updating ErasePaper"
          className="api-progress-track"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.12 }}
        >
          <span className="sr-only">Updating content…</span>
          <span className="api-progress-indicator" aria-hidden="true" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
