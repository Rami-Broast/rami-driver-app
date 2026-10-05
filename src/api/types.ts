import { DeliveryStatus, ProofType } from '../types/backend';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: string;
  vehiclePlate: string | null;
  isOnline: boolean;
  isAvailable: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  user: { fullName: string; email: string; phone: string | null };
}

export interface AddressSnapshot {
  label?: string | null;
  line1?: string;
  line2?: string | null;
  district?: string | null;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

/** A driver's own record of the cash taken for a COD order (server-computed variance). */
export interface CashCollection {
  id: string;
  expectedMinor: number;
  collectedMinor: number;
  /** collected − expected. Positive = extra held, negative = shortfall. */
  varianceMinor: number;
  note: string | null;
  createdAt: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  branchId: string;
  status: DeliveryStatus;
  addressSnapshot: AddressSnapshot | null;
  recipientName: string | null;
  proofType: ProofType;
  proofUrl: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  order: {
    /** The branch's running order number — unique only within that branch. */
    orderNumber: string;
    /** Globally unique 12-digit reference, the handle for this exact order. */
    referenceId?: string;
    status: string;
    totalMinor: number;
    currency: string;
  };
  /**
   * The customer's name and real, unmasked phone number.
   *
   * **Both are null until the driver has picked the order up**, and the backend
   * strips them from the payload rather than relying on this app to hide them —
   * so a null here means the server withheld it, not that the screen chose not
   * to show it. Owner decision; see the backend's
   * `src/delivery/customer-contact.ts` for the gate and why it opens at pickup.
   *
   * Optional because a backend older than this change sends neither.
   */
  customerName?: string | null;
  customerPhone?: string | null;
  /** True when this order is paid in cash on delivery — the driver must collect. */
  isCashOnDelivery: boolean;
  /** Cash the driver should collect, in minor units. Null for non-COD orders. */
  amountDueMinor: number | null;
  /** The cash record once the driver has reported it; null until then. */
  cashCollection: CashCollection | null;
}


/**
 * A branch, from the public `/customer/branches` list.
 *
 * The driver app reads exactly one thing from it — the phone number — so
 * everything else is optional and nothing here is required to render. A branch
 * that has not published a number simply has no Call button; a placeholder that
 * dials nowhere would be worse.
 */
export interface Branch {
  id: string;
  name: string;
  nameAr?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  district?: string | null;
  city?: string | null;
}
