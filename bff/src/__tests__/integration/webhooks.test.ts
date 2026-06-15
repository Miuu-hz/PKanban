import { describe, it, expect, vi } from 'vitest';

// vi.hoisted ensures the variable is initialized before vi.mock's hoisted factory runs
const mockProcessCardDone = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../services/evaluation', () => ({
  processCardDone: mockProcessCardDone,
}));

import { buildTestApp } from '../helpers/buildApp';

describe('POST /webhooks', () => {
  it('returns 200 for any event', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({
      method: 'POST', url: '/webhooks',
      payload: { name: 'someEvent', data: {} },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('triggers processCardDone when card moves to a different list', async () => {
    const { app } = await buildTestApp();

    const payload = {
      name: 'cardUpdate',
      data: {
        card: { id: 'card-1', name: 'งานทดสอบ', listId: 'done-list-id', dueDate: null, memberIds: ['pu-1'] },
        prevCard: { id: 'card-1', listId: 'todo-list-id' },
      },
    };

    await app.inject({ method: 'POST', url: '/webhooks', payload });
    expect(mockProcessCardDone).toHaveBeenCalledOnce();
  });

  it('does NOT trigger processCardDone when listId is unchanged', async () => {
    const { app } = await buildTestApp();

    const payload = {
      name: 'cardUpdate',
      data: {
        card:     { id: 'card-1', listId: 'same-list', dueDate: null, memberIds: [] },
        prevCard: { id: 'card-1', listId: 'same-list' }, // same list!
      },
    };

    await app.inject({ method: 'POST', url: '/webhooks', payload });
    expect(mockProcessCardDone).not.toHaveBeenCalled();
  });

  it('does NOT trigger evaluation for non-card events', async () => {
    const { app } = await buildTestApp();

    await app.inject({
      method: 'POST', url: '/webhooks',
      payload: { name: 'boardUpdate', data: { board: { id: 'b1' } } },
    });
    expect(mockProcessCardDone).not.toHaveBeenCalled();
  });

  it('returns 200 even when evaluation throws (fire-and-forget)', async () => {
    const { app } = await buildTestApp();
    mockProcessCardDone.mockRejectedValueOnce(new Error('DB error'));

    const payload = {
      name: 'cardUpdate',
      data: {
        card:     { id: 'c1', listId: 'list-b', dueDate: null, memberIds: [] },
        prevCard: { id: 'c1', listId: 'list-a' },
      },
    };

    const res = await app.inject({ method: 'POST', url: '/webhooks', payload });
    expect(res.statusCode).toBe(200); // must not propagate the error
  });

  it('handles empty body gracefully', async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/webhooks', payload: {} });
    expect(res.statusCode).toBe(200);
  });
});
