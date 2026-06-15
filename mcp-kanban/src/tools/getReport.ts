import { bff } from '../bffClient';

interface Report {
  period: string;
  tasksCompleted: number;
  onTimeRate: number | null;
  totalHours: number;
  attendanceDays: number;
  leaveDays: number;
  summary: string;
}

export async function getReportTool({ month }: { month?: string }) {
  try {
    const period = month ?? new Date().toISOString().slice(0, 7);
    const report = await bff<Report>('GET', `/hr/report?period=${period}`);
    return { content: [{ type: 'text' as const, text: report.summary }] };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `เกิดข้อผิดพลาด: ${(err as Error).message}` }] };
  }
}
