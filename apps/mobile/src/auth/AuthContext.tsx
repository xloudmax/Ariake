import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { router } from 'expo-router';
import { client } from '../apollo/client';
import { LogoutDocument } from '../generated/graphql';
import {
  clearAuth,
  getAuthToken,
  getRefreshToken,
  getUserData,
  setAuthTokens,
  setUserData,
  type StoredUser,
} from '../utils/auth';
import { registerAuthInvalidated } from './authBridge';
import { reportError } from '../utils/mobileErrorReporter';

type AuthContextValue = {
  /** True once storage hydration finished (session restore complete). */
  ready: boolean;
  isAuthenticated: boolean;
  user: StoredUser | null;
  signIn: (args: {
    token: string;
    refreshToken?: string | null;
    user: StoredUser;
  }) => Promise<void>;
  signOut: (options?: { revoke?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  // Hydrate from SecureStore on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [token, cachedUser] = await Promise.all([
        getAuthToken(),
        getUserData(),
      ]);
      if (cancelled) return;
      if (token && cachedUser) setUser(cachedUser);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ token, refreshToken, user: nextUser }) => {
      await setAuthTokens(token, refreshToken);
      await setUserData(nextUser);
      setUser(nextUser);
      try {
        await client.resetStore();
      } catch {
        // resetStore throws when there are still in-flight queries; ignore.
      }
    },
    []
  );

  const signOut = useCallback(async (options: { revoke?: boolean } = {}) => {
    const refreshToken = options.revoke === false ? null : await getRefreshToken();
    if (refreshToken) {
      try {
        await client.mutate({
          mutation: LogoutDocument,
          variables: { refreshToken },
          fetchPolicy: 'no-cache',
        });
      } catch (error) {
        reportError(error, { tag: "auth.logout.remote", severity: "warn" });
      }
    }
    await clearAuth();
    setUser(null);
    try {
      await client.resetStore();
    } catch {
      // see signIn
    }
  }, []);

  // React to refresh-token expiry signalled from the Apollo errorLink.
  useEffect(() => {
    return registerAuthInvalidated(async () => {
      setUser(null);
      try {
        await client.resetStore();
      } catch {}
      router.replace('/(tabs)/profile');
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated: !!user,
      user,
      signIn,
      signOut,
    }),
    [ready, user, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
