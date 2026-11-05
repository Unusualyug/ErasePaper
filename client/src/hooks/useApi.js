import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
export function useApi(url, initial = null) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const currentUrl = useRef(url);
  currentUrl.current = url;
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api
      .get(url, { signal: controller.signal })
      .then((response) => {
        if (currentUrl.current === url) setData(response.data);
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED' && error.name !== 'CanceledError') setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, version]);
  return { data, loading, error, refresh, setData };
}
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
