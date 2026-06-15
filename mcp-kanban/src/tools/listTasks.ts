import { bff } from '../bffClient';

interface Card { id: string; name: string; dueDate?: string | null; listId: string }
interface List  { id: string; name: string }

export async function listTasksTool() {
  try {
    const boards = await bff<{ items: Array<{ id: string }> }>('GET', '/kanban/boards');
    if (!boards.items.length) return { content: [{ type: 'text' as const, text: 'ยังไม่มีบอร์ด' }] };

    const board = boards.items[0];
    const detail = await bff<{
      included: { cards: Card[]; lists: List[] }
    }>('GET', `/kanban/boards/${board.id}`);

    const listMap = new Map(detail.included.lists.map((l) => [l.id, l.name]));
    const lines = detail.included.cards.slice(0, 30).map((c) => {
      const col = listMap.get(c.listId) ?? '—';
      const due = c.dueDate ? `ครบกำหนด ${new Date(c.dueDate).toLocaleDateString('th-TH')}` : '';
      return `• ${c.name} | ${col}${due ? ' | ' + due : ''}`;
    });

    return {
      content: [{
        type: 'text' as const,
        text: lines.length ? lines.join('\n') : 'ไม่มีงานในขณะนี้',
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `เกิดข้อผิดพลาด: ${(err as Error).message}` }] };
  }
}
