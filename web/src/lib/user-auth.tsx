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

export interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface RegisterInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

interface UserAuthState {
  status: 'loading' | 'authed' | 'guest';
  user: UserProfile | null;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  api: ReturnType<typeof createApiClient>;
}

const Ctx = createContext<UserAuthState | null>(null);
const ACCESS_KEY = 'userAccessToken';
const REFRESH_KEY = 'userRefreshToken';

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UserAuthState['status']>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);

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
        refreshPath: '/v1/user/auth/refresh',
        onAuthFailure: () => {
          setUser(null);
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
        const me = await api.get<UserProfile>('/v1/user/auth/me');
        setUser(me);
        setStatus('authed');
      } catch {
        setTokens(null);
        setStatus('guest');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (emailOrPhone: string, password: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/v1/user/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrPhone, password }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message?.toString() ?? 'Login failed');
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      const me = await api.get<UserProfile>('/v1/user/auth/me');
      setUser(me);
      setStatus('authed');
    },
    [api, setTokens],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/v1/user/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : data.message?.toString() ?? 'Registration failed',
        );
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      const me = await api.get<UserProfile>('/v1/user/auth/me');
      setUser(me);
      setStatus('authed');
    },
    [api, setTokens],
  );

  const logout = useCallback(async () => {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/v1/user/auth/logout`,
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
    setUser(null);
    setStatus('guest');
  }, [getTokens, setTokens]);

  return (
    <Ctx.Provider value={{ status, user, login, register, logout, api }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUserAuth must be used inside UserAuthProvider');
  return ctx;
}
