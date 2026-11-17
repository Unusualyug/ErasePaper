import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { WHATSAPP_NUMBER } from '../lib/constants';

const SiteConfigContext = createContext(null);

export function SiteConfigProvider({ children, initialWhatsappNumber }) {
  const [whatsappNumber, setNumber] = useState(initialWhatsappNumber || WHATSAPP_NUMBER);
  const setWhatsappNumber = useCallback((number) => setNumber(number), []);
  const value = useMemo(() => ({ whatsappNumber, setWhatsappNumber }), [whatsappNumber, setWhatsappNumber]);

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const context = useContext(SiteConfigContext);
  if (!context) throw new Error('useSiteConfig must be used inside SiteConfigProvider.');
  return context;
}
