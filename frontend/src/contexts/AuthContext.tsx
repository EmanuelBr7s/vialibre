'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { ProfileUpdatePayload, RegisterRequest, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (payload: ProfileUpdatePayload) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = api.getToken();
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);
    api
      .getMe(storedToken)
      .then((me) => setUser(me))
      .catch(() => {
        api.clearToken();
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      setToken(res.access_token);
      const me = await api.getMe(res.access_token);
      setUser(me);
      router.push('/feed');
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const res = await api.register(data);
      setToken(res.access_token);
      const me = await api.getMe(res.access_token);
      setUser(me);
      router.push('/feed');
    },
    [router]
  );

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  /**
   * Actualiza el perfil en el backend y propaga el cambio al estado global.
   * Permite que componentes como el avatar del UserDropdown se refresquen
   * sin recargar la página.
   */
  const updateUser = useCallback(async (payload: ProfileUpdatePayload) => {
    const updated = await api.updateMe(payload);
    setUser((prev) => (prev ? { ...prev, ...updated } : updated));
    return updated;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, loading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
