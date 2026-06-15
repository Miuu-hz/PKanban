import type { FastifyInstance } from 'fastify';

// Haversine distance in metres
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function resolveOrgForMember(app: FastifyInstance, memberId: string): Promise<string> {
  const { rows } = await app.db.query<{ org_id: string }>(
    `SELECT org_id FROM org_members WHERE member_id = $1 LIMIT 1`,
    [memberId],
  );
  if (!rows[0]) throw app.httpErrors.badRequest('ยังไม่ได้เข้าร่วมองค์กร');
  return rows[0].org_id;
}

export async function hrRoutes(app: FastifyInstance) {
  // --- Check-in ---
  app.post<{ Body: { lat?: number; lng?: number; note?: string; orgId?: string } }>(
    '/checkin',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const orgId = req.body.orgId ?? await resolveOrgForMember(app, req.user.memberId);

      // Check already checked in today without checkout
      const today = new Date(); today.setHours(0,0,0,0);
      const { rows: openRows } = await app.db.query(
        `SELECT id FROM hr_checkins
         WHERE member_id = $1 AND type = 'in' AND checked_at >= $2
         AND NOT EXISTS (
           SELECT 1 FROM hr_checkins c2
           WHERE c2.member_id = hr_checkins.member_id AND c2.type = 'out'
             AND c2.checked_at > hr_checkins.checked_at
         )`,
        [req.user.memberId, today],
      );
      if (openRows[0]) return reply.code(409).send({ error: 'ยังไม่ได้เช็คเอาท์ — กรุณาเช็คเอาท์ก่อน' });

      // GPS check
      if (req.body.lat !== undefined && req.body.lng !== undefined) {
        const org = await app.db.query<{
          office_lat: number; office_lng: number; office_radius_m: number; allow_remote: boolean;
        }>(`SELECT office_lat, office_lng, office_radius_m, allow_remote FROM organizations WHERE id = $1`, [orgId]);
        const o = org.rows[0];
        if (o && !o.allow_remote && o.office_lat && o.office_lng) {
          const dist = Math.round(haversine(req.body.lat, req.body.lng, o.office_lat, o.office_lng));
          if (dist > o.office_radius_m) {
            return reply.code(400).send({ error: `อยู่ห่างจากสำนักงาน ${dist} เมตร (อนุญาต ${o.office_radius_m} เมตร)`, distance_m: dist });
          }
        }
      }

      const { rows } = await app.db.query(
        `INSERT INTO hr_checkins (org_id, member_id, type, lat, lng, note) VALUES ($1,$2,'in',$3,$4,$5) RETURNING *`,
        [orgId, req.user.memberId, req.body.lat ?? null, req.body.lng ?? null, req.body.note ?? null],
      );
      return reply.code(201).send(rows[0]);
    },
  );

  // --- Check-out ---
  app.post<{ Body: { lat?: number; lng?: number; note?: string; orgId?: string } }>(
    '/checkout',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const orgId = req.body.orgId ?? await resolveOrgForMember(app, req.user.memberId);
      const { rows } = await app.db.query(
        `INSERT INTO hr_checkins (org_id, member_id, type, lat, lng, note) VALUES ($1,$2,'out',$3,$4,$5) RETURNING *`,
        [orgId, req.user.memberId, req.body.lat ?? null, req.body.lng ?? null, req.body.note ?? null],
      );
      return reply.code(201).send(rows[0]);
    },
  );

  // --- Today status ---
  app.get('/today', { preHandler: [app.authenticate] }, async (req) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const { rows } = await app.db.query(
      `SELECT type, checked_at, lat, lng FROM hr_checkins
       WHERE member_id = $1 AND checked_at >= $2 ORDER BY checked_at`,
      [req.user.memberId, today],
    );
    const lastIn = rows.filter((r) => r.type === 'in').pop();
    const lastOut = rows.filter((r) => r.type === 'out').pop();
    return { records: rows, status: lastIn && !lastOut ? 'checked_in' : lastOut ? 'checked_out' : 'not_checked_in' };
  });

  // --- Worklog ---
  app.post<{ Body: { cardId: string; hours: number; note?: string; orgId?: string } }>(
    '/worklog',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const orgId = req.body.orgId ?? await resolveOrgForMember(app, req.user.memberId);
      const { rows } = await app.db.query(
        `INSERT INTO hr_worklog (org_id, member_id, card_id, hours, note) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [orgId, req.user.memberId, req.body.cardId, req.body.hours, req.body.note ?? null],
      );
      return reply.code(201).send(rows[0]);
    },
  );

  app.get<{ Querystring: { cardId: string } }>(
    '/worklog',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { rows } = await app.db.query(
        `SELECT w.*, m.display_name FROM hr_worklog w
         JOIN members m ON m.id = w.member_id
         WHERE w.card_id = $1 ORDER BY w.logged_at DESC`,
        [req.query.cardId],
      );
      return rows;
    },
  );

  // --- Leave ---
  app.post<{ Body: { orgId?: string; leaveType?: string; startDate: string; endDate: string; reason?: string } }>(
    '/leave',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const orgId = req.body.orgId ?? await resolveOrgForMember(app, req.user.memberId);
      const { rows } = await app.db.query(
        `INSERT INTO hr_leave (org_id, member_id, leave_type, start_date, end_date, reason)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [orgId, req.user.memberId, req.body.leaveType ?? 'annual', req.body.startDate, req.body.endDate, req.body.reason ?? null],
      );
      return reply.code(201).send(rows[0]);
    },
  );

  app.get('/leave', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT * FROM hr_leave WHERE member_id = $1 ORDER BY created_at DESC`,
      [req.user.memberId],
    );
    return rows;
  });

  app.patch<{ Params: { id: string }; Body: { status: 'approved' | 'rejected' } }>(
    '/leave/:id',
    { preHandler: [app.authenticate] },
    async (req) => {
      const leave = await app.db.query<{ org_id: string }>(
        `SELECT org_id FROM hr_leave WHERE id = $1`, [req.params.id],
      );
      if (!leave.rows[0]) throw app.httpErrors.notFound();
      const callerRole = await app.db.query<{ role: string }>(
        `SELECT role FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [leave.rows[0].org_id, req.user.memberId],
      );
      if (!['admin','owner'].includes(callerRole.rows[0]?.role)) {
        throw app.httpErrors.forbidden('Admin role required');
      }
      const { rows } = await app.db.query(
        `UPDATE hr_leave SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *`,
        [req.body.status, req.user.memberId, req.params.id],
      );
      return rows[0];
    },
  );

  // --- Monthly report ---
  app.get<{ Querystring: { period?: string; orgId?: string } }>(
    '/report',
    { preHandler: [app.authenticate] },
    async (req) => {
      const period = req.query.period ?? new Date().toISOString().slice(0,7); // YYYY-MM
      const orgId = req.query.orgId ?? await resolveOrgForMember(app, req.user.memberId);

      const [evalResult, worklogResult, checkinResult, leaveResult] = await Promise.all([
        app.db.query(
          `SELECT COUNT(*) total, COUNT(*) FILTER (WHERE on_time) on_time_count
           FROM hr_evaluations WHERE member_id = $1 AND period = $2`,
          [req.user.memberId, period],
        ),
        app.db.query(
          `SELECT COALESCE(SUM(hours),0) total_hours FROM hr_worklog
           WHERE member_id = $1 AND date_trunc('month', logged_at) = $2::date`,
          [req.user.memberId, `${period}-01`],
        ),
        app.db.query(
          `SELECT COUNT(DISTINCT checked_at::date) attendance_days FROM hr_checkins
           WHERE member_id = $1 AND type = 'in' AND date_trunc('month', checked_at) = $2::date`,
          [req.user.memberId, `${period}-01`],
        ),
        app.db.query(
          `SELECT COUNT(*) leave_days FROM hr_leave
           WHERE member_id = $1 AND status = 'approved'
             AND start_date >= $2::date AND end_date < ($2::date + INTERVAL '1 month')`,
          [req.user.memberId, `${period}-01`],
        ),
      ]);

      const total = parseInt(evalResult.rows[0].total);
      const onTime = parseInt(evalResult.rows[0].on_time_count);
      return {
        period,
        tasksCompleted: total,
        onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : null,
        totalHours: parseFloat(worklogResult.rows[0].total_hours),
        attendanceDays: parseInt(checkinResult.rows[0].attendance_days),
        leaveDays: parseInt(leaveResult.rows[0].leave_days),
        summary: `เดือน ${period}: งานเสร็จ ${total} ชิ้น (ทันกำหนด ${onTime} ชิ้น), รวม ${worklogResult.rows[0].total_hours} ชม., เข้างาน ${checkinResult.rows[0].attendance_days} วัน`,
      };
    },
  );
}
