import { bff, resolveCard } from '../bffClient';

export async function moveTaskTool({ task_name, column_name }: { task_name: string; column_name: string }) {
  try {
    const card = await resolveCard(task_name);

    // Find target list by fuzzy name match
    const boards = await bff<{ items: Array<{ id: string }> }>('GET', '/kanban/boards');
    const detail = await bff<{ included: { lists: Array<{ id: string; name: string }> } }>(
      'GET', `/kanban/boards/${boards.items[0].id}`,
    );
    const lower = column_name.toLowerCase();
    const target = detail.included.lists.find((l) => l.name.toLowerCase().includes(lower));
    if (!target) {
      const available = detail.included.lists.map((l) => l.name).join(', ');
      return { content: [{ type: 'text' as const, text: `ไม่พบคอลัมน์ "${column_name}" — คอลัมน์ที่มี: ${available}` }] };
    }

    await bff('PATCH', `/kanban/cards/${card.id}`, { listId: target.id });

    return {
      content: [{
        type: 'text' as const,
        text: `✅ ย้าย "${card.name}" ไปยังคอลัมน์ "${target.name}" เรียบร้อย`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `${(err as Error).message}` }] };
  }
}
