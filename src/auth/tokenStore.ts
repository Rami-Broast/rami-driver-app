import * as SecureStore from 'expo-secure-store';

import { AuthTokens } from '../api/types';

/**
 * Persists auth tokens in the device secure store (Keychain / Keystore).
 *
 * Tokens are the only sensitive thing the app stores, and they live in the OS
 * secure store, never in plain async storage. Every call is defensive: a
 * storage failure degrades to "logged out" rather than crashing.
 */
const ACCESS_KEY = 'rami.accessToken';
const REFRESH_KEY = 'rami.refreshToken';

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  } catch {
    // Non-fatal: the session simply won't survive a restart.
  }
}

export async function loadTokens(): Promise<AuthTokens | null> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
  } catch {
    // Ignore — treat as no stored session.
  }
  return null;
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    // Ignore.
  }
}
