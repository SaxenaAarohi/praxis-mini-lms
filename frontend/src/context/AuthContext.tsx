import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/lib/api';
import { storage } from '@/utils/storage';
import { refreshSocketAuth, disconnectSocket } from '@/lib/socket';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  signup: (input: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: storage.getUser<User>(),
    token: storage.getToken(),
    loading: true,
  });

  const logout = useCallback(() => {
    storage.clear();
    disconnectSocket();
    setState({ user: null, token: null, loading: false });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });
  }, [logout]);

  const refresh = useCallback(async () => {
    const token = storage.getToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false, user: null, token: null }));
      return;
    }
    try {
      const user = await api.auth.me();
      storage.setUser(user);
      setState({ user, token, loading: false });
    } catch {
      storage.clear();
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await api.auth.login({ email, password });
    storage.setToken(token);
    storage.setUser(user);
    refreshSocketAuth();
    setState({ user, token, loading: false });
    return user;
  }, []);

  const signup = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const { user, token } = await api.auth.signup(input);
      storage.setToken(token);
      storage.setUser(user);
      refreshSocketAuth();
      setState({ user, token, loading: false });
      return user;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, signup, logout, refresh }),
    [state, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
