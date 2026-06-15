import { bff } from '../bffClient';

export async function createTaskTool({ title, due_date }: { title: string; due_date?: string }) {
  try {
    const boards = await bff<{ items: Array<{ id: string }> }>('GET', '/kanban/boards');
    if (!boards.items.length) return { content: [{ type: 'text' as const, text: 'ยังไม่มีบอร์ด — สร้างบอร์ดก่อนในแอป LINE' }] };

    const board = boards.items[0];
    const detail = await bff<{ included: { lists: Array<{ id: string; name: string; position: number }> } }>(
      'GET', `/kanban/boards/${board.id}`,
    );
    const firstList = detail.included.lists.sort((a, b) => a.position - b.position)[0];
    if (!firstList) return { content: [{ type: 'text' as const, text: 'ไม่มีคอลัมน์ในบอร์ด' }] };

    await bff('POST', `/kanban/lists/${firstList.id}/cards`, {
      name: title,
      dueDate: due_date ?? null,
    });

    return {
      content: [{
        type: 'text' as const,
        text: `✅ สร้างงาน "${title}" ในคอลัมน์ "${firstList.name}" เรียบร้อย${due_date ? ` ครบกำหนด ${new Date(due_date).toLocaleDateString('th-TH')}` : ''}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `เกิดข้อผิดพลาด: ${(err as Error).message}` }] };
  }
}
