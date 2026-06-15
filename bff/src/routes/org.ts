import type { FastifyInstance } from 'fastify';

// Plan limits
const PLAN_LIMITS: Record<string, { members: number; boards: number }> = {
  free:    { members: 5,         boards: 2 },
  starter: { members: 15,        boards: 10 },
  pro:     { members: Infinity,  boards: Infinity },
};

function requireRole(minRole: string) {
  const order = ['viewer', 'member', 'admin', 'owner'];
  return minRole;
  // Used as label; actual check done inline via query below
}

export async function orgRoutes(app: FastifyInstance) {
  // --- Create org ---
  app.post<{ Body: { name: string; slug: string } }>(
    '/',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { name, slug } = req.body;
      // Create Planka project
      const project = await app.planka.post<{ item: { id: string } }>('/projects', { name });

      const { rows } = await app.db.query(
        `INSERT INTO organizations (name, slug, owner_id, planka_project_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, slug, req.user.memberId, project.item.id],
      );
      const orgId = rows[0].id;
      await app.db.query(
        `INSERT INTO org_members (org_id, member_id, role) VALUES ($1, $2, 'owner')`,
        [orgId, req.user.memberId],
      );
      return reply.code(201).send({ id: orgId, name, slug });
    },
  );

  // --- Get org ---
  app.get<{ Params: { orgId: string } }>(
    '/:orgId',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { rows } = await app.db.query(
        `SELECT o.*, om.role FROM organizations o
         JOIN org_members om ON om.org_id = o.id AND om.member_id = $1
         WHERE o.id = $2`,
        [req.user.memberId, req.params.orgId],
      );
      if (!rows[0]) throw app.httpErrors.notFound('Organization not found');
      return rows[0];
    },
  );

  // --- List members ---
  app.get<{ Params: { orgId: string } }>(
    '/:orgId/members',
    { preHandler: [app.authenticate] },
    async (req) => {
      // Verify caller is member
      const check = await app.db.query(
        `SELECT 1 FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.user.memberId],
      );
      if (!check.rows[0]) throw app.httpErrors.forbidden();
      const { rows } = await app.db.query(
        `SELECT m.id, m.display_name, m.picture_url, om.role, om.joined_at
         FROM org_members om JOIN members m ON m.id = om.member_id
         WHERE om.org_id = $1 ORDER BY om.joined_at`,
        [req.params.orgId],
      );
      return rows;
    },
  );

  // --- Invite ---
  app.post<{ Params: { orgId: string }; Body: { role?: string } }>(
    '/:orgId/invite',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      // Must be admin+
      const { rows: roleRows } = await app.db.query<{ role: string }>(
        `SELECT role FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.user.memberId],
      );
      if (!roleRows[0] || !['admin','owner'].includes(roleRows[0].role)) {
        throw app.httpErrors.forbidden('Admin role required');
      }
      // Check plan limit
      const { rows: countRows } = await app.db.query<{ count: string }>(
        `SELECT COUNT(*) FROM org_members WHERE org_id = $1`,
        [req.params.orgId],
      );
      const { rows: orgRows } = await app.db.query<{ plan: string }>(
        `SELECT plan FROM organizations WHERE id = $1`, [req.params.orgId],
      );
      const limit = PLAN_LIMITS[orgRows[0]?.plan ?? 'free'].members;
      if (parseInt(countRows[0].count) >= limit) {
        return reply.code(402).send({ error: `แผน ${orgRows[0].plan} รองรับสมาชิกสูงสุด ${limit} คน — อัปเกรดแผนเพื่อเพิ่มสมาชิก` });
      }
      // Create invite token
      const { rows } = await app.db.query(
        `INSERT INTO org_invites (org_id, role, created_by) VALUES ($1, $2, $3) RETURNING token`,
        [req.params.orgId, req.body.role ?? 'member', req.user.memberId],
      );
      const token = rows[0].token;
      const liffId = process.env.LIFF_ID;
      return { token, url: `https://liff.line.me/${liffId}?invite=${token}` };
    },
  );

  // --- Join via invite ---
  app.post<{ Body: { token: string } }>(
    '/join',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { rows } = await app.db.query(
        `SELECT * FROM org_invites WHERE token = $1 AND used_by IS NULL AND expires_at > NOW()`,
        [req.body.token],
      );
      if (!rows[0]) throw app.httpErrors.badRequest('Invite token expired or already used');
      const invite = rows[0];
      await app.db.query(
        `INSERT INTO org_members (org_id, member_id, role) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [invite.org_id, req.user.memberId, invite.role],
      );
      await app.db.query(
        `UPDATE org_invites SET used_by = $1, used_at = NOW() WHERE id = $2`,
        [req.user.memberId, invite.id],
      );
      return reply.code(200).send({ orgId: invite.org_id, role: invite.role });
    },
  );

  // --- Update member role ---
  app.patch<{ Params: { orgId: string; memberId: string }; Body: { role: string } }>(
    '/:orgId/members/:memberId',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { rows } = await app.db.query<{ role: string }>(
        `SELECT role FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.user.memberId],
      );
      if (!rows[0] || !['admin','owner'].includes(rows[0].role)) {
        throw app.httpErrors.forbidden('Admin role required');
      }
      await app.db.query(
        `UPDATE org_members SET role = $1 WHERE org_id = $2 AND member_id = $3`,
        [req.body.role, req.params.orgId, req.params.memberId],
      );
      return { updated: true };
    },
  );

  // --- Remove member ---
  app.delete<{ Params: { orgId: string; memberId: string } }>(
    '/:orgId/members/:memberId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { rows } = await app.db.query<{ role: string }>(
        `SELECT role FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.user.memberId],
      );
      if (!rows[0] || !['admin','owner'].includes(rows[0].role)) {
        throw app.httpErrors.forbidden('Admin role required');
      }
      // Prevent removing last owner
      const { rows: ownerRows } = await app.db.query(
        `SELECT 1 FROM org_members WHERE org_id = $1 AND role = 'owner' AND member_id != $2`,
        [req.params.orgId, req.params.memberId],
      );
      const targetRole = await app.db.query<{ role: string }>(
        `SELECT role FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.params.memberId],
      );
      if (targetRole.rows[0]?.role === 'owner' && ownerRows.length === 0) {
        throw app.httpErrors.badRequest('ต้องโอนความเป็นเจ้าของก่อนออกจากองค์กร');
      }
      await app.db.query(
        `DELETE FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.params.memberId],
      );
      return reply.code(204).send();
    },
  );

  // --- Org settings (office GPS, done_list_id) ---
  app.patch<{ Params: { orgId: string }; Body: Record<string, unknown> }>(
    '/:orgId/settings',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { rows } = await app.db.query<{ role: string }>(
        `SELECT role FROM org_members WHERE org_id = $1 AND member_id = $2`,
        [req.params.orgId, req.user.memberId],
      );
      if (!rows[0] || !['admin','owner'].includes(rows[0].role)) {
        throw app.httpErrors.forbidden('Admin role required');
      }
      const allowed = ['office_lat','office_lng','office_radius_m','allow_remote','done_list_id'];
      const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
      if (!updates.length) return { updated: false };
      const sets = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
      await app.db.query(
        `UPDATE organizations SET ${sets} WHERE id = $1`,
        [req.params.orgId, ...updates.map(([, v]) => v)],
      );
      return { updated: true };
    },
  );
}
