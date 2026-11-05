import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';
import { useAppAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  clearAnalyticsIds,
  classifyTrafficSource,
  createAnalyticsSessionId,
  getOrCreateAnalyticsIds,
  normalizedAnalyticsPath,
  readAnalyticsIds,
  safeAnalyticsHash,
  serviceSlugFromSearch,
} from '../lib/analytics';

const HEARTBEAT_INTERVAL_MS = 25_000;
const INACTIVITY_TIMEOUT_MS = 2 * 60_000;
const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60_000;

export default function AnalyticsTracker() {
  const location = useLocation();
  const { consent } = useCookieConsent();
  const { user, loading } = useAppAuth();
  const analyticsEnabled = consent?.preferences?.analytics === true;
  const identityRef = useRef(null);
  const lastRouteRef = useRef('');
  const latestPageRef = useRef(null);
  const lastActivityRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const routeKey = location.key || `${location.pathname}${location.search}${location.hash}`;

  latestPageRef.current = {
    path: normalizedAnalyticsPath(location.pathname),
    hash: safeAnalyticsHash(location.hash),
    serviceSlug: serviceSlugFromSearch(location.search),
    source: classifyTrafficSource(document.referrer, window.location.hostname),
  };

  function noteActivity() {
    const now = Date.now();
    if (
      identityRef.current &&
      lastActivityRef.current &&
      now - lastActivityRef.current >= SESSION_INACTIVITY_TIMEOUT_MS
    ) {
      identityRef.current = {
        ...identityRef.current,
        sessionId: createAnalyticsSessionId(),
      };
      lastHeartbeatRef.current = 0;
    }
    lastActivityRef.current = now;
    return now;
  }

  function sendHeartbeat(ids = identityRef.current) {
    if (!ids || !analyticsEnabled) return;
    lastHeartbeatRef.current = Date.now();
    void api
      .post('/analytics/heartbeat', {
        analyticsConsent: true,
        visitorId: ids.visitorId,
        sessionId: ids.sessionId,
        ...latestPageRef.current,
      })
      .catch(() => {
        // Analytics must never interrupt site usage; stale presence naturally expires server-side.
      });
  }

  useEffect(() => {
    if (!analyticsEnabled) {
      const previous = identityRef.current || readAnalyticsIds();
      identityRef.current = null;
      lastRouteRef.current = '';
      lastActivityRef.current = 0;
      lastHeartbeatRef.current = 0;
      clearAnalyticsIds(previous.visitorId, previous.sessionId);
      if (previous.visitorId)
        void api.delete('/analytics/visitor', { data: { visitorId: previous.visitorId } }).catch(() => {});
      return undefined;
    }
    if (loading) return undefined;

    if (!identityRef.current) identityRef.current = getOrCreateAnalyticsIds();
    noteActivity();
    sendHeartbeat(identityRef.current);

    const markActivity = () => {
      noteActivity();
      if (Date.now() - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) sendHeartbeat();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') markActivity();
    };
    const passive = { passive: true };
    document.addEventListener('pointermove', markActivity, passive);
    document.addEventListener('pointerdown', markActivity, passive);
    document.addEventListener('keydown', markActivity);
    document.addEventListener('touchstart', markActivity, passive);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('scroll', markActivity, passive);

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_TIMEOUT_MS) return;
      if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('pointermove', markActivity, passive);
      document.removeEventListener('pointerdown', markActivity, passive);
      document.removeEventListener('keydown', markActivity);
      document.removeEventListener('touchstart', markActivity, passive);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('scroll', markActivity, passive);
    };
  }, [analyticsEnabled, loading, user?.role]);

  useEffect(() => {
    if (!analyticsEnabled || loading || !identityRef.current || lastRouteRef.current === routeKey) return;
    lastRouteRef.current = routeKey;
    noteActivity();
    lastHeartbeatRef.current = Date.now();
    const ids = identityRef.current;
    const page = latestPageRef.current;
    void api
      .post('/analytics/page-view', {
        analyticsConsent: true,
        visitorId: ids.visitorId,
        sessionId: ids.sessionId,
        ...page,
      })
      .catch(() => {
        // No user-facing errors for optional analytics.
      });
  }, [analyticsEnabled, loading, routeKey]);

  return null;
}
