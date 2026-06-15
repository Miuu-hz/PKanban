import { fetch } from 'undici';

const BASE = process.env.BFF_BASE_URL ?? 'http://localhost:3000';
const TOKEN = process.env.BFF_TOKEN ?? '';

export async function bff<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BFF ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Fuzzy-match a task name → return best-matching card ID
export async function resolveCard(taskName: string): Promise<{ id: string; name: string; listId: string }> {
  const boards = await bff<{ items: Array<{ id: string; projectId: string }> }>('GET', '/kanban/boards');
  // Search across all boards (grab first board for simplicity; extend if needed)
  const board = boards.items[0];
  if (!board) throw new Error('ไม่พบบอร์ด — กรุณาสร้างองค์กรและบอร์ดก่อน');

  const detail = await bff<{ included: { cards: Array<{ id: string; name: string; listId: string }> } }>(
    'GET', `/kanban/boards/${board.id}`,
  );
  const lower = taskName.toLowerCase();
  const matches = detail.included.cards.filter((c) => c.name.toLowerCase().includes(lower));
  if (matches.length === 0) throw new Error(`ไม่พบงานที่ชื่อ "${taskName}"`);
  if (matches.length > 1) {
    const list = matches.map((m, i) => `${i + 1}) ${m.name}`).join('\n');
    throw new Error(`พบหลายงาน — ระบุชื่อให้ชัดขึ้น:\n${list}`);
  }
  return matches[0];
}
