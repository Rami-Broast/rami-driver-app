/**
 * Where "Navigate" sends the driver.
 *
 * ## Google Maps, deliberately
 *
 * The owner asked for Google Maps specifically, and there is a practical
 * reason beyond preference: the customer dropped their pin in a Google map
 * inside the customer app, so the coordinates were chosen against Google's
 * view of the world. Opening the same coordinates in a different provider can
 * put the driver on the wrong side of a compound wall in exactly the places
 * where an address is hardest to find.
 *
 * On Android, `google.navigation:` starts turn-by-turn in the Google Maps app
 * immediately — the driver is holding a bag of food and should not have to
 * press "Start".
 *
 * On iOS, `comgoogleapps://` only works if Google Maps is installed and would
 * fail silently otherwise, so the universal `https://www.google.com/maps` URL
 * is used: iOS hands it to the Google Maps app when it is installed and to the
 * browser when it is not. Either way the driver lands on the right pin, which
 * matters more than saving one tap.
 *
 * Pure and separate from the screen so the URLs are testable — a navigation
 * link that silently opens the wrong place is not something a render test
 * would ever catch. It takes the platform rather than importing `Platform`,
 * which is also what keeps it out of the React Native module graph and inside
 * the fast logic suite.
 */
export function navigationUrl(latitude: number, longitude: number, platform: string): string {
  // Fixed to 6 decimals: about 10 cm, far past what a phone GPS resolves, and
  // it keeps a float's tail out of the URL.
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);

  if (platform === 'android') {
    return `google.navigation:q=${lat},${lng}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

/** True when a snapshot carries a usable pin. */
export function hasPin(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    // 0,0 is the Atlantic. It is what a dropped default looks like, never a
    // Saudi delivery address, and sending a driver there is worse than telling
    // them there is no pin.
    !(latitude === 0 && longitude === 0)
  );
}
