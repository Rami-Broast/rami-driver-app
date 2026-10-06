import { legOf, runOrder, runSummary } from '../../src/delivery/run';
import { DELIVERY_STATUS } from '../../src/types/backend';

const job = (
  id: string,
  status: keyof typeof DELIVERY_STATUS,
  times: { assignedAt?: string | null; pickedUpAt?: string | null } = {},
) => ({
  id,
  status: DELIVERY_STATUS[status],
  assignedAt: times.assignedAt ?? null,
  pickedUpAt: times.pickedUpAt ?? null,
});

describe('legOf', () => {
  it('names what the driver has to do next', () => {
    expect(legOf(DELIVERY_STATUS.ASSIGNED)).toBe('collect');
    expect(legOf(DELIVERY_STATUS.PICKED_UP)).toBe('deliver');
    expect(legOf(DELIVERY_STATUS.OUT_FOR_DELIVERY)).toBe('deliver');
  });

  it('has no leg for a finished or unassigned job', () => {
    expect(legOf(DELIVERY_STATUS.DELIVERED)).toBeNull();
    expect(legOf(DELIVERY_STATUS.FAILED)).toBeNull();
    expect(legOf(DELIVERY_STATUS.PENDING_ASSIGNMENT)).toBeNull();
  });
});

describe('runOrder', () => {
  it('puts everything still at a branch before everything already in the bag', () => {
    // Food on a pass is going cold and the branch cannot clear its counter; an
    // order already collected is travelling with the driver either way.
    const order = runOrder([
      job('carrying', 'PICKED_UP', { pickedUpAt: '2026-09-07T10:00:00Z' }),
      job('waiting', 'ASSIGNED', { assignedAt: '2026-09-07T10:30:00Z' }),
    ]);
    expect(order.map((j) => j.id)).toEqual(['waiting', 'carrying']);
  });

  it('takes the oldest first within a leg — the customer who has waited longest', () => {
    const order = runOrder([
      job('newer', 'ASSIGNED', { assignedAt: '2026-09-07T10:30:00Z' }),
      job('older', 'ASSIGNED', { assignedAt: '2026-09-07T09:00:00Z' }),
    ]);
    expect(order.map((j) => j.id)).toEqual(['older', 'newer']);
  });

  it('sorts a job with no timestamp last, never first', () => {
    // A missing date must not jump the queue ahead of a real one.
    const order = runOrder([
      job('undated', 'ASSIGNED'),
      job('dated', 'ASSIGNED', { assignedAt: '2026-09-07T10:00:00Z' }),
    ]);
    expect(order.map((j) => j.id)).toEqual(['dated', 'undated']);
  });

  it('does not mutate what it was given', () => {
    const jobs = [job('b', 'PICKED_UP'), job('a', 'ASSIGNED')];
    runOrder(jobs);
    expect(jobs.map((j) => j.id)).toEqual(['b', 'a']);
  });
});

describe('runSummary', () => {
  it('says what is in each leg, not just a count', () => {
    // "3 jobs" is the line that makes a driver open all three.
    const summary = runSummary([
      job('a', 'ASSIGNED'),
      job('b', 'ASSIGNED'),
      job('c', 'OUT_FOR_DELIVERY'),
    ]);
    expect(summary).toMatchObject({ toCollect: 2, toDeliver: 1, total: 3 });
    expect(summary.label).toBe('2 to collect · 1 to deliver');
  });

  it('drops the half that is empty rather than saying "0 to collect"', () => {
    expect(runSummary([job('a', 'PICKED_UP')]).label).toBe('1 to deliver');
    expect(runSummary([job('a', 'ASSIGNED')]).label).toBe('1 to collect');
  });

  it('has no label at all when there is no run', () => {
    expect(runSummary([]).label).toBeNull();
    expect(runSummary([job('done', 'DELIVERED')]).label).toBeNull();
  });
});
