import type { FastifyInstance } from 'fastify';
import { fetch } from 'undici';

interface PlankaCard {
  id: string;
  name: string;
  listId: string;
  dueDate?: string | null;
  memberIds?: string[];
}

export async function processCardDone(
  app: FastifyInstance,
  card: Record<string, unknown>,
  prevCard: Record<string, unknown>,
) {
  const c = card as unknown as PlankaCard;
  const completedAt = new Date();

  // Find the org whose done_list_id matches the new list
  const { rows: orgRows } = await app.db.query<{
    id: string; done_list_id: string; planka_project_id: string;
  }>(
    `SELECT id, done_list_id, planka_project_id FROM organizations WHERE done_list_id = $1`,
    [c.listId],
  );
  if (!orgRows[0]) return; // This column is not a "done" column in any org

  const org = orgRows[0];

  // Find BFF members assigned to this card
  const assignedPlankaIds = c.memberIds ?? [];
  if (assignedPlankaIds.length === 0) return;

  const { rows: memberRows } = await app.db.query<{ id: string; line_user_id: string; planka_user_id: string }>(
    `SELECT id, line_user_id, planka_user_id FROM members WHERE planka_user_id = ANY($1)`,
    [assignedPlankaIds],
  );

  for (const member of memberRows) {
    // Sum worklog hours for this card
    const { rows: wlRows } = await app.db.query<{ total: string }>(
      `SELECT COALESCE(SUM(hours),0) total FROM hr_worklog WHERE card_id = $1 AND member_id = $2`,
      [c.id, member.id],
    );
    const hoursSpent = parseFloat(wlRows[0].total);
    const onTime = c.dueDate ? completedAt <= new Date(c.dueDate) : null;
    const period = completedAt.toISOString().slice(0, 7);

    // Insert evaluation (UPSERT — idempotent on retries)
    await app.db.query(
      `INSERT INTO hr_evaluations
         (org_id, member_id, card_id, card_title, due_date, completed_at, on_time, hours_spent, period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (card_id, member_id) DO UPDATE
         SET completed_at = EXCLUDED.completed_at,
             on_time      = EXCLUDED.on_time,
             hours_spent  = EXCLUDED.hours_spent`,
      [org.id, member.id, c.id, c.name, c.dueDate ?? null, completedAt, onTime, hoursSpent, period],
    );

    // Push LINE notification
    await pushLineDoneMessage(member.line_user_id, c.name, hoursSpent, onTime, c.dueDate);
  }
}

async function pushLineDoneMessage(
  lineUserId: string,
  cardTitle: string,
  hours: number,
  onTime: boolean | null,
  dueDate?: string | null,
) {
  const token = process.env.LINE_MESSAGING_TOKEN;
  if (!token) return;

  const dueLine = dueDate
    ? `📅 ${onTime ? 'ทันกำหนด' : 'เกินกำหนด'}: ${new Date(dueDate).toLocaleDateString('th-TH')}`
    : '';

  const body = {
    to: lineUserId,
    messages: [{
      type: 'text',
      text: `✅ งานเสร็จแล้ว!\n"${cardTitle}"\n⏱ ใช้เวลา ${hours > 0 ? hours.toFixed(1) + ' ชม.' : '—'}${dueLine ? '\n' + dueLine : ''}`,
    }],
  };

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {}); // Best-effort
}
