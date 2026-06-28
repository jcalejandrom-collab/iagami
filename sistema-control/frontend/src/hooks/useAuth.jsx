import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../services/api.js';

/* ---- Context ---- */
const AuthContext = createContext(null);

const TOKEN_KEY = 'iagami_token';
const USER_KEY  = 'iagami_user';

/* sessionStorage keeps the token in memory only for this tab; it is
   not readable by other tabs and is cleared when the tab closes,
   reducing the XSS exposure window compared to localStorage. */
const store = sessionStorage;

/* ---- Provider ---- */
export function AuthProvider({ children }) {
  const [token, setToken]     = useState(() => store.getItem(TOKEN_KEY) || null);
  const [user, setUser]       = useState(() => {
    try {
      const stored = store.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  /* authChecked: false mientras se revalida el token al montar. Permite que
     las rutas protegidas muestren un estado de carga en vez de redirigir
     prematuramente a login cuando el token existe pero el perfil aún no se
     ha resuelto. */
  const [authChecked, setAuthChecked] = useState(() => !(store.getItem(TOKEN_KEY) && !store.getItem(USER_KEY)));

  /* On mount: if we have a token but no user, fetch profile */
  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      authApi.me().then(({ data, error }) => {
        if (!error && data) {
          const profile = data.user || data;
          setUser(profile);
          store.setItem(USER_KEY, JSON.stringify(profile));
        } else {
          // Token invalid — clear
          setToken(null);
          setUser(null);
          store.removeItem(TOKEN_KEY);
          store.removeItem(USER_KEY);
        }
      }).finally(() => {
        setLoading(false);
        setAuthChecked(true);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * login(email, password) → { error } | { user }
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    const { data, error } = await authApi.login(email, password);
    setLoading(false);

    if (error) {
      return { error };
    }

    const receivedToken = data.token || data.access_token;
    const receivedUser  = data.user  || data.admin || data;

    if (!receivedToken) {
      return { error: 'Respuesta inesperada del servidor.' };
    }

    store.setItem(TOKEN_KEY, receivedToken);
    store.setItem(USER_KEY, JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);

    return { user: receivedUser };
  }, []);

  /**
   * logout() — clears state and storage
   */
  const logout = useCallback(() => {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = !!(user && user.role === 'admin');

  const value = {
    user,
    token,
    loading,
    authChecked,
    isAdmin,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---- Hook ---- */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export default useAuth;
