/**
 * Driver delivery flow — pure, no React Native.
 *
 * Given a delivery status, decides the driver's next action and how the status
 * reads. Mirrors the backend delivery state machine (a delivery can only fail
 * after pickup; before pickup it is cancelled at the order level). Pure, so the
 * whole action table is unit-tested.
 */

import { DELIVERY_STATUS, DeliveryStatus } from '../types/backend';

export type FlowTone = 'progress' | 'success' | 'danger' | 'neutral';

export interface DeliveryAction {
  /** The transition endpoint suffix to call. */
  key: 'picked-up' | 'out-for-delivery' | 'delivered';
  label: string;
}

export interface DeliveryFlow {
  label: string;
  tone: FlowTone;
  /** The driver's primary next step, if any. */
  action: DeliveryAction | null;
  /** True once the delivery may be reported failed (after pickup). */
  canFail: boolean;
  /** True when the delivery is finished for the driver. */
  terminal: boolean;
}

const LABELS: Record<DeliveryStatus, string> = {
  PENDING_ASSIGNMENT: 'Awaiting assignment',
  ASSIGNED: 'Assigned to you',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export function deliveryFlow(status: DeliveryStatus): DeliveryFlow {
  switch (status) {
    case DELIVERY_STATUS.ASSIGNED:
      return { label: LABELS.ASSIGNED, tone: 'progress', action: { key: 'picked-up', label: 'Mark picked up' }, canFail: false, terminal: false };
    case DELIVERY_STATUS.PICKED_UP:
      return { label: LABELS.PICKED_UP, tone: 'progress', action: { key: 'out-for-delivery', label: 'Start delivery' }, canFail: true, terminal: false };
    case DELIVERY_STATUS.OUT_FOR_DELIVERY:
      return { label: LABELS.OUT_FOR_DELIVERY, tone: 'progress', action: { key: 'delivered', label: 'Mark delivered' }, canFail: true, terminal: false };
    case DELIVERY_STATUS.DELIVERED:
      return { label: LABELS.DELIVERED, tone: 'success', action: null, canFail: false, terminal: true };
    case DELIVERY_STATUS.FAILED:
      return { label: LABELS.FAILED, tone: 'danger', action: null, canFail: false, terminal: true };
    case DELIVERY_STATUS.CANCELLED:
      return { label: LABELS.CANCELLED, tone: 'danger', action: null, canFail: false, terminal: true };
    case DELIVERY_STATUS.PENDING_ASSIGNMENT:
    default:
      return { label: LABELS.PENDING_ASSIGNMENT, tone: 'neutral', action: null, canFail: false, terminal: false };
  }
}

/** Statuses that count as an active job a driver currently holds. */
export function isActiveDelivery(status: DeliveryStatus): boolean {
  return (
    status === DELIVERY_STATUS.ASSIGNED ||
    status === DELIVERY_STATUS.PICKED_UP ||
    status === DELIVERY_STATUS.OUT_FOR_DELIVERY
  );
}
