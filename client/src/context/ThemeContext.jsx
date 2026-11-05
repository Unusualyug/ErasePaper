import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useCookieConsent } from './CookieConsentContext';
import { THEME_MODES, THEME_STORAGE_KEY, readConsentRecord } from '../lib/preferences';

const ThemeContext = createContext(null);

function readSavedTheme() {
  try {
    if (!readConsentRecord()?.preferences.functional) return 'system';
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  const { consent, openSettings } = useCookieConsent();
  const [theme, setThemeState] = useState(readSavedTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const functionalConsent = consent?.preferences?.functional === true;
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const update = (event) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolvedTheme === 'dark' ? '#0b1426' : '#6554d9';
  }, [resolvedTheme]);

  useEffect(() => {
    try {
      if (functionalConsent) window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      else window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Theme still applies for this tab if browser storage is unavailable.
    }
  }, [theme, functionalConsent]);

  const setTheme = useCallback((value) => {
    if (THEME_MODES.includes(value)) setThemeState(value);
  }, []);
  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      canRememberTheme: functionalConsent,
      openCookieSettings: openSettings,
    }),
    [theme, resolvedTheme, setTheme, functionalConsent, openSettings],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider.');
  return context;
}
