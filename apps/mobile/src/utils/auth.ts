import * as SecureStore from 'expo-secure-store';
import type { UserInfoFragment } from '../generated/graphql';

const TOKEN_KEY = 'c404_auth_token';
const REFRESH_TOKEN_KEY = 'c404_auth_refresh_token';
const USER_KEY = 'c404_auth_user';

// In-memory cache avoids an IPC round-trip to Keychain on every Apollo request.
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let hydrated = false;

async function hydrate() {
  if (hydrated) return;
  try {
    cachedAccessToken = await SecureStore.getItemAsync(TOKEN_KEY);
    cachedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.error('Error hydrating tokens', e);
  } finally {
    hydrated = true;
  }
}

export async function setAuthTokens(token: string, refreshToken?: string | null) {
  cachedAccessToken = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (refreshToken) {
      cachedRefreshToken = refreshToken;
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else if (refreshToken === null) {
      cachedRefreshToken = null;
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (e) {
    console.error('Error saving tokens', e);
  }
  hydrated = true;
}

// Backwards-compatible helper used before refresh-token plumbing existed.
export async function setAuthToken(token: string) {
  return setAuthTokens(token);
}

export async function getAuthToken(): Promise<string | null> {
  if (hydrated) return cachedAccessToken;
  await hydrate();
  return cachedAccessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  if (hydrated) return cachedRefreshToken;
  await hydrate();
  return cachedRefreshToken;
}

export async function clearAuth() {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  hydrated = true;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (e) {
    console.error('Error clearing auth', e);
  }
}

export function getAPIBaseUrl(graphqlUrl: string) {
  return graphqlUrl.endsWith('/graphql') ? graphqlUrl.slice(0, -'/graphql'.length) : graphqlUrl;
}

export type StoredUser = Pick<
  UserInfoFragment,
  'id' | 'username' | 'email' | 'role' | 'avatar' | 'bio'
>;

export async function setUserData(userData: StoredUser) {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
  } catch (e) {
    console.error('Error saving user data', e);
  }
}

export async function getUserData(): Promise<StoredUser | null> {
  try {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? (JSON.parse(data) as StoredUser) : null;
  } catch (e) {
    console.error('Error reading user data', e);
    return null;
  }
}
