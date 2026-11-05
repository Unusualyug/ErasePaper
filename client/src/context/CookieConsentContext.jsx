import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_PREFERENCES,
  createConsentRecord,
  normalizeCookiePreferences,
  readConsentRecord,
} from '../lib/preferences';

const CookieConsentContext = createContext(null);

export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readConsentRecord());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    function syncAcrossTabs(event) {
      if (event.key === CONSENT_STORAGE_KEY) setConsent(readConsentRecord());
    }
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  const savePreferences = useCallback((preferences) => {
    const record = createConsentRecord(normalizeCookiePreferences(preferences));
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Keep the current choice in memory if browser storage is unavailable.
    }
    setConsent(record);
    setSettingsOpen(false);
    return record;
  }, []);
  const acceptAll = useCallback(
    () => savePreferences({ necessary: true, functional: true, analytics: true, marketing: true }),
    [savePreferences],
  );
  const rejectOptional = useCallback(() => savePreferences(DEFAULT_COOKIE_PREFERENCES), [savePreferences]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const value = useMemo(
    () => ({
      consent,
      settingsOpen,
      savePreferences,
      acceptAll,
      rejectOptional,
      openSettings,
      closeSettings,
    }),
    [consent, settingsOpen, savePreferences, acceptAll, rejectOptional, openSettings, closeSettings],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error('useCookieConsent must be used inside CookieConsentProvider.');
  return context;
}
