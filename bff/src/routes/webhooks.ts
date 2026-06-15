import type { FastifyInstance } from 'fastify';
import { processCardDone } from '../services/evaluation';

export async function webhookRoutes(app: FastifyInstance) {
  // POST /webhooks — receives Planka webhook events
  app.post<{ Body: Record<string, unknown> }>('/', async (req, reply) => {
    const event = req.body;
    const eventName = event.name as string | undefined;

    app.log.debug({ eventName }, 'Planka webhook received');

    // Card moved to done column
    if (eventName === 'cardUpdate' || eventName === 'card:update') {
      const card = (event.data as Record<string, unknown>)?.card as Record<string, unknown> | undefined;
      const prevCard = (event.data as Record<string, unknown>)?.prevCard as Record<string, unknown> | undefined;
      if (card && prevCard && card['listId'] !== prevCard['listId']) {
        await processCardDone(app, card, prevCard).catch((err) =>
          app.log.error({ err }, 'evaluation error'),
        );
      }
    }

    return reply.code(200).send({ ok: true });
  });
}
