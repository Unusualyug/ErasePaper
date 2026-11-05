import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api, { errorMessage, subscribeAuthExpired } from '../lib/api';

const AuthContext = createContext(null);

export function LocalAuthProvider({ children, mode = 'live' }) {
  const [user, setUser] = useState(null);
  const userRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [authError, setAuthError] = useState('');

  const updateUser = useCallback((nextUser) => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    const hadSession = !!userRef.current;
    setLoading(true);
    try {
      const { data } = await api.get('/me');
      updateUser(data.user);
      setSessionExpired(false);
      setAuthError('');
    } catch (error) {
      if (error.response?.status === 401) {
        updateUser(null);
        setSessionExpired(hadSession);
        setAuthError(hadSession ? 'Your session has ended. Sign in again to continue.' : '');
      } else {
        setAuthError(errorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    const unsubscribe = subscribeAuthExpired(() => {
      if (userRef.current) {
        updateUser(null);
        setSessionExpired(true);
        setAuthError('Your session has ended. Sign in again to continue.');
      }
    });
    refresh();
    return unsubscribe;
  }, [refresh, updateUser]);

  const setAuthenticatedUser = useCallback(
    (nextUser) => {
      updateUser(nextUser);
      setSessionExpired(false);
      setAuthError('');
      setLoading(false);
    },
    [updateUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    updateUser(null);
    setSessionExpired(false);
    setAuthError('');
  }, [updateUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        mode,
        refresh,
        logout,
        setAuthenticatedUser,
        sessionExpired,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAppAuth = () => useContext(AuthContext);
