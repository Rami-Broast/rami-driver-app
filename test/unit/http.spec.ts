import { ApiError, joinUrl, networkErrorMessage, parseApiError } from '../../src/api/http';

describe('http helpers', () => {
  it('joins base and path with exactly one slash', () => {
    expect(joinUrl('http://x/api/v1', 'branches')).toBe('http://x/api/v1/branches');
    expect(joinUrl('http://x/api/v1/', '/branches')).toBe('http://x/api/v1/branches');
    expect(joinUrl('http://x/api/v1', '/orders/1/pay')).toBe('http://x/api/v1/orders/1/pay');
  });

  it('parses the backend error envelope', () => {
    const shape = parseApiError(409, { statusCode: 409, code: 'CONFLICT', message: 'Nope', details: ['a'] });
    expect(shape.code).toBe('CONFLICT');
    expect(shape.statusCode).toBe(409);
    expect(shape.details).toEqual(['a']);
  });

  it('synthesises a safe error for a non-envelope body', () => {
    expect(parseApiError(500, 'html error page').code).toBe('INTERNAL_ERROR');
    expect(parseApiError(400, null).code).toBe('REQUEST_FAILED');
    // Never leaks a raw server message.
    expect(parseApiError(500, '<html>').message).not.toContain('html');
  });

  it('flags network errors', () => {
    const net = new ApiError({ statusCode: 0, code: 'NETWORK', message: 'x' });
    expect(net.isNetwork).toBe(true);
    expect(new ApiError({ statusCode: 404, code: 'NOT_FOUND', message: 'x' }).isNetwork).toBe(false);
  });
});

describe('networkErrorMessage', () => {
  it('does not blame the driver when the device is online', () => {
    // The failure this exists for: every fetch throw became "No connection.
    // Check your network and try again." A CORS block, a wrong API URL and a
    // server that is down all look identical to `fetch`, so a driver was sent
    // to check a connection that was working while the real cause was ours.
    const message = networkErrorMessage(new TypeError('Failed to fetch'), true);

    expect(message).toMatch(/online/i);
    expect(message).toMatch(/our end/i);
    expect(message).not.toMatch(/check your network/i);
  });

  it('says no connection only when the device really has none', () => {
    expect(networkErrorMessage(new TypeError('Failed to fetch'), false)).toMatch(
      /No connection/i,
    );
  });

  it('falls back to the cautious wording when it cannot tell', () => {
    // A native build has no `navigator.onLine` to read.
    expect(networkErrorMessage(new TypeError('Network request failed'), null)).toMatch(
      /No connection/i,
    );
  });

  it('names a timeout as a timeout', () => {
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';

    // Distinct from both: the request reached nothing *within the deadline*,
    // which is a retry, not a diagnosis.
    expect(networkErrorMessage(abort, true)).toMatch(/too long/i);
    expect(networkErrorMessage(abort, false)).toMatch(/too long/i);
  });
});
