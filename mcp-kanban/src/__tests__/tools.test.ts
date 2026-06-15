import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures variables are initialized before the hoisted vi.mock factory runs
const { mockBff, mockResolveCard } = vi.hoisted(() => ({
  mockBff: vi.fn(),
  mockResolveCard: vi.fn(),
}));
vi.mock('../bffClient', () => ({
  bff: mockBff,
  resolveCard: mockResolveCard,
}));

import { listTasksTool } from '../tools/listTasks';
import { createTaskTool } from '../tools/createTask';
import { moveTaskTool } from '../tools/moveTask';
import { checkInTool } from '../tools/checkIn';
import { checkOutTool } from '../tools/checkOut';
import { addWorklogTool } from '../tools/addWorklog';
import { getReportTool } from '../tools/getReport';

// Helper to extract text from tool result
function text(result: Awaited<ReturnType<typeof listTasksTool>>) {
  return result.content[0].text;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────
// list_my_tasks
// ─────────────────────────────────────────
describe('list_my_tasks', () => {
  it('returns bullet list of cards', async () => {
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1', projectId: 'p1' }] }); // boards
    mockBff.mockResolvedValueOnce({
      included: {
        lists:  [{ id: 'l1', name: 'กำลังทำ' }, { id: 'l2', name: 'เสร็จแล้ว' }],
        cards: [
          { id: 'c1', name: 'งานทดสอบ', listId: 'l1', dueDate: '2026-07-01T00:00:00Z' },
          { id: 'c2', name: 'งานอื่น', listId: 'l2', dueDate: null },
        ],
      },
    });

    const result = await listTasksTool();
    const t = text(result);
    expect(t).toContain('• งานทดสอบ | กำลังทำ');
    expect(t).toContain('• งานอื่น | เสร็จแล้ว');
  });

  it('returns "ไม่มีงาน" when no boards', async () => {
    mockBff.mockResolvedValueOnce({ items: [] });
    const result = await listTasksTool();
    expect(text(result)).toContain('ยังไม่มีบอร์ด');
  });

  it('returns "ไม่มีงาน" when board has no cards', async () => {
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] });
    mockBff.mockResolvedValueOnce({ included: { lists: [], cards: [] } });
    const result = await listTasksTool();
    expect(text(result)).toContain('ไม่มีงานในขณะนี้');
  });

  it('handles API error gracefully', async () => {
    mockBff.mockRejectedValueOnce(new Error('Network error'));
    const result = await listTasksTool();
    expect(text(result)).toContain('เกิดข้อผิดพลาด');
  });

  it('includes due date in Thai format when present', async () => {
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] });
    mockBff.mockResolvedValueOnce({
      included: {
        lists:  [{ id: 'l1', name: 'To Do' }],
        cards: [{ id: 'c1', name: 'งาน', listId: 'l1', dueDate: '2026-07-15T00:00:00Z' }],
      },
    });
    const result = await listTasksTool();
    expect(text(result)).toContain('ครบกำหนด');
  });
});

// ─────────────────────────────────────────
// create_task
// ─────────────────────────────────────────
describe('create_task', () => {
  it('creates task and returns success message', async () => {
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] }); // boards
    mockBff.mockResolvedValueOnce({
      included: { lists: [{ id: 'l1', name: 'To Do', position: 0 }] },
    });
    mockBff.mockResolvedValueOnce({ item: { id: 'new-card', name: 'งานใหม่' } });

    const result = await createTaskTool({ title: 'งานใหม่' });
    expect(text(result)).toContain('✅');
    expect(text(result)).toContain('งานใหม่');
    expect(text(result)).toContain('To Do');
  });

  it('includes due date in confirmation message', async () => {
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] });
    mockBff.mockResolvedValueOnce({ included: { lists: [{ id: 'l1', name: 'Backlog', position: 0 }] } });
    mockBff.mockResolvedValueOnce({ item: {} });

    const result = await createTaskTool({ title: 'งาน', due_date: '2026-07-01' });
    expect(text(result)).toContain('ครบกำหนด');
  });

  it('returns error when no boards exist', async () => {
    mockBff.mockResolvedValueOnce({ items: [] });
    const result = await createTaskTool({ title: 'งาน' });
    expect(text(result)).toContain('สร้างบอร์ดก่อน');
  });

  it('passes correct cardId to Planka', async () => {
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] });
    mockBff.mockResolvedValueOnce({ included: { lists: [{ id: 'list-1', name: 'T', position: 0 }] } });
    mockBff.mockResolvedValueOnce({ item: {} });

    await createTaskTool({ title: 'ทดสอบ', due_date: '2026-08-01' });

    const lastCall = mockBff.mock.calls[2];
    expect(lastCall[1]).toBe('/kanban/lists/list-1/cards');
    expect(lastCall[2]).toMatchObject({ name: 'ทดสอบ', dueDate: '2026-08-01' });
  });
});

