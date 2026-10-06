import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { API_BASE_URL } from '../api/config';
import { Api } from '../api/endpoints';
import { ApiClient } from '../api/http';
import { AuthTokens } from '../api/types';
import { clearTokens, loadTokens, saveTokens } from './tokenStore';

interface AuthContextValue {
  api: Api;
  ready: boolean;
  isAuthenticated: boolean;
  /**
   * The current access token, read at call time.
   *
   * A getter rather than a value on purpose: the socket re-reads it on every
   * (re)connect so a token refreshed since sign-in is the one presented, and a
   * revoked one is refused instead of replayed. Exposing the token as state
   * would re-render every consumer on each refresh for no benefit.
   */
  getAccessToken: () => string | null;
  /** Log in with staff email + password (drivers are staff with the DRIVER role). */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Owns the driver's session and the single Api instance. Mirrors the customer app. */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const tokensRef = useRef<AuthTokens | null>(null);

  const setTokens = async (tokens: AuthTokens | null): Promise<void> => {
    tokensRef.current = tokens;
    setIsAuthenticated(!!tokens);
    if (tokens) {
      await saveTokens(tokens);
    } else {
      await clearTokens();
    }
  };

  const api = useMemo(() => {
    const client = new ApiClient(API_BASE_URL, {
      getAccessToken: () => tokensRef.current?.accessToken ?? null,
      onUnauthorized: async () => {
        const refreshToken = tokensRef.current?.refreshToken;
        if (!refreshToken) {
          return false;
        }
        try {
          const next = await new Api(
            new ApiClient(API_BASE_URL, { getAccessToken: () => null, onUnauthorized: async () => false }),
          ).refresh(refreshToken);
          await setTokens(next);
          return true;
        } catch {
          await setTokens(null);
          return false;
        }
      },
    });
    return new Api(client);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadTokens().then((stored) => {
      if (!mounted) {
        return;
      }
      tokensRef.current = stored;
      setIsAuthenticated(!!stored);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      api,
      ready,
      isAuthenticated,
      getAccessToken: () => tokensRef.current?.accessToken ?? null,
      signInWithPassword: async (email, password) => {
        const tokens = await api.login(email, password);
        await setTokens(tokens);
      },
      /**
       * Ends the session on the server, then locally.
       *
       * Dropping the token locally is not signing out: the refresh token stays
       * valid for its full lifetime, so a lost or handed-on device keeps a
       * working session. The local clear happens regardless of the result —
       * signing out must never fail because the network did, and a driver
       * without signal still has to be able to hand the phone over.
       */
      signOut: async () => {
        const refreshToken = tokensRef.current?.refreshToken;
        if (refreshToken) {
          try {
            await api.logout(refreshToken);
          } catch {
            // Already expired, revoked, or offline. Nothing more to do.
          }
        }
        await setTokens(null);
      },
    }),
    [api, ready, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
