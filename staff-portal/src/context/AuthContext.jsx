import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then(setStaff)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      staff,
      loading,
      isManager: staff?.role === 'manager',
      login: async (username, password) => api.login(username, password),
      verify2FA: async (pendingToken, otp) => {
        const result = await api.verify2FA(pendingToken, otp);
        setToken(result.accessToken);
        setStaff(result.staff);
        return result;
      },
      logout: async () => {
        try {
          await api.logout();
        } catch {
          // ignore
        }
        clearToken();
        setStaff(null);
      },
    }),
    [staff, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
