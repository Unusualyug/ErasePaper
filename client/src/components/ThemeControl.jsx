import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { useTheme } from '../context/ThemeContext';

const choices = [
  { value: 'light', label: 'Light mode', icon: Sun },
  { value: 'dark', label: 'Dark mode', icon: Moon },
  { value: 'system', label: 'System default', icon: Monitor },
];

export default function ThemeControl({ className = '' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { consent, openSettings } = useCookieConsent();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const menuId = useId();
  const active = choices.find((choice) => choice.value === theme) || choices[2];
  const ActiveIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  const canRemember = consent?.preferences?.functional === true;

  useEffect(() => {
    function outside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  return (
    <div className={`theme-control relative ${className}`} ref={root}>
      <button
        type="button"
        className="theme-control-trigger"
        aria-label={`Theme: ${active.label}${theme === 'system' ? `, currently ${resolvedTheme}` : ''}`}
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveIcon size={18} aria-hidden="true" />
        <span className="sr-only">Choose appearance</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            className="theme-control-menu"
            role="group"
            aria-label="Color theme"
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <p className="theme-menu-title">Appearance</p>
            {choices.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                className="theme-choice"
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
                {theme === value && <Check className="ml-auto" size={15} aria-hidden="true" />}
              </button>
            ))}
            {!canRemember && theme !== 'system' && (
              <div className="theme-preference-help">
                <p>This theme applies now. Enable Functional preferences to remember it on this device.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openSettings();
                  }}
                >
                  Cookie settings
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
