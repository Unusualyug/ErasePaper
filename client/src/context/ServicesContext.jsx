import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { DEFAULT_SERVICES } from '../lib/services';
const ServicesContext = createContext(DEFAULT_SERVICES);
export function ServicesProvider({ children }) {
  const [services, setServices] = useState(DEFAULT_SERVICES);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/services', { signal: controller.signal })
      .then(({ data }) => setServices(data.services))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
export const useServices = () => useContext(ServicesContext);
