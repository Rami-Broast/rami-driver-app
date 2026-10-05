import Constants from 'expo-constants';

/**
 * Resolves the API base URL. Pure so it can be tested; the runtime value comes
 * from `app.json → expo.extra.apiBaseUrl` per environment. No secret is ever
 * read here — only a URL.
 */
export function resolveBaseUrl(extra: unknown): string {
  const fallback = 'https://rami-api.example.com/api/v1';
  if (extra && typeof extra === 'object') {
    const url = (extra as Record<string, unknown>).apiBaseUrl;
    if (typeof url === 'string' && url.length > 0) {
      return url;
    }
  }
  return fallback;
}

export const API_BASE_URL = resolveBaseUrl(Constants.expoConfig?.extra);
