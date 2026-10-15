'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createApiClient, TokenPair } from './api-client';

export interface AdminProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AdminAuthState {
  status: 'loading' | 'authed' | 'guest';
  admin: AdminProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: ReturnType<typeof createApiClient>;
}

const Ctx = createContext<AdminAuthState | null>(null);
const ACCESS_KEY = 'adminAccessToken';
const REFRESH_KEY = 'adminRefreshToken';
const ADMIN_ROLES = ['super_admin', 'admin', 'editor'];

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AdminAuthState['status']>('loading');
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  const getTokens = useCallback((): TokenPair | null => {
    const a = localStorage.getItem(ACCESS_KEY);
    const r = localStorage.getItem(REFRESH_KEY);
    return a && r ? { accessToken: a, refreshToken: r } : null;
  }, []);

  const setTokens = useCallback((t: TokenPair | null) => {
    if (t) {
      localStorage.setItem(ACCESS_KEY, t.accessToken);
      localStorage.setItem(REFRESH_KEY, t.refreshToken);
    } else {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        getTokens,
        setTokens,
        refreshPath: '/v1/admin/auth/refresh',
        onAuthFailure: () => {
          setAdmin(null);
          setStatus('guest');
        },
      }),
    [getTokens, setTokens],
  );

  useEffect(() => {
    (async () => {
      if (!getTokens()) {
        setStatus('guest');
        return;
      }
      try {
        const me = await api.get<AdminProfile>('/v1/admin/auth/me');
        if (!ADMIN_ROLES.includes(me.role)) throw new Error('forbidden');
        setAdmin(me);
        setStatus('authed');
      } catch {
        setTokens(null);
        setStatus('guest');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/v1/admin/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message?.toString() ?? 'Login failed');
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      const me = await api.get<AdminProfile>('/v1/admin/auth/me');
      if (!ADMIN_ROLES.includes(me.role)) {
        setTokens(null);
        throw new Error('This account is not an admin account');
      }
      setAdmin(me);
      setStatus('authed');
    },
    [api, setTokens],
  );

  const logout = useCallback(async () => {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/v1/admin/auth/logout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          },
        );
      } catch {
        /* ignore */
      }
    }
    setTokens(null);
    setAdmin(null);
    setStatus('guest');
  }, [getTokens, setTokens]);

  return (
    <Ctx.Provider value={{ status, admin, login, logout, api }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
