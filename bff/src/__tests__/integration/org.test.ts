import { describe, it, expect } from 'vitest';
import { buildTestApp, signTestToken, createMockDb } from '../helpers/buildApp';

const CALLER = { memberId: 'member-1', lineUserId: 'Uabc', orgIds: ['org-1'] };

describe('POST /org', () => {
  it('creates org and returns 201 with id', async () => {
    const { app, db, planka } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    planka.post.mockResolvedValueOnce({ item: { id: 'planka-proj-1', name: 'My Org' } });
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'new-org-id' }] }) // INSERT organizations
      .mockResolvedValueOnce({ rows: [] }); // INSERT org_members

    const res = await app.inject({
      method: 'POST', url: '/org',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'บริษัททดสอบ', slug: 'test-co' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('new-org-id');
    expect(planka.post).toHaveBeenCalledWith('/projects', { name: 'บริษัททดสอบ' });
  });

  it('returns 401 without auth', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/org', payload: { name: 'X', slug: 'x' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /org/:orgId', () => {
  it('returns org data for a member', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query.mockResolvedValueOnce({
      rows: [{ id: 'org-1', name: 'My Org', plan: 'free', role: 'owner' }],
    });

    const res = await app.inject({
      method: 'GET', url: '/org/org-1',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('My Org');
  });

  it('returns 404 for non-member', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'GET', url: '/org/org-other',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /org/:orgId/members', () => {
  it('returns member list for org members', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // membership check
      .mockResolvedValueOnce({
        rows: [
          { id: 'member-1', display_name: 'สมชาย', role: 'owner', joined_at: new Date() },
          { id: 'member-2', display_name: 'มาลี', role: 'member', joined_at: new Date() },
        ],
      });

    const res = await app.inject({
      method: 'GET', url: '/org/org-1/members',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const members = res.json();
    expect(members).toHaveLength(2);
    expect(members[0].display_name).toBe('สมชาย');
  });

  it('returns 403 for non-members', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);
    db.query.mockResolvedValueOnce({ rows: [] }); // not a member

    const res = await app.inject({
      method: 'GET', url: '/org/org-1/members',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /org/:orgId/invite', () => {
  it('returns invite token for admin', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    process.env.LIFF_ID = 'test-liff-id';
    db.query
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })       // role check
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })           // member count
      .mockResolvedValueOnce({ rows: [{ plan: 'free' }] })         // org plan (free = limit 5)
      .mockResolvedValueOnce({ rows: [{ token: 'invite-abc-123' }] }); // INSERT invite

    const res = await app.inject({
      method: 'POST', url: '/org/org-1/invite',
      headers: { Authorization: `Bearer ${token}` },
      payload: { role: 'member' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().token).toBe('invite-abc-123');
    expect(res.json().url).toContain('invite-abc-123');
  });

  it('returns 403 for member (not admin)', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);
    db.query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

    const res = await app.inject({
      method: 'POST', url: '/org/org-1/invite',
      headers: { Authorization: `Bearer ${token}` },
      payload: { role: 'member' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 402 when plan member limit is reached', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })   // 5/5 free plan limit
      .mockResolvedValueOnce({ rows: [{ plan: 'free' }] });

    const res = await app.inject({
      method: 'POST', url: '/org/org-1/invite',
      headers: { Authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toContain('free');
  });
});

describe('POST /org/join', () => {
  it('joins org with valid invite token', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'invite-1', org_id: 'org-1', role: 'member' }] })
      .mockResolvedValueOnce({ rows: [] }) // INSERT org_members
      .mockResolvedValueOnce({ rows: [] }); // UPDATE org_invites

    const res = await app.inject({
      method: 'POST', url: '/org/join',
      headers: { Authorization: `Bearer ${token}` },
      payload: { token: 'valid-invite-token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBe('org-1');
  });

  it('returns 400 for expired/used invite', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);
    db.query.mockResolvedValueOnce({ rows: [] }); // no valid invite found

    const res = await app.inject({
      method: 'POST', url: '/org/join',
      headers: { Authorization: `Bearer ${token}` },
      payload: { token: 'expired-token' },
    });
    expect(res.statusCode).toBe(400);
  });
});
