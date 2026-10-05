import { hasPin, navigationUrl } from '../../src/util/navigationUrl';

describe('navigationUrl', () => {
  const lat = 24.7118;
  const lng = 46.6745;

  it('starts turn-by-turn directly on Android', () => {
    // The driver is standing with a bag of food; they should not have to press
    // "Start" as well as "Navigate".
    expect(navigationUrl(lat, lng, 'android')).toBe('google.navigation:q=24.711800,46.674500');
  });

  it('uses the universal Google Maps URL on iOS', () => {
    // comgoogleapps:// would fail silently when Google Maps is not installed.
    // The https URL opens the app when it is there and the browser when it is
    // not — either way the driver lands on the right pin.
    expect(navigationUrl(lat, lng, 'ios')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=24.711800,46.674500&travelmode=driving',
    );
  });

  it('sends everything else to Google Maps too', () => {
    expect(navigationUrl(lat, lng, 'web')).toContain('google.com/maps');
  });

  it('never sends a driver to a provider the pin was not chosen in', () => {
    // The customer dropped this pin in a Google map. Apple Maps can place the
    // same coordinates on the wrong side of a compound wall, in exactly the
    // places an address is hardest to find.
    for (const platform of ['ios', 'android', 'web', 'macos']) {
      expect(navigationUrl(lat, lng, platform)).toMatch(/google/);
    }
  });

  it('keeps a float tail out of the URL', () => {
    expect(navigationUrl(24.711800000000004, 46.6745, 'ios')).toContain('24.711800,46.674500');
  });
});

describe('hasPin', () => {
  it('accepts a real pin', () => {
    expect(hasPin(24.7118, 46.6745)).toBe(true);
  });

  it('rejects a missing one', () => {
    expect(hasPin(null, 46.6745)).toBe(false);
    expect(hasPin(24.7118, undefined)).toBe(false);
    expect(hasPin(null, null)).toBe(false);
  });

  it('rejects 0,0', () => {
    // The Atlantic. It is what a dropped default looks like, never a Saudi
    // delivery address, and sending a driver there is worse than telling them
    // there is no pin at all.
    expect(hasPin(0, 0)).toBe(false);
  });

  it('rejects coordinates that are not coordinates', () => {
    expect(hasPin(91, 46)).toBe(false);
    expect(hasPin(24, 181)).toBe(false);
    expect(hasPin(NaN, 46)).toBe(false);
  });
});