// ─────────────────────────────────────────
// move_task
// ─────────────────────────────────────────
describe('move_task', () => {
  it('moves card to matching column', async () => {
    mockResolveCard.mockResolvedValueOnce({ id: 'card-1', name: 'งานทดสอบ', listId: 'l1' });
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] });
    mockBff.mockResolvedValueOnce({
      included: { lists: [{ id: 'l2', name: 'กำลังทำ' }, { id: 'l3', name: 'เสร็จแล้ว' }] },
    });
    mockBff.mockResolvedValueOnce({ item: {} });

    const result = await moveTaskTool({ task_name: 'งานทดสอบ', column_name: 'กำลังทำ' });
    expect(text(result)).toContain('✅');
    expect(text(result)).toContain('งานทดสอบ');
    expect(text(result)).toContain('กำลังทำ');
  });

  it('returns column list when column not found', async () => {
    mockResolveCard.mockResolvedValueOnce({ id: 'c1', name: 'งาน', listId: 'l1' });
    mockBff.mockResolvedValueOnce({ items: [{ id: 'b1' }] });
    mockBff.mockResolvedValueOnce({
      included: { lists: [{ id: 'l1', name: 'To Do' }, { id: 'l2', name: 'Done' }] },
    });

    const result = await moveTaskTool({ task_name: 'งาน', column_name: 'nonexistent' });
    expect(text(result)).toContain('คอลัมน์ที่มี');
    expect(text(result)).toContain('To Do');
  });

  it('propagates fuzzy match error (multiple matches)', async () => {
    mockResolveCard.mockRejectedValueOnce(new Error('พบหลายงาน — ระบุชื่อให้ชัดขึ้น:\n1) งาน A\n2) งาน AB'));
    const result = await moveTaskTool({ task_name: 'งาน', column_name: 'done' });
    expect(text(result)).toContain('พบหลายงาน');
  });
});

// ─────────────────────────────────────────
// check_in / check_out
// ─────────────────────────────────────────
describe('check_in', () => {
  it('returns success message with Thai time', async () => {
    mockBff.mockResolvedValueOnce({});
    const result = await checkInTool();
    expect(text(result)).toContain('✅');
    expect(text(result)).toContain('เช็คอิน');
  });

  it('returns error message on API failure', async () => {
    mockBff.mockRejectedValueOnce(new Error('ยังไม่ได้เช็คเอาท์'));
    const result = await checkInTool();
    expect(text(result)).toContain('ยังไม่ได้เช็คเอาท์');
  });
});

describe('check_out', () => {
  it('returns success message with Thai time', async () => {
    mockBff.mockResolvedValueOnce({});
    const result = await checkOutTool();
    expect(text(result)).toContain('✅');
    expect(text(result)).toContain('เช็คเอาท์');
  });

  it('returns error on failure', async () => {
    mockBff.mockRejectedValueOnce(new Error('ยังไม่เช็คอิน'));
    const result = await checkOutTool();
    expect(text(result)).toContain('ยังไม่เช็คอิน');
  });
});

// ─────────────────────────────────────────
// add_worklog
// ─────────────────────────────────────────
describe('add_worklog', () => {
  it('logs hours and returns confirmation', async () => {
    mockResolveCard.mockResolvedValueOnce({ id: 'c1', name: 'งานทดสอบ', listId: 'l1' });
    mockBff.mockResolvedValueOnce({});

    const result = await addWorklogTool({ task_name: 'งานทดสอบ', hours: 3.5, note: 'ทำรายงาน' });
    expect(text(result)).toContain('✅');
    expect(text(result)).toContain('3.5');
    expect(text(result)).toContain('งานทดสอบ');
    expect(text(result)).toContain('ทำรายงาน');
  });

  it('works without note', async () => {
    mockResolveCard.mockResolvedValueOnce({ id: 'c1', name: 'งาน', listId: 'l1' });
    mockBff.mockResolvedValueOnce({});

    const result = await addWorklogTool({ task_name: 'งาน', hours: 1 });
    expect(text(result)).toContain('✅');
    expect(text(result)).not.toContain('undefined');
  });

  it('passes cardId correctly to BFF', async () => {
    mockResolveCard.mockResolvedValueOnce({ id: 'card-xyz', name: 'งาน', listId: 'l1' });
    mockBff.mockResolvedValueOnce({});

    await addWorklogTool({ task_name: 'งาน', hours: 2 });
    const [, , body] = mockBff.mock.calls[0];
    expect((body as Record<string, unknown>).cardId).toBe('card-xyz');
    expect((body as Record<string, unknown>).hours).toBe(2);
  });

  it('returns error when task not found', async () => {
    mockResolveCard.mockRejectedValueOnce(new Error('ไม่พบงานที่ชื่อ "xxx"'));
    const result = await addWorklogTool({ task_name: 'xxx', hours: 1 });
    expect(text(result)).toContain('ไม่พบงาน');
  });
});

// ─────────────────────────────────────────
// get_report
// ─────────────────────────────────────────
describe('get_report', () => {
  const REPORT = {
    period: '2026-06',
    tasksCompleted: 12,
    onTimeRate: 83,
    totalHours: 96,
    attendanceDays: 22,
    leaveDays: 0,
    summary: 'เดือน 2026-06: งานเสร็จ 12 ชิ้น (ทันกำหนด 10 ชิ้น), รวม 96 ชม., เข้างาน 22 วัน',
  };

  it('returns report summary text', async () => {
    mockBff.mockResolvedValueOnce(REPORT);
    const result = await getReportTool({ month: '2026-06' });
    expect(text(result)).toContain('เดือน 2026-06');
    expect(text(result)).toContain('12 ชิ้น');
  });

  it('uses current month when no month param', async () => {
    mockBff.mockResolvedValueOnce(REPORT);
    await getReportTool({});
    const [, url] = mockBff.mock.calls[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(url).toContain(currentMonth);
  });

  it('handles API error gracefully', async () => {
    mockBff.mockRejectedValueOnce(new Error('Unauthorized'));
    const result = await getReportTool({ month: '2026-05' });
    expect(text(result)).toContain('เกิดข้อผิดพลาด');
  });
});
