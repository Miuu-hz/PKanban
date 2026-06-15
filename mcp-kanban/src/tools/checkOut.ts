import { bff } from '../bffClient';

export async function checkOutTool() {
  try {
    await bff('POST', '/hr/checkout', {});
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return { content: [{ type: 'text' as const, text: `✅ เช็คเอาท์เวลา ${now} เรียบร้อย` }] };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `${(err as Error).message}` }] };
  }
}
