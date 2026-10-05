/**
 * Backend enums, mirrored. String values MUST match the backend Prisma schema.
 */

export const DELIVERY_STATUS = {
  PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export const PROOF_TYPE = {
  NONE: 'NONE',
  SIGNATURE: 'SIGNATURE',
  PHOTO: 'PHOTO',
  OTP: 'OTP',
} as const;

export type ProofType = (typeof PROOF_TYPE)[keyof typeof PROOF_TYPE];
