import { describe, it, expect } from 'vitest';
import { buildTestApp, signTestToken } from '../helpers/buildApp';

describe('GET /calendar/:userId/feed.ics', () => {
  it('returns 200 text/calendar with valid ical_token', async () => {
    const { app, db, planka } = await buildTestApp();

    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'member-1', display_name: 'สมชาย', planka_user_id: 'pu-1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ planka_project_id: 'proj-1' }],
      });

    planka.get.mockResolvedValueOnce({
      included: {
        boards: [{ id: 'board-1', name: 'Main Board' }],
        lists:  [{ id: 'list-1', name: 'กำลังทำ', boardId: 'board-1' }],
        cards: [
          {
            id: 'card-1',
            name: 'ทำงานวันนี้',
            dueDate: '2026-07-01T17:00:00.000Z',
            listId: 'list-1',
            memberIds: ['pu-1'],
          },
        ],
      },
    });

    process.env.APP_DOMAIN = 'test.example.com';

    const res = await app.inject({
      method: 'GET',
      url: '/calendar/member-1/feed.ics?token=valid-ical-token',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.body).toContain('BEGIN:VCALENDAR');
    expect(res.body).toContain('ทำงานวันนี้');
    expect(res.body).toContain('UID:card-1@test.example.com');
  });

  it('returns 401 with wrong ical_token', async () => {
    const { app, db } = await buildTestApp();
    db.query.mockResolvedValueOnce({ rows: [] }); // no member found for this token

    const res = await app.inject({
      method: 'GET',
      url: '/calendar/member-1/feed.ics?token=wrong-token',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty iCal (no events) when member has no assigned cards', async () => {
    const { app, db, planka } = await buildTestApp();

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'm1', display_name: 'Test', planka_user_id: 'pu-1' }] })
      .mockResolvedValueOnce({ rows: [{ planka_project_id: 'proj-1' }] });

    planka.get.mockResolvedValueOnce({
      included: { boards: [], lists: [], cards: [] },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/calendar/m1/feed.ics?token=valid-token',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('BEGIN:VCALENDAR');
    expect(res.body).not.toContain('BEGIN:VEVENT');
  });

  it('returns empty feed when member has no orgs', async () => {
    const { app, db } = await buildTestApp();

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'm1', display_name: 'Test', planka_user_id: 'pu-1' }] })
      .mockResolvedValueOnce({ rows: [] }); // no orgs

    const res = await app.inject({
      method: 'GET',
      url: '/calendar/m1/feed.ics?token=valid-token',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('BEGIN:VEVENT');
  });
});

describe('POST /calendar/regenerate-token', () => {
  it('returns new ical_token for authenticated user', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, { memberId: 'm1', lineUserId: 'U1', orgIds: [] });

    db.query.mockResolvedValueOnce({ rows: [{ id: 'm1', ical_token: 'new-ical-token-xyz' }] });

    const res = await app.inject({
      method: 'POST', url: '/calendar/regenerate-token',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().icalToken).toBe('new-ical-token-xyz');
  });

  it('returns 401 without auth', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/calendar/regenerate-token' });
    expect(res.statusCode).toBe(401);
  });
});
