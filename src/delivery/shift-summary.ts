/**
 * What this driver has done today, and how much of the restaurant's cash they
 * are carrying.
 *
 * Deliberately **not** earnings. The platform has no driver-pay model — there
 * is no per-delivery rate or commission anywhere in the backend — so a figure
 * called "earned" would be invented, and a driver who plans around an invented
 * number finds out at the end of the month. What the app can say truthfully is
 * how many drops are done and how much cash is in the driver's pocket that
 * belongs to the branch, which is the number that actually matters at the end
 * of a shift because somebody has to hand it over.
 *
 * Pure, so "today" and the arithmetic are testable without a clock or a phone.
 */

import { DELIVERY_STATUS, DeliveryStatus } from '../types/backend';

export interface ShiftJob {
  status: DeliveryStatus;
  deliveredAt: string | null;
  failedAt: string | null;
  cashCollection: { collectedMinor: number } | null;
}

export interface ShiftSummary {
  /** Drops signed for today. */
  delivered: number;
  /** Attempts that could not be completed today. */
  failed: number;
  /** Cash taken today, in minor units — the restaurant's money, not the driver's. */
  cashCollectedMinor: number;
}

/**
 * `now` is passed in rather than read, because "today" is a local-day boundary
 * and a function that reads the clock cannot be tested at 23:55 — which is
 * exactly when a day-boundary bug shows up and nobody is looking.
 */
export function shiftSummary(jobs: readonly ShiftJob[], now: Date = new Date()): ShiftSummary {
  let delivered = 0;
  let failed = 0;
  let cashCollectedMinor = 0;

  for (const job of jobs) {
    if (job.status === DELIVERY_STATUS.DELIVERED && isSameLocalDay(job.deliveredAt, now)) {
      delivered += 1;
      cashCollectedMinor += job.cashCollection?.collectedMinor ?? 0;
    } else if (job.status === DELIVERY_STATUS.FAILED && isSameLocalDay(job.failedAt, now)) {
      failed += 1;
      // Cash on a failed drop is still cash the driver is holding.
      cashCollectedMinor += job.cashCollection?.collectedMinor ?? 0;
    }
  }

  return { delivered, failed, cashCollectedMinor };
}

/** Same calendar day in the device's own timezone — a shift is lived locally, not in UTC. */
function isSameLocalDay(iso: string | null, now: Date): boolean {
  if (!iso) {
    return false;
  }
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) {
    return false;
  }
  return (
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()
  );
}
