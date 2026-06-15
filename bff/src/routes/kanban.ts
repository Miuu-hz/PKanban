import type { FastifyInstance, FastifyRequest } from 'fastify';

// Proxy all Planka REST calls through BFF, enforcing org-level ACL.
export async function kanbanRoutes(app: FastifyInstance) {
  // Middleware: resolve orgId from query/param and check membership
  async function resolveOrg(req: FastifyRequest, projectId?: string) {
    if (!projectId) return;
    const { rows } = await app.db.query<{ org_id: string }>(
      `SELECT o.id as org_id FROM organizations o
       JOIN org_members om ON om.org_id = o.id
       WHERE o.planka_project_id = $1 AND om.member_id = $2`,
      [projectId, req.user.memberId],
    );
    if (!rows[0]) throw app.httpErrors.forbidden('Not a member of this project');
    return rows[0].org_id;
  }

  // --- Boards ---
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/boards',
    { preHandler: [app.authenticate] },
    async (req) => {
      await resolveOrg(req, req.params.projectId);
      return app.planka.get(`/projects/${req.params.projectId}/boards`);
    },
  );

  app.post<{ Params: { projectId: string }; Body: { name: string } }>(
    '/projects/:projectId/boards',
    { preHandler: [app.authenticate] },
    async (req) => {
      await resolveOrg(req, req.params.projectId);
      return app.planka.post(`/projects/${req.params.projectId}/boards`, req.body);
    },
  );

  app.get<{ Params: { boardId: string } }>(
    '/boards/:boardId',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.get(`/boards/${req.params.boardId}`),
  );

  app.patch<{ Params: { boardId: string }; Body: unknown }>(
    '/boards/:boardId',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.patch(`/boards/${req.params.boardId}`, req.body),
  );

  app.delete<{ Params: { boardId: string } }>(
    '/boards/:boardId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      await app.planka.delete(`/boards/${req.params.boardId}`);
      return reply.code(204).send();
    },
  );

  // --- Lists (columns) ---
  app.post<{ Params: { boardId: string }; Body: unknown }>(
    '/boards/:boardId/lists',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.post(`/boards/${req.params.boardId}/lists`, req.body),
  );

  app.patch<{ Params: { listId: string }; Body: unknown }>(
    '/lists/:listId',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.patch(`/lists/${req.params.listId}`, req.body),
  );

  app.delete<{ Params: { listId: string } }>(
    '/lists/:listId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      await app.planka.delete(`/lists/${req.params.listId}`);
      return reply.code(204).send();
    },
  );

  // --- Cards ---
  app.post<{ Params: { listId: string }; Body: unknown }>(
    '/lists/:listId/cards',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.post(`/lists/${req.params.listId}/cards`, req.body),
  );

  app.get<{ Params: { cardId: string } }>(
    '/cards/:cardId',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.get(`/cards/${req.params.cardId}`),
  );

  app.patch<{ Params: { cardId: string }; Body: unknown }>(
    '/cards/:cardId',
    { preHandler: [app.authenticate] },
    async (req) => app.planka.patch(`/cards/${req.params.cardId}`, req.body),
  );

  app.delete<{ Params: { cardId: string } }>(
    '/cards/:cardId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      await app.planka.delete(`/cards/${req.params.cardId}`);
      return reply.code(204).send();
    },
  );
}
