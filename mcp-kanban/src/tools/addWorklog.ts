import { bff, resolveCard } from '../bffClient';

export async function addWorklogTool({ task_name, hours, note }: { task_name: string; hours: number; note?: string }) {
  try {
    const card = await resolveCard(task_name);
    await bff('POST', '/hr/worklog', { cardId: card.id, hours, note });
    return {
      content: [{
        type: 'text' as const,
        text: `✅ บันทึก ${hours} ชม. สำหรับ "${card.name}"${note ? ` (${note})` : ''}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `${(err as Error).message}` }] };
  }
}
