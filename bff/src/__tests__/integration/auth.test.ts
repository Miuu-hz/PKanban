import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures the variable is initialized before vi.mock's hoisted factory runs
const mockVerifyLineIdToken = vi.hoisted(() => vi.fn());
vi.mock('../../services/lineVerify', () => ({
  verifyLineIdToken: mockVerifyLineIdToken,
}));

import { buildTestApp, signTestToken, createMockDb } from '../helpers/buildApp';

const MEMBER_ROW = {
  id: 'member-uuid-1',
  line_user_id: 'Uabc123',
  display_name: 'สมชาย ใจดี',
  ical_token: 'ical-token-abc',
};

const LINE_PROFILE = {
  sub: 'Uabc123',
  name: 'สมชาย ใจดี',
  picture: 'https://example.com/pic.jpg',
  email: 'somchai@example.com',
};

function setupDbForLogin(db: ReturnType<typeof createMockDb>) {
  // 1. INSERT members ... RETURNING
  db.query.mockResolvedValueOnce({ rows: [MEMBER_ROW], rowCount: 1 });
  // 2. UPDATE members SET planka_user_id
  db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  // 3. SELECT org_id FROM org_members
  db.query.mockResolvedValueOnce({ rows: [{ org_id: 'org-uuid-1' }], rowCount: 1 });
}

describe('POST /auth/line', () => {
  it('returns 200 with accessToken and refreshToken on valid idToken', async () => {
    const { app, db } = await buildTestApp();
    mockVerifyLineIdToken.mockResolvedValueOnce(LINE_PROFILE);
    setupDbForLogin(db);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/line',
      payload: { idToken: 'valid-liff-token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.name).toBe('สมชาย ใจดี');
    expect(body.user.orgIds).toEqual(['org-uuid-1']);
  });

  it('returns 400 when idToken body is missing', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/auth/line', payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when LINE verify throws', async () => {
    const { app } = await buildTestApp();
    mockVerifyLineIdToken.mockRejectedValueOnce(new Error('LINE token invalid'));
    const res = await app.inject({
      method: 'POST', url: '/auth/line', payload: { idToken: 'bad-token' },
    });
    expect(res.statusCode).toBe(500);
  });

  it('stores member in DB with correct fields', async () => {
    const { app, db } = await buildTestApp();
    mockVerifyLineIdToken.mockResolvedValueOnce(LINE_PROFILE);
    setupDbForLogin(db);

    await app.inject({ method: 'POST', url: '/auth/line', payload: { idToken: 'token' } });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO members');
    expect(params).toContain('Uabc123'); // line_user_id
    expect(params).toContain('สมชาย ใจดี'); // display_name
  });

  it('returns user without orgIds when member has no org', async () => {
    const { app, db } = await buildTestApp();
    mockVerifyLineIdToken.mockResolvedValueOnce(LINE_PROFILE);
    db.query
      .mockResolvedValueOnce({ rows: [MEMBER_ROW], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no orgs

    const res = await app.inject({ method: 'POST', url: '/auth/line', payload: { idToken: 'token' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.orgIds).toEqual([]);
  });
});

describe('POST /auth/refresh', () => {
  it('returns new accessToken with valid refresh token', async () => {
    const { app, db } = await buildTestApp();
    const refreshToken = app.jwt.sign({ memberId: 'member-uuid-1', type: 'refresh' }, { expiresIn: '30d' });

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-uuid-1' }] })
      .mockResolvedValueOnce({ rows: [{ line_user_id: 'Uabc123' }] });

    const res = await app.inject({
      method: 'POST', url: '/auth/refresh',
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });

  it('returns 401 with invalid/expired token', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({
      method: 'POST', url: '/auth/refresh',
      payload: { refreshToken: 'invalid.token.here' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when token type is not refresh', async () => {
    const { app } = await buildTestApp();
    // Sign an access token (not a refresh token)
    const wrongToken = app.jwt.sign({ memberId: 'member-uuid-1', lineUserId: 'U123', orgIds: [] });

    const res = await app.inject({
      method: 'POST', url: '/auth/refresh',
      payload: { refreshToken: wrongToken },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when refreshToken field is missing', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/auth/refresh', payload: {} });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /auth/logout', () => {
  it('returns 204 with valid JWT', async () => {
    const { app } = await buildTestApp();
    const token = signTestToken(app, { memberId: 'member-1', lineUserId: 'U1', orgIds: [] });

    const res = await app.inject({
      method: 'DELETE', url: '/auth/logout',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('returns 401 without Authorization header', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'DELETE', url: '/auth/logout' });
    expect(res.statusCode).toBe(401);
  });
});
