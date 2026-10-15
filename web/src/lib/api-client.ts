import { API_URL } from './config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface ApiClientOptions {
  getTokens: () => TokenPair | null;
  setTokens: (tokens: TokenPair | null) => void;
  /** e.g. '/v1/admin/auth/refresh' */
  refreshPath: string;
  onAuthFailure?: () => void;
}

export interface ApiError extends Error {
  status?: number;
  body?: unknown;
}

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Small fetch wrapper for the Nest API: JSON handling, Bearer auth header,
 * single-flight token refresh on 401, normalized error shape.
 */
export function createApiClient({
  getTokens,
  setTokens,
  refreshPath,
  onAuthFailure,
}: ApiClientOptions) {
  let refreshing: Promise<TokenPair | null> | null = null;

  async function refreshOnce(): Promise<TokenPair | null> {
    if (!refreshing) {
      refreshing = (async () => {
        const tokens = getTokens();
        if (!tokens?.refreshToken) return null;
        try {
          const res = await fetch(`${API_URL}${refreshPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          });
          if (!res.ok) return null;
          const data = await parseBody(res);
          const next: TokenPair = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
          setTokens(next);
          return next;
        } catch {
          return null;
        } finally {
          setTimeout(() => (refreshing = null), 0);
        }
      })();
    }
    return refreshing;
  }

  async function request<T = unknown>(
    path: string,
    init: RequestInit & { json?: unknown } = {},
    retry = true,
  ): Promise<T> {
    const tokens = getTokens();
    const headers = new Headers(init.headers);
    if (tokens?.accessToken) {
      headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
    let body = init.body;
    if (init.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(init.json);
    }

    const res = await fetch(`${API_URL}${path}`, { ...init, headers, body });

    if (res.status === 401 && retry) {
      const next = await refreshOnce();
      if (next) return request<T>(path, init, false);
      setTokens(null);
      onAuthFailure?.();
      const err: ApiError = new Error('Session expired — please log in again');
      err.status = 401;
      throw err;
    }

    const data = await parseBody(res);
    if (!res.ok) {
      const err: ApiError = new Error(
        (data as { message?: string })?.message?.toString() ??
          `Request failed (${res.status})`,
      );
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data as T;
  }

  return {
    get: <T = unknown>(path: string, headers?: Record<string, string>) =>
      request<T>(path, { headers }),
    post: <T = unknown>(path: string, json?: unknown, headers?: Record<string, string>) =>
      request<T>(path, { method: 'POST', json, headers }),
    put: <T = unknown>(path: string, json?: unknown, headers?: Record<string, string>) =>
      request<T>(path, { method: 'PUT', json, headers }),
    del: <T = unknown>(path: string, headers?: Record<string, string>) =>
      request<T>(path, { method: 'DELETE', headers }),
    patch: <T = unknown>(path: string, json?: unknown, headers?: Record<string, string>) =>
      request<T>(path, { method: 'PATCH', json, headers }),
  };
}
