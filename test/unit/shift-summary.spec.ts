import { shiftSummary } from '../../src/delivery/shift-summary';
import { DELIVERY_STATUS } from '../../src/types/backend';

const NOW = new Date('2026-09-07T18:00:00');

const job = (
  status: keyof typeof DELIVERY_STATUS,
  fields: { deliveredAt?: string | null; failedAt?: string | null; cash?: number | null } = {},
) => ({
  status: DELIVERY_STATUS[status],
  deliveredAt: fields.deliveredAt ?? null,
  failedAt: fields.failedAt ?? null,
  cashCollection: fields.cash === undefined || fields.cash === null ? null : { collectedMinor: fields.cash },
});

const localIso = (d: Date) => d.toISOString();

describe('shiftSummary', () => {
  it('counts today’s drops and the cash the driver is holding', () => {
    const summary = shiftSummary(
      [
        job('DELIVERED', { deliveredAt: localIso(new Date('2026-09-07T12:00:00')), cash: 8625 }),
        job('DELIVERED', { deliveredAt: localIso(new Date('2026-09-07T14:00:00')) }),
      ],
      NOW,
    );
    expect(summary).toEqual({ delivered: 2, failed: 0, cashCollectedMinor: 8625 });
  });

  it('ignores yesterday', () => {
    const summary = shiftSummary(
      [job('DELIVERED', { deliveredAt: localIso(new Date('2026-09-06T23:00:00')), cash: 5000 })],
      NOW,
    );
    expect(summary).toEqual({ delivered: 0, failed: 0, cashCollectedMinor: 0 });
  });

  it('still counts cash taken on a delivery that then failed', () => {
    // It is money the driver is physically holding either way, and somebody has
    // to be handed it at the end of the shift.
    const summary = shiftSummary(
      [job('FAILED', { failedAt: localIso(new Date('2026-09-07T15:00:00')), cash: 4000 })],
      NOW,
    );
    expect(summary).toEqual({ delivered: 0, failed: 1, cashCollectedMinor: 4000 });
  });

  it('ignores jobs still in progress', () => {
    expect(shiftSummary([job('OUT_FOR_DELIVERY'), job('ASSIGNED')], NOW)).toEqual({
      delivered: 0,
      failed: 0,
      cashCollectedMinor: 0,
    });
  });

  it('survives a timestamp it cannot read', () => {
    // A bad date costs the row, never the screen.
    expect(shiftSummary([job('DELIVERED', { deliveredAt: 'not a date', cash: 100 })], NOW)).toEqual({
      delivered: 0,
      failed: 0,
      cashCollectedMinor: 0,
    });
  });
});
