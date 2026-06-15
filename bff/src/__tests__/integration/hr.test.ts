import { describe, it, expect } from 'vitest';
import { buildTestApp, signTestToken } from '../helpers/buildApp';

const CALLER = { memberId: 'member-1', lineUserId: 'Uabc', orgIds: ['org-1'] };

// Office at Siam area Bangkok — lat: 13.7563, lng: 100.5018
const OFFICE = { lat: 13.7563, lng: 100.5018 };
const NEARBY = { lat: 13.7565, lng: 100.5020 };    // ~26m away — within 300m
const FAR_AWAY = { lat: 13.8000, lng: 100.5018 };  // ~4.9km away — outside 300m

function orgWithGPS(allow_remote = false) {
  return {
    rows: [{
      office_lat: OFFICE.lat,
      office_lng: OFFICE.lng,
      office_radius_m: 300,
      allow_remote,
    }],
  };
}

describe('POST /hr/checkin', () => {
  it('records check-in with GPS and returns 201', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })   // resolveOrgForMember
      .mockResolvedValueOnce({ rows: [] })                        // no open check-in today
      .mockResolvedValueOnce(orgWithGPS())                        // org GPS settings
      .mockResolvedValueOnce({ rows: [{ id: 'checkin-1', type: 'in', checked_at: new Date() }] }); // INSERT

    const res = await app.inject({
      method: 'POST', url: '/hr/checkin',
      headers: { Authorization: `Bearer ${token}` },
      payload: { lat: NEARBY.lat, lng: NEARBY.lng },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().type).toBe('in');
  });

  it('returns 409 when already checked in without checkout', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] }) // org
      .mockResolvedValueOnce({ rows: [{ id: 'open-checkin' }] }); // open check-in exists

    const res = await app.inject({
      method: 'POST', url: '/hr/checkin',
      headers: { Authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('เช็คเอาท์');
  });

  it('returns 400 when GPS is too far from office', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [] })    // no open check-in
      .mockResolvedValueOnce(orgWithGPS()); // GPS check enabled

    const res = await app.inject({
      method: 'POST', url: '/hr/checkin',
      headers: { Authorization: `Bearer ${token}` },
      payload: { lat: FAR_AWAY.lat, lng: FAR_AWAY.lng },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('อยู่ห่าง');
    expect(res.json().distance_m).toBeGreaterThan(300);
  });

  it('allows check-in from far away when allow_remote=true', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(orgWithGPS(true)) // allow_remote = true
      .mockResolvedValueOnce({ rows: [{ id: 'ci-1', type: 'in', checked_at: new Date() }] });

    const res = await app.inject({
      method: 'POST', url: '/hr/checkin',
      headers: { Authorization: `Bearer ${token}` },
      payload: { lat: FAR_AWAY.lat, lng: FAR_AWAY.lng },
    });
    expect(res.statusCode).toBe(201);
  });

  it('returns 401 without auth', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/hr/checkin', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /hr/checkout', () => {
  it('records check-out and returns 201', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'co-1', type: 'out', checked_at: new Date() }] });

    const res = await app.inject({
      method: 'POST', url: '/hr/checkout',
      headers: { Authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().type).toBe('out');
  });
});

describe('GET /hr/today', () => {
  it('returns checked_in status when last record is in', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query.mockResolvedValueOnce({
      rows: [{ type: 'in', checked_at: new Date(), lat: null, lng: null }],
    });

    const res = await app.inject({
      method: 'GET', url: '/hr/today',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('checked_in');
  });

  it('returns checked_out status when both in and out exist', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);
    const now = new Date();
    db.query.mockResolvedValueOnce({
      rows: [
        { type: 'in',  checked_at: new Date(now.getTime() - 28800000), lat: null, lng: null },
        { type: 'out', checked_at: now, lat: null, lng: null },
      ],
    });

    const res = await app.inject({
      method: 'GET', url: '/hr/today',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.json().status).toBe('checked_out');
  });

  it('returns not_checked_in when no records', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'GET', url: '/hr/today',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.json().status).toBe('not_checked_in');
  });
});

describe('POST /hr/worklog', () => {
  it('creates worklog entry and returns 201', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'wl-1', card_id: 'card-1', hours: 2.5 }] });

    const res = await app.inject({
      method: 'POST', url: '/hr/worklog',
      headers: { Authorization: `Bearer ${token}` },
      payload: { cardId: 'card-1', hours: 2.5, note: 'ทำรายงาน' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().hours).toBe(2.5);
  });
});

describe('POST /hr/leave', () => {
  it('creates leave request and returns 201', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'leave-1', status: 'pending', start_date: '2026-07-01', end_date: '2026-07-02' }],
      });

    const res = await app.inject({
      method: 'POST', url: '/hr/leave',
      headers: { Authorization: `Bearer ${token}` },
      payload: { startDate: '2026-07-01', endDate: '2026-07-02', reason: 'พักผ่อน' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('pending');
  });
});

describe('PATCH /hr/leave/:id', () => {
  it('admin can approve leave request', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })   // find leave
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })      // caller role
      .mockResolvedValueOnce({ rows: [{ id: 'leave-1', status: 'approved' }] }); // UPDATE

    const res = await app.inject({
      method: 'PATCH', url: '/hr/leave/leave-1',
      headers: { Authorization: `Bearer ${token}` },
      payload: { status: 'approved' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('approved');
  });

  it('regular member cannot approve leave', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // not admin

    const res = await app.inject({
      method: 'PATCH', url: '/hr/leave/leave-1',
      headers: { Authorization: `Bearer ${token}` },
      payload: { status: 'approved' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /hr/report', () => {
  it('returns monthly summary with correct fields', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    // All 4 parallel queries: evaluations, worklog, checkins, leave
    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] }) // resolveOrg
      .mockResolvedValueOnce({ rows: [{ total: '8', on_time_count: '6' }] })
      .mockResolvedValueOnce({ rows: [{ total_hours: '24.5' }] })
      .mockResolvedValueOnce({ rows: [{ attendance_days: '22' }] })
      .mockResolvedValueOnce({ rows: [{ leave_days: '1' }] });

    const res = await app.inject({
      method: 'GET', url: '/hr/report?period=2026-06',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.period).toBe('2026-06');
    expect(body.tasksCompleted).toBe(8);
    expect(body.onTimeRate).toBe(75); // 6/8 = 75%
    expect(body.totalHours).toBe(24.5);
    expect(body.attendanceDays).toBe(22);
    expect(body.leaveDays).toBe(1);
    expect(body.summary).toContain('2026-06');
    expect(body.summary).toContain('8');
  });

  it('returns null onTimeRate when no tasks completed', async () => {
    const { app, db } = await buildTestApp();
    const token = signTestToken(app, CALLER);

    db.query
      .mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0', on_time_count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total_hours: '0' }] })
      .mockResolvedValueOnce({ rows: [{ attendance_days: '0' }] })
      .mockResolvedValueOnce({ rows: [{ leave_days: '0' }] });

    const res = await app.inject({
      method: 'GET', url: '/hr/report',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.json().onTimeRate).toBeNull();
  });
});
