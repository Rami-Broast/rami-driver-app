/**
 * Proof-of-delivery upload port.
 *
 * A signature or photo proof must live somewhere the backend can reference by
 * URL — the backend deliberately never handles the upload itself (see the root
 * `CLAUDE.md` and the backend's `src/delivery`). No object-storage provider is
 * provisioned yet (blocked on infrastructure, the same category as real
 * SMS/maps/push), so this is a **mock adapter behind a stable interface**:
 * dropping in the real uploader (an S3/GCS signed-URL PUT, Cloudinary, etc.) is
 * a one-file change and nothing else in the app moves.
 *
 * The mock does **not** persist anything. It returns a clearly-marked
 * placeholder URL so the delivery flow is exercisable end to end without a
 * storage backend — it never pretends a real hosted asset exists.
 */

import { PROOF_TYPE, ProofType } from '../types/backend';

export type ProofKind = typeof PROOF_TYPE.PHOTO | typeof PROOF_TYPE.SIGNATURE;

export interface ProofCapture {
  kind: ProofKind;
  /** A local file URI (photo) or a serialized signature (data/SVG string). */
  data: string;
}

export interface ProofUploader {
  /** Stores the capture and returns the URL to hand back to the backend. */
  upload(deliveryId: string, capture: ProofCapture): Promise<string>;
}

/** Prefix that marks a URL as produced by the mock uploader, never a real asset. */
export const MOCK_PROOF_URL_PREFIX = 'mock://proof';

/** True for any URL the mock uploader produced — useful for "demo only" UI hints. */
export function isMockProofUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith(MOCK_PROOF_URL_PREFIX);
}

class MockProofUploader implements ProofUploader {
  async upload(deliveryId: string, capture: ProofCapture): Promise<string> {
    // A short, real-feeling delay so the button's busy state isn't a flash.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const stamp = Date.now();
    return `${MOCK_PROOF_URL_PREFIX}/${deliveryId}/${capture.kind.toLowerCase()}-${stamp}`;
  }
}

/**
 * The active uploader. Today it is the mock; when object storage exists, swap
 * this single binding for the real adapter and every screen keeps working.
 */
export const proofUploader: ProofUploader = new MockProofUploader();

/** The backend proof types a driver can capture in-app. `OTP` is not built. */
export const CAPTURABLE_PROOF: readonly ProofType[] = [
  PROOF_TYPE.NONE,
  PROOF_TYPE.PHOTO,
  PROOF_TYPE.SIGNATURE,
];
