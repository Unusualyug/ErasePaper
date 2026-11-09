import { useEffect, useState } from 'react';
import { Cookie, LockKeyhole, Settings2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';
import { DEFAULT_COOKIE_PREFERENCES, normalizeCookiePreferences } from '../lib/preferences';
import { Modal } from './UI';

const categories = [
  {
    key: 'necessary',
    title: 'Strictly necessary',
    copy: 'Required for core security, authentication and remembering your consent choice. Always on.',
    active: 'Required',
  },
  {
    key: 'functional',
    title: 'Functional preferences',
    copy: 'Can remember interface preferences, including the selected theme, on this device.',
    active: 'Optional',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    copy: 'Optional first-party analytics counts consented visits, page views and coarse device/source categories. It does not use advertising pixels or retain raw referrer URLs.',
    active: 'Only active after Analytics consent',
  },
  {
    key: 'marketing',
    title: 'Marketing',
    copy: 'Would support advertising or campaign measurement. ErasePaper does not currently use marketing trackers.',
    active: 'Not currently used',
  },
];

function CategoryRow({ category, value, onChange }) {
  const required = category.key === 'necessary';
  const id = `cookie-pref-${category.key}`;
  return (
    <div className="cookie-category-row">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="cookie-category-title">
          {category.title}
        </label>
        <p className="cookie-category-copy">{category.copy}</p>
        {category.active && <p className="cookie-category-state">{category.active}</p>}
      </div>
      <input
        id={id}
        type="checkbox"
        className="cookie-checkbox"
        checked={required ? true : value}
        disabled={required}
        onChange={(event) => onChange?.(event.target.checked)}
        aria-label={`${category.title}${required ? ', always enabled' : ''}`}
      />
    </div>
  );
}

export default function CookieConsentExperience() {
  const { consent, settingsOpen, acceptAll, rejectOptional, savePreferences, openSettings, closeSettings } =
    useCookieConsent();
  const [draft, setDraft] = useState(DEFAULT_COOKIE_PREFERENCES);

  useEffect(() => {
    if (settingsOpen)
      setDraft(normalizeCookiePreferences(consent?.preferences || DEFAULT_COOKIE_PREFERENCES));
  }, [settingsOpen, consent]);

  function update(key, value) {
    setDraft((current) => normalizeCookiePreferences({ ...current, [key]: value }));
  }

  return (
    <>
      {!consent && (
        <section className="cookie-banner" role="region" aria-label="Cookie consent">
          <div className="cookie-banner-copy">
            <span className="cookie-banner-icon" aria-hidden="true">
              <Cookie size={19} />
            </span>
            <div>
              <h2>Privacy choices</h2>
              <p>
                We use necessary storage to keep ErasePaper working and remember your choice. Optional
                preferences are off until you enable them. First-party analytics runs only after Analytics
                consent; no marketing trackers are used.
              </p>
              <div className="cookie-banner-links">
                <Link to="/privacy-policy">Privacy policy</Link>
                <Link to="/cookie-policy">Cookie policy</Link>
              </div>
            </div>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" className="btn-secondary" onClick={rejectOptional}>
              Reject optional
            </button>
            <button type="button" className="btn-secondary" onClick={openSettings}>
              <Settings2 size={16} /> Customize
            </button>
            <button type="button" className="btn-primary" onClick={acceptAll}>
              Accept all
            </button>
          </div>
        </section>
      )}
      <Modal
        open={settingsOpen}
        onClose={closeSettings}
        title="Cookie preferences"
        description="Choose which optional browser storage ErasePaper may use. Necessary storage is always on."
        wide
      >
        <div className="space-y-3">
          {categories.map((category) => (
            <CategoryRow
              key={category.key}
              category={category}
              value={category.key === 'necessary' ? true : draft[category.key]}
              onChange={(value) => update(category.key, value)}
            />
          ))}
        </div>
        <div className="cookie-settings-note mt-5 flex items-start gap-2 rounded-lg p-3 text-xs leading-5">
          <LockKeyhole className="mt-0.5 shrink-0" size={15} />
          <p>
            Your choice is saved in this browser for up to 180 days. Consent is not authentication. We never
            store passwords, student records or authentication session tokens in this preference store.
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={rejectOptional}>
            Reject optional
          </button>
          <button type="button" className="btn-secondary" onClick={closeSettings}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => savePreferences(draft)}>
            Save preferences
          </button>
        </div>
      </Modal>
    </>
  );
}
