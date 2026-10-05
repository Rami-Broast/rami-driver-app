/**
 * A driver's run: the several jobs they are carrying, in the order to work
 * them.
 *
 * Until now a driver could hold exactly one delivery, so "the job" and "the
 * list" were the same thing and the Home screen could get away with a flat list
 * of cards. The backend now lets a counter stack a second (or third) drop onto
 * a driver already out — which is how a small fleet actually works, and the
 * reason this file exists: three cards in arrival order is not a run, and a
 * driver holding a bag of food should not have to work out the sequence
 * themselves at a kerb.
 *
 * Pure. The ordering and the wording are the substance, and both are the kind
 * of thing that is wrong only in the specific case nobody thought to open the
 * app for.
 */

import { DELIVERY_STATUS, DeliveryStatus } from '../types/backend';

export interface RunJob {
  id: string;
  status: DeliveryStatus;
  assignedAt: string | null;
  pickedUpAt: string | null;
}

/** What the driver has to do next for this job, in one word. */
export type RunLeg = 'collect' | 'deliver';

export function legOf(status: DeliveryStatus): RunLeg | null {
  if (status === DELIVERY_STATUS.ASSIGNED) {
    return 'collect';
  }
  if (status === DELIVERY_STATUS.PICKED_UP || status === DELIVERY_STATUS.OUT_FOR_DELIVERY) {
    return 'deliver';
  }
  return null;
}

/**
 * The run, in the order to work it.
 *
 * **Everything still at the branch comes first**, then everything already in
 * the bag. That is not arbitrary: food waiting on a pass is going cold and the
 * branch cannot clear its counter, whereas an order already collected is
 * travelling with the driver either way. Within each group, oldest first — the
 * customer who has been waiting longest.
 *
 * It is a suggestion and the app must never enforce it. A driver can see the
 * road; a sort function cannot, and a list that refuses to let someone deliver
 * the flat they are standing outside is worse than no ordering at all.
 */
export function runOrder<T extends RunJob>(jobs: readonly T[]): T[] {
  const rank = (job: T): number => (legOf(job.status) === 'collect' ? 0 : 1);
  return [...jobs].sort((a, b) => {
    const byLeg = rank(a) - rank(b);
    if (byLeg !== 0) {
      return byLeg;
    }
    // Oldest first, and a job with no timestamp sorts last rather than first —
    // a missing date must not jump the queue ahead of a real one.
    return stamp(a) - stamp(b);
  });
}

function stamp(job: RunJob): number {
  const iso = job.pickedUpAt ?? job.assignedAt;
  if (!iso) {
    return Number.MAX_SAFE_INTEGER;
  }
  const at = Date.parse(iso);
  return Number.isFinite(at) ? at : Number.MAX_SAFE_INTEGER;
}

export interface RunSummary {
  /** Jobs still to collect from a branch. */
  toCollect: number;
  /** Jobs already collected and still to drop off. */
  toDeliver: number;
  total: number;
  /** One line for the top of the screen, or null when there is no run. */
  label: string | null;
}

/**
 * What the driver is holding, said in one line.
 *
 * "2 to collect · 1 to deliver" is the sentence a courier wants before they set
 * off. A bare count ("3 jobs") is the one that makes them open all three.
 */
export function runSummary(jobs: readonly RunJob[]): RunSummary {
  let toCollect = 0;
  let toDeliver = 0;
  for (const job of jobs) {
    const leg = legOf(job.status);
    if (leg === 'collect') {
      toCollect += 1;
    } else if (leg === 'deliver') {
      toDeliver += 1;
    }
  }

  const total = toCollect + toDeliver;
  if (total === 0) {
    return { toCollect, toDeliver, total, label: null };
  }

  const parts: string[] = [];
  if (toCollect > 0) {
    parts.push(`${toCollect} to collect`);
  }
  if (toDeliver > 0) {
    parts.push(`${toDeliver} to deliver`);
  }

  return { toCollect, toDeliver, total, label: parts.join(' · ') };
}
