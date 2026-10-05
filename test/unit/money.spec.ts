import { formatMinor, formatSar } from '../../src/util/money';

describe('money', () => {
  it('formats minor units as two-decimal major', () => {
    expect(formatMinor(3250)).toBe('32.50');
    expect(formatMinor(5)).toBe('0.05');
    expect(formatMinor(100)).toBe('1.00');
    expect(formatMinor(0)).toBe('0.00');
    expect(formatMinor(199999)).toBe('1999.99');
  });

  it('handles negative amounts (e.g. discounts)', () => {
    expect(formatMinor(-250)).toBe('-2.50');
  });

  it('prefixes SAR', () => {
    expect(formatSar(3250)).toBe('SAR 32.50');
  });
});
