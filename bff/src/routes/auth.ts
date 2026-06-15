import type { FastifyInstance } from 'fastify';
import { verifyLineIdToken } from '../services/lineVerify';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/line — exchange LIFF idToken for BFF JWT
  app.post<{ Body: { idToken: string } }>('/line', {
    schema: {
      body: {
        type: 'object',
        required: ['idToken'],
        properties: { idToken: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const { idToken } = req.body;

    const profile = await verifyLineIdToken(idToken);

    // Upsert member
    const { rows } = await app.db.query<{
      id: string; line_user_id: string; display_name: string; ical_token: string;
    }>(
      `INSERT INTO members (line_user_id, display_name, picture_url, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (line_user_id) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             picture_url  = EXCLUDED.picture_url
       RETURNING id, line_user_id, display_name, ical_token`,
      [profile.sub, profile.name, profile.picture ?? null, profile.email ?? null],
    );
    const member = rows[0];

    // Ensure matching Planka user
    const plankaUser = await app.planka.ensureUser(profile.sub, profile.name, profile.email);
    await app.db.query(
      `UPDATE members SET planka_user_id = $1 WHERE id = $2`,
      [plankaUser.id, member.id],
    );

    // Collect org memberships
    const orgs = await app.db.query<{ org_id: string }>(
      `SELECT org_id FROM org_members WHERE member_id = $1`,
      [member.id],
    );

    const payload = {
      memberId: member.id,
      lineUserId: member.line_user_id,
      orgIds: orgs.rows.map((r) => r.org_id),
    };

    const accessToken = app.jwt.sign(payload, { expiresIn: '7d' });
    const refreshToken = app.jwt.sign({ memberId: member.id, type: 'refresh' }, { expiresIn: '30d' });

    return reply.code(200).send({
      accessToken,
      refreshToken,
      user: {
        id: member.id,
        name: member.display_name,
        icalToken: member.ical_token,
        orgIds: payload.orgIds,
      },
    });
  });

  // POST /auth/refresh
  app.post<{ Body: { refreshToken: string } }>('/refresh', {
    schema: {
      body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
    },
  }, async (req, reply) => {
    let payload: { memberId: string; type: string };
    try {
      payload = app.jwt.verify(req.body.refreshToken) as typeof payload;
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }
    if (payload.type !== 'refresh') return reply.code(401).send({ error: 'Not a refresh token' });

    const orgs = await app.db.query<{ org_id: string }>(
      `SELECT org_id FROM org_members WHERE member_id = $1`,
      [payload.memberId],
    );
    const member = await app.db.query<{ line_user_id: string }>(
      `SELECT line_user_id FROM members WHERE id = $1`,
      [payload.memberId],
    );
    if (!member.rows[0]) return reply.code(404).send({ error: 'Member not found' });

    const newPayload = {
      memberId: payload.memberId,
      lineUserId: member.rows[0].line_user_id,
      orgIds: orgs.rows.map((r) => r.org_id),
    };
    return { accessToken: app.jwt.sign(newPayload, { expiresIn: '7d' }) };
  });

  // DELETE /auth/logout
  app.delete('/logout', { preHandler: [app.authenticate] }, async (_req, reply) => {
    return reply.code(204).send();
  });
}
