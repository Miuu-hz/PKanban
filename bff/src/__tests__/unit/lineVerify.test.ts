import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures the variable is initialized before vi.mock's hoisted factory runs
const mockFetch = vi.hoisted(() => vi.fn());
vi.mock('undici', () => ({ fetch: mockFetch }));

import { verifyLineIdToken } from '../../services/lineVerify';

function makeLineResponse(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'Uabc123',
    name: 'สมชาย ใจดี',
    picture: 'https://example.com/pic.jpg',
    email: 'somchai@example.com',
    ...overrides,
  };
}

function mockSuccess(payload: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    status: 200,
  });
}

function mockFailure(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
}

describe('verifyLineIdToken', () => {
  beforeEach(() => {
    process.env.LINE_CHANNEL_ID = 'test-channel-id';
  });

  it('returns profile on valid token', async () => {
    mockSuccess(makeLineResponse());
    const result = await verifyLineIdToken('valid-id-token');
    expect(result.sub).toBe('Uabc123');
    expect(result.name).toBe('สมชาย ใจดี');
  });

  it('calls LINE verify endpoint with id_token and client_id', async () => {
    mockSuccess(makeLineResponse());
    await verifyLineIdToken('my-token');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.line.me/oauth2/v2.1/verify');
    expect(opts.method).toBe('POST');
    const body = opts.body as string;
    expect(body).toContain('id_token=my-token');
    expect(body).toContain('client_id=test-channel-id');
  });

  it('returns email when LINE provides it', async () => {
    mockSuccess(makeLineResponse({ email: 'user@test.com' }));
    const result = await verifyLineIdToken('token');
    expect(result.email).toBe('user@test.com');
  });

  it('returns undefined email when not provided', async () => {
    const payload = makeLineResponse();
    delete (payload as Record<string, unknown>)['email'];
    mockSuccess(payload);
    const result = await verifyLineIdToken('token');
    expect(result.email).toBeUndefined();
  });

  it('throws on HTTP error response', async () => {
    mockFailure(400, { error: 'invalid_token', error_description: 'The token is expired' });
    await expect(verifyLineIdToken('bad-token')).rejects.toThrow('400');
  });

  it('throws when payload contains error field', async () => {
    mockSuccess({ error: 'invalid_client', error_description: 'Wrong client_id' });
    await expect(verifyLineIdToken('bad-token')).rejects.toThrow('Wrong client_id');
  });

  it('throws when fetch itself fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network timeout'));
    await expect(verifyLineIdToken('token')).rejects.toThrow('network timeout');
  });
});
