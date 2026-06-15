import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { dbPlugin } from './plugins/db';
import { authPlugin } from './plugins/auth';
import { plankaPlugin } from './plugins/planka';
import { authRoutes } from './routes/auth';
import { kanbanRoutes } from './routes/kanban';
import { orgRoutes } from './routes/org';
import { hrRoutes } from './routes/hr';
import { calendarRoutes } from './routes/calendar';
import { webhookRoutes } from './routes/webhooks';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  trustProxy: true,
});

async function start() {
  await app.register(sensible);
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(plankaPlugin);

  await app.register(authRoutes,     { prefix: '/auth' });
  await app.register(kanbanRoutes,   { prefix: '/kanban' });
  await app.register(orgRoutes,      { prefix: '/org' });
  await app.register(hrRoutes,       { prefix: '/hr' });
  await app.register(calendarRoutes, { prefix: '/calendar' });
  await app.register(webhookRoutes,  { prefix: '/webhooks' });

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
