import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  createHttpLink,
  fromPromise,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { resolveMobileAPIUrl } from './apiUrl';
import {
  clearAuth,
  getAuthToken,
  getRefreshToken,
  setAuthTokens,
} from '../utils/auth';
import { notifyAuthInvalidated } from '../auth/authBridge';
import { isOnline } from '../utils/network';
import { showToastExternal } from '../components/Toast/ToastProvider';
import { i18n } from '../i18n';

const APOLLO_CACHE_MAX_SIZE_BYTES = 16 * 1024 * 1024;
const APOLLO_CACHE_RESTORE_TIMEOUT_MS = 3000;

const getAPIUrl = () => resolveMobileAPIUrl({
  configuredURL: process.env.EXPO_PUBLIC_API_URL,
  isDev: __DEV__,
  platformOS: Platform.OS,
  hostUri: Constants.expoConfig?.hostUri,
});

export const API_URL = getAPIUrl();

const httpLink = createHttpLink({ uri: API_URL });

const NETWORK_ALERT_DEBOUNCE_MS = 5000;
let lastNetworkAlertAt = 0;

function shouldShowNetworkAlert() {
  const now = Date.now();
  if (now - lastNetworkAlertAt < NETWORK_ALERT_DEBOUNCE_MS) {
    return false;
  }
  lastNetworkAlertAt = now;
  return true;
}

const authLink = setContext(async (_, { headers }) => {
  const token = await getAuthToken();
  const nextHeaders: Record<string, string> = { ...(headers || {}) };
  if (token) {
    nextHeaders.authorization = `Bearer ${token}`;
  } else {
    delete nextHeaders.authorization;
  }
  return { headers: nextHeaders };
});

// Guard against a refresh stampede when multiple queries 401 simultaneously.
let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'RefreshToken',
        query: `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            token
            refreshToken
          }
        }`,
        variables: { refreshToken },
      }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const payload = body?.data?.refreshToken;
    if (!payload?.token) return null;
    await setAuthTokens(payload.token, payload.refreshToken ?? refreshToken);
    return payload.token as string;
  } catch (e) {
    console.warn('Refresh token exchange failed', e);
    return null;
  }
}

function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { statusCode?: number; message?: string };
  if (err.statusCode === 401 || err.statusCode === 403) return true;
  if (typeof err.message === 'string' &&
      /unauthorized|unauthenticated|token/i.test(err.message)) {
    return true;
  }
  return false;
}

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  // Show a passive toast (no modal blocking) when a network error happens
  // while we're allegedly online. Skipped offline because the OfflineBanner
  // already covers that and Apollo will return cached data anyway.
  if (networkError && !isAuthError(networkError) && isOnline() && shouldShowNetworkAlert()) {
    showToastExternal({
      variant: "error",
      message: i18n.t("common.networkError"),
    });
  }

  const needsRefresh =
    (graphQLErrors && graphQLErrors.some(e => {
      const code = (e.extensions?.code as string | undefined)?.toUpperCase();
      return code === 'UNAUTHENTICATED' || code === 'UNAUTHORIZED';
    })) || isAuthError(networkError);

  if (!needsRefresh) return;

  if (!refreshingPromise) {
    refreshingPromise = refreshAccessToken().finally(() => {
      refreshingPromise = null;
    });
  }

  return fromPromise(refreshingPromise).flatMap(newToken => {
    if (!newToken) {
      // Refresh failed — wipe storage and let the React layer navigate.
      clearAuth().catch(() => {});
      notifyAuthInvalidated();
      return new Observable<never>(observer => observer.complete());
    }
    const oldHeaders = operation.getContext().headers || {};
    operation.setContext({
      headers: { ...oldHeaders, authorization: `Bearer ${newToken}` },
    });
    return forward(operation);
  });
});

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        comments: {
          merge(_existing, incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache,
});

export const setupApolloCache = async () => {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, APOLLO_CACHE_RESTORE_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      persistCache({
        cache,
        storage: new AsyncStorageWrapper(AsyncStorage),
        maxSize: APOLLO_CACHE_MAX_SIZE_BYTES,
      }),
      timeout,
    ]);
  } catch (error) {
    console.error('Error restoring Apollo cache', error);
  }
  return client;
};
