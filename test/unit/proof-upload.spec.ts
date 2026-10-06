import { PROOF_TYPE } from '../../src/types/backend';
import {
  CAPTURABLE_PROOF,
  MOCK_PROOF_URL_PREFIX,
  isMockProofUrl,
  proofUploader,
} from '../../src/proof/proof-upload';

describe('proof-upload (mock port)', () => {
  it('returns a clearly-marked mock URL that encodes the delivery and kind', async () => {
    const url = await proofUploader.upload('delivery-123', { kind: PROOF_TYPE.PHOTO, data: 'file:///tmp/pic.jpg' });
    expect(url.startsWith(MOCK_PROOF_URL_PREFIX)).toBe(true);
    expect(url).toContain('delivery-123');
    expect(url).toContain('photo');
    expect(isMockProofUrl(url)).toBe(true);
  });

  it('lowercases the proof kind in the URL', async () => {
    const url = await proofUploader.upload('d1', { kind: PROOF_TYPE.SIGNATURE, data: '<svg/>' });
    expect(url).toContain('signature');
  });

  it('flags only mock URLs', () => {
    expect(isMockProofUrl('https://cdn.example.com/proof.jpg')).toBe(false);
    expect(isMockProofUrl(null)).toBe(false);
    expect(isMockProofUrl(undefined)).toBe(false);
  });

  it('offers only the proof types a driver can capture in-app (no OTP)', () => {
    expect(CAPTURABLE_PROOF).toContain(PROOF_TYPE.NONE);
    expect(CAPTURABLE_PROOF).toContain(PROOF_TYPE.PHOTO);
    expect(CAPTURABLE_PROOF).toContain(PROOF_TYPE.SIGNATURE);
    expect(CAPTURABLE_PROOF).not.toContain(PROOF_TYPE.OTP);
  });
});
