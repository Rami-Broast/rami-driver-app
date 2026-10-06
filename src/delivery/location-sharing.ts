import { DELIVERY_STATUS, DeliveryStatus } from '../types/backend';

/**
 * When the driver's location is shared, and how often.
 *
 * Pure, because this is a policy about a person's whereabouts and it should be
 * checkable without mounting a screen or holding a phone.
 *
 * ## Only while carrying food
 *
 * Sharing starts at **PICKED_UP** and stops the moment the delivery is
 * delivered, failed or cancelled (spec §24: an idle online driver does not
 * stream location). Before pickup there is nothing for a customer to watch —
 * the driver is still at the branch — and after drop-off the reason to know
 * where they are has gone. This is the whole of the privacy story, so it is one
 * function rather than a condition repeated on a screen.
 *
 * ## Why 30 seconds
 *
 * A ping costs us a small write on our own server — pennies at any volume this
 * platform will see — so the interval is a **battery and legibility** decision,
 * not a cost one. Google bills for maps and for route drawing, neither of which
 * a ping touches.
 *
 * At two-minute intervals a marker sits still long enough that customers
 * conclude the tracking is broken and ring the branch, which costs a phone call
 * to save nothing. Thirty seconds reads as live and is far below the rate at
 * which GPS itself drains a phone. Balanced accuracy, not `BestForNavigation`:
 * a customer is being shown which street the driver is on, not being navigated.
 */
export const PING_INTERVAL_MS = 30_000;

/** True when this delivery's status means the customer should see the driver move. */
export function sharesLocation(status: DeliveryStatus | null | undefined): boolean {
  return status === DELIVERY_STATUS.PICKED_UP || status === DELIVERY_STATUS.OUT_FOR_DELIVERY;
}
