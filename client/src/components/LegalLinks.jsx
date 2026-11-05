import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';

export default function LegalLinks({ className = '' }) {
  const { openSettings } = useCookieConsent();
  return (
    <nav className={`legal-links ${className}`} aria-label="Legal and privacy settings">
      <Link to="/privacy-policy">Privacy policy</Link>
      <Link to="/cookie-policy">Cookie policy</Link>
      <Link to="/terms-and-conditions">Terms &amp; conditions</Link>
      <button type="button" onClick={openSettings}>
        Cookie settings
      </button>
    </nav>
  );
}
