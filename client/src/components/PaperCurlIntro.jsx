import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import './paper-curl-intro.css';

const SESSION_KEY = 'erasepaper.paper-intro.v1';
const INTRO_LENGTH_MS = 2520;
let playedInThisTab = false;

function hasPlayedThisSession() {
  if (playedInThisTab) return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === 'played';
  } catch {
    return false;
  }
}

function markPlayedThisSession() {
  playedInThisTab = true;
  try {
    window.sessionStorage.setItem(SESSION_KEY, 'played');
  } catch {
    // The in-memory flag still prevents replay if browser storage is unavailable.
  }
}

function prefersReducedMotionNow() {
  return (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  );
}

function shouldUseLightweightFallback() {
  if (typeof navigator === 'undefined') return false;
  const device = navigator;
  const connection = device.connection || device.mozConnection || device.webkitConnection;
  const hasLowMemory = Number.isFinite(device.deviceMemory) && device.deviceMemory <= 2;
  const hasFewCores = Number.isFinite(device.hardwareConcurrency) && device.hardwareConcurrency <= 2;
  return Boolean(connection?.saveData || hasLowMemory || hasFewCores);
}

function FallbackPaper() {
  return (
    <div className="paper-intro__fallback" aria-hidden="true">
      <div className="paper-intro__fallback-shadow" />
      <div className="paper-intro__fallback-paper">
        <div className="paper-intro__fallback-brand">
          <span className="paper-intro__fallback-brand-name">ErasePaper</span>
          <span className="paper-intro__fallback-tagline">Simplifying Academic Life.</span>
        </div>
        <div className="paper-intro__fallback-curl" />
      </div>
    </div>
  );
}

function PaperCurlIntroLayer({ contentReady }) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => !hasPlayedThisSession() && !prefersReducedMotionNow());
  const [revealing, setRevealing] = useState(false);
  const [coverReached, setCoverReached] = useState(false);
  const [renderMode, setRenderMode] = useState('loading');
  const [Stage, setStage] = useState(null);
  const [animationStartedAt, setAnimationStartedAt] = useState(null);
  const skipButtonRef = useRef(null);
  const revealStartedRef = useRef(false);

  const beginReveal = useCallback(() => {
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;
    markPlayedThisSession();
    setRevealing(true);
  }, []);

  const requestReveal = useCallback(() => {
    setCoverReached(true);
  }, []);

  const handleStageError = useCallback(() => {
    setStage(null);
    setRenderMode('fallback');
  }, []);

  useEffect(() => {
    if (coverReached && contentReady) beginReveal();
  }, [beginReveal, contentReady, coverReached]);

  useEffect(() => {
    if (!visible) return undefined;
    if (prefersReducedMotion || prefersReducedMotionNow()) {
      markPlayedThisSession();
      setVisible(false);
      return undefined;
    }

    markPlayedThisSession();
    const startedAt = performance.now();
    let cancelImport = () => {};
    setAnimationStartedAt(startedAt);

    if (shouldUseLightweightFallback()) {
      setRenderMode('fallback');
    } else {
      let current = true;
      import('./PaperCurlStage.jsx')
        .then((module) => {
          if (!current) return;
          setStage(() => module.default);
          setRenderMode('three');
        })
        .catch(() => {
          if (current) setRenderMode('fallback');
        });
      // The CSS fallback keeps the opening frame alive while the 3D chunk is loading.
      cancelImport = () => {
        current = false;
      };
    }

    const finishTimer = window.setTimeout(
      requestReveal,
      Math.max(0, INTRO_LENGTH_MS - (performance.now() - startedAt)),
    );
    const previousFocus = document.activeElement;
    skipButtonRef.current?.focus({ preventScroll: true });

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestReveal();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        skipButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(finishTimer);
      document.removeEventListener('keydown', handleKeyDown);
      cancelImport();
      if (previousFocus && previousFocus !== document.body) previousFocus.focus?.();
    };
  }, [prefersReducedMotion, requestReveal, visible]);

  function finishFade() {
    if (revealing) setVisible(false);
  }

  if (!visible) return null;

  return (
    <motion.div
      className="paper-intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paper-intro-title"
      initial={{ opacity: 1 }}
      animate={{ opacity: revealing ? 0 : 1 }}
      transition={{ duration: 0.24, ease: 'easeInOut' }}
      onAnimationComplete={finishFade}
    >
      <h2 id="paper-intro-title" className="paper-intro__sr-only">
        ErasePaper. Simplifying Academic Life.
      </h2>
      <div className="paper-intro__stage" aria-hidden="true">
        {renderMode === 'three' && Stage && animationStartedAt !== null ? (
          <Stage startedAt={animationStartedAt} onCover={requestReveal} onError={handleStageError} />
        ) : (
          <FallbackPaper />
        )}
      </div>
      <button ref={skipButtonRef} className="paper-intro__skip" type="button" onClick={requestReveal}>
        {coverReached && !contentReady ? 'Opening homepage…' : 'Skip intro'}
      </button>
    </motion.div>
  );
}

export default function PaperCurlIntro({ contentReady = false }) {
  const { pathname } = useLocation();
  if (pathname !== '/') return null;
  return <PaperCurlIntroLayer contentReady={contentReady} />;
}
