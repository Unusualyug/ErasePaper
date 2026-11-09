import { Suspense } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { Spinner } from './UI';

function RouteContentReady({ locationKey, pathname }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('erasepaper:route-ready', { detail: { locationKey, pathname } }));
  }, [locationKey, pathname]);
  return null;
}

export function RouteFade({ children }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="route-transition"
      initial={{ opacity: reduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
    >
      <RouteContentReady locationKey={location.key} pathname={location.pathname} />
      {children}
    </motion.div>
  );
}

export default function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0.01 : 0.14;

  return (
    <AnimatePresence mode="wait">
      {outlet && (
        <motion.div
          key={location.pathname}
          className="route-transition"
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'easeOut' }}
        >
          <Suspense
            fallback={
              <div className="flex min-h-[45vh] items-center justify-center px-4">
                <Spinner label="Loading your page…" />
              </div>
            }
          >
            <>
              <RouteContentReady locationKey={location.key} pathname={location.pathname} />
              {outlet}
            </>
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
