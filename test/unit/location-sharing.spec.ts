import { PING_INTERVAL_MS, sharesLocation } from '../../src/delivery/location-sharing';
import { DELIVERY_STATUS, DeliveryStatus } from '../../src/types/backend';

describe('sharesLocation', () => {
  it('shares only while the driver is carrying the order', () => {
    expect(sharesLocation(DELIVERY_STATUS.PICKED_UP)).toBe(true);
    expect(sharesLocation(DELIVERY_STATUS.OUT_FOR_DELIVERY)).toBe(true);
  });

  it('does not share before pickup — there is nothing to watch yet', () => {
    expect(sharesLocation(DELIVERY_STATUS.PENDING_ASSIGNMENT)).toBe(false);
    // Assigned, but still at the branch: a customer watching a stationary dot
    // outside the restaurant learns nothing and the driver is tracked for
    // nothing.
    expect(sharesLocation(DELIVERY_STATUS.ASSIGNED)).toBe(false);
  });

  it('stops the moment the delivery ends, however it ends', () => {
    const finished: DeliveryStatus[] = [
      DELIVERY_STATUS.DELIVERED,
      DELIVERY_STATUS.FAILED,
      DELIVERY_STATUS.CANCELLED,
    ];

    for (const status of finished) {
      expect(sharesLocation(status)).toBe(false);
    }
  });

  it('shares nothing for a status we do not have yet', () => {
    expect(sharesLocation(null)).toBe(false);
    expect(sharesLocation(undefined)).toBe(false);
  });

  it('pings often enough to read as live, and not so often it costs a battery', () => {
    // The interval is a battery/legibility decision, not a cost one: a ping is
    // a write to our own server. Two minutes looks broken to a customer; a few
    // seconds is a GPS fix every few seconds for a whole shift.
    expect(PING_INTERVAL_MS).toBeGreaterThanOrEqual(15_000);
    expect(PING_INTERVAL_MS).toBeLessThanOrEqual(60_000);
  });
});
