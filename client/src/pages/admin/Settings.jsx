import { Cookie, Monitor, ShieldCheck, SunMoon } from 'lucide-react';
import { PageHeading } from '../../components/UI';
import ThemeControl from '../../components/ThemeControl';
import { useCookieConsent } from '../../context/CookieConsentContext';
import { useTheme } from '../../context/ThemeContext';

export default function AdminSettings() {
  const { openSettings, consent } = useCookieConsent();
  const { theme, resolvedTheme, canRememberTheme } = useTheme();
  return (
    <>
      <PageHeading
        eyebrow="Your workspace"
        title="Settings"
        description="Local appearance and privacy preferences for this browser. Account authentication is handled by ErasePaper; administrator permissions are checked by the server."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="admin-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="settings-icon">
                <SunMoon size={18} />
              </span>
              <h2 className="mt-4 text-base font-semibold">Appearance</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Choose light, dark or system appearance. This preference stays on this device when Functional
                preferences are enabled.
              </p>
            </div>
            <ThemeControl />
          </div>
          <div className="settings-summary mt-5 flex items-center gap-2 rounded-lg p-3 text-xs">
            <Monitor size={15} />
            Selected:{' '}
            <strong>
              {theme === 'system'
                ? `System (${resolvedTheme})`
                : `${theme[0].toUpperCase()}${theme.slice(1)} mode`}
            </strong>
          </div>
          {!canRememberTheme && theme !== 'system' && (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              The current selection applies for this tab. Enable Functional preferences in Cookie settings to
              remember it.
            </p>
          )}
        </section>
        <section className="admin-card p-6">
          <span className="settings-icon">
            <Cookie size={18} />
          </span>
          <h2 className="mt-4 text-base font-semibold">Cookie preferences</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Required storage is always on. Optional preferences can be changed or withdrawn at any time.
            First-party analytics runs only after consent; no marketing trackers are used.
          </p>
          <div className="settings-summary mt-5 flex flex-wrap gap-x-4 gap-y-2 rounded-lg p-3 text-xs">
            <span>Functional: {consent?.preferences?.functional ? 'On' : 'Off'}</span>
            <span>Analytics: {consent?.preferences?.analytics ? 'On — first-party' : 'Off'}</span>
            <span>Marketing: {consent?.preferences?.marketing ? 'Consented, no integration' : 'Off'}</span>
          </div>
          <button className="btn-secondary mt-4" onClick={openSettings}>
            Manage cookie settings
          </button>
        </section>
        <section className="admin-card p-6 lg:col-span-2">
          <span className="settings-icon">
            <ShieldCheck size={18} />
          </span>
          <h2 className="mt-4 text-base font-semibold">Authentication and access</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            ErasePaper validates password sign-in and manages HTTP-only sessions. The server checks the
            administrator role for every administrative API request. Appearance and cookie preferences never
            grant account or administrator access.
          </p>
        </section>
      </div>
    </>
  );
}
