import Fastify, { type FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import type { Pool } from 'pg';
import { vi, type Mock } from 'vitest';
import { authRoutes } from '../../routes/auth';
import { orgRoutes } from '../../routes/org';
import { hrRoutes } from '../../routes/hr';
import { calendarRoutes } from '../../routes/calendar';
import { webhookRoutes } from '../../routes/webhooks';

export interface MockDb {
  query: Mock;
  end: Mock;
}

export interface MockPlanka {
  get: Mock;
  post: Mock;
  patch: Mock;
  delete: Mock;
  ensureUser: Mock;
}

export const TEST_JWT_SECRET = 'test-secret-for-testing-only-32chars';

export function createMockDb(): MockDb {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockPlanka(): MockPlanka {
  return {
    get: vi.fn().mockResolvedValue({ items: [], included: { boards: [], lists: [], cards: [] } }),
    post: vi.fn().mockResolvedValue({ item: { id: 'planka-id-1', name: 'Test Project' } }),
    patch: vi.fn().mockResolvedValue({ item: {} }),
    delete: vi.fn().mockResolvedValue(undefined),
    ensureUser: vi.fn().mockResolvedValue({ id: 'planka-user-1', email: 'line_user123@kanban.local' }),
  };
}

export async function buildTestApp(
  db: MockDb = createMockDb(),
  planka: MockPlanka = createMockPlanka(),
): Promise<{ app: FastifyInstance; db: MockDb; planka: MockPlanka }> {
  const app = Fastify({ logger: false });

  await app.register(sensible);

  await app.register(jwt, {
    secret: TEST_JWT_SECRET,
    sign: { expiresIn: '1h' },
  });

  // Inject mock DB
  await app.register(fp(async (a) => {
    a.decorate('db', db as unknown as Pool);
  }));

  // Inject authenticate decorator (uses JWT plugin already registered above)
  await app.register(fp(async (a) => {
    a.decorate('authenticate', async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });
  }));

  // Inject mock Planka client
  await app.register(fp(async (a) => {
    a.decorate('planka', planka);
  }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(orgRoutes, { prefix: '/org' });
  await app.register(hrRoutes, { prefix: '/hr' });
  await app.register(calendarRoutes, { prefix: '/calendar' });
  await app.register(webhookRoutes, { prefix: '/webhooks' });

  await app.ready();
  return { app, db, planka };
}

/** Sign a JWT with a known test payload */
export function signTestToken(
  app: FastifyInstance,
  payload: { memberId: string; lineUserId: string; orgIds: string[] },
) {
  return app.jwt.sign(payload);
}
