/**
 * Dynamic Expo config.
 *
 * `app.json` holds the static, committable configuration. Anything that is a
 * **credential** is injected here from the environment at build time and is
 * never written to a committed file — a Google Maps key was previously
 * hard-coded in `app.json`, which put a live credential in git history.
 *
 * Supply the values through EAS secrets (`eas secret:create`) or the shell:
 *
 *   GOOGLE_MAPS_API_KEY=... API_BASE_URL=... npx expo start
 *
 * A missing key is deliberately *not* fatal: the app degrades to the
 * "map unavailable" card rather than failing to build, so a developer without
 * the credential can still run everything else. See `docs/` and
 * `../backend/DEMO_DECISIONS.md`.
 */
module.exports = ({ config }) => {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  const apiBaseUrl = process.env.API_BASE_URL ?? config.extra?.apiBaseUrl ?? '';

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: mapsApiKey },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(mapsApiKey ? { googleMapsApiKey: mapsApiKey } : {}),
      },
    },
    extra: {
      ...config.extra,
      apiBaseUrl,
      googleMapsApiKey: mapsApiKey,
    },
  };
};
