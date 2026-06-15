import { bff } from '../bffClient';

export async function checkInTool() {
  try {
    await bff('POST', '/hr/checkin', {});
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return { content: [{ type: 'text' as const, text: `✅ เช็คอินเวลา ${now} เรียบร้อย` }] };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `${(err as Error).message}` }] };
  }
}
