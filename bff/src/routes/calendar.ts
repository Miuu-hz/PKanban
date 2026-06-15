import type { FastifyInstance } from 'fastify';
import { generateIcal } from '../services/ical';

export async function calendarRoutes(app: FastifyInstance) {
  // GET /calendar/:userId/feed.ics?token=<ical_token>
  // No JWT — auth by per-user ical_token in query param
  app.get<{ Params: { userId: string }; Querystring: { token: string } }>(
    '/:userId/feed.ics',
    async (req, reply) => {
      const { rows } = await app.db.query(
        `SELECT id, display_name, planka_user_id FROM members
         WHERE id = $1 AND ical_token = $2`,
        [req.params.userId, req.query.token],
      );
      if (!rows[0]) {
        return reply.code(401).send('Invalid or missing token');
      }
      const member = rows[0];

      // Get orgs this user belongs to (for project IDs)
      const orgs = await app.db.query<{ planka_project_id: string }>(
        `SELECT o.planka_project_id FROM organizations o
         JOIN org_members om ON om.org_id = o.id
         WHERE om.member_id = $1 AND o.planka_project_id IS NOT NULL`,
        [member.id],
      );

      // Collect cards with due dates assigned to this user across all orgs
      const cards: Array<{ id: string; name: string; dueDate: string; boardName: string; listName: string }> = [];

      for (const org of orgs.rows) {
        try {
          const project = await app.planka.get<{
            included: {
              boards: Array<{ id: string; name: string }>;
              lists: Array<{ id: string; name: string; boardId: string }>;
              cards: Array<{ id: string; name: string; dueDate: string | null; listId: string; memberIds: string[] }>;
            }
          }>(`/projects/${org.planka_project_id}`);

          const boardMap = new Map(project.included.boards.map((b) => [b.id, b.name]));
          const listMap = new Map(project.included.lists.map((l) => [l.id, { name: l.name, boardId: l.boardId }]));

          for (const card of project.included.cards) {
            if (!card.dueDate) continue;
            if (member.planka_user_id && !card.memberIds.includes(member.planka_user_id)) continue;
            const list = listMap.get(card.listId);
            cards.push({
              id: card.id,
              name: card.name,
              dueDate: card.dueDate,
              boardName: list ? (boardMap.get(list.boardId) ?? '') : '',
              listName: list?.name ?? '',
            });
          }
        } catch {
          // Skip orgs we can't fetch
        }
      }

      const ical = generateIcal(member.display_name, cards, req.params.userId, process.env.APP_DOMAIN ?? 'localhost');

      const encodedFilename = encodeURIComponent(`kanban-${member.display_name}.ics`);
      return reply
        .code(200)
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="kanban.ics"; filename*=UTF-8''${encodedFilename}`)
        .header('Cache-Control', 'max-age=300')
        .send(ical);
    },
  );

  // POST /calendar/regenerate-token — regenerate iCal token (revokes old URL)
  app.post('/regenerate-token', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await app.db.query(
      `UPDATE members SET ical_token = encode(gen_random_bytes(24), 'hex')
       WHERE id = $1 RETURNING id, ical_token`,
      [req.user.memberId],
    );
    return { icalToken: rows[0].ical_token };
  });
}
