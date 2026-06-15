import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listTasksTool } from './tools/listTasks';
import { createTaskTool } from './tools/createTask';
import { moveTaskTool } from './tools/moveTask';
import { checkInTool } from './tools/checkIn';
import { checkOutTool } from './tools/checkOut';
import { addWorklogTool } from './tools/addWorklog';
import { getReportTool } from './tools/getReport';

const server = new McpServer({
  name: 'kanban',
  version: '1.0.0',
});

// 1. list_my_tasks
server.tool('list_my_tasks', 'แสดงรายการงานของฉันทั้งหมด', {}, listTasksTool);

// 2. create_task
server.tool('create_task', 'สร้างงานใหม่', {
  title: z.string().describe('ชื่องาน'),
  due_date: z.string().optional().describe('วันกำหนดส่ง เช่น 2026-07-01'),
}, createTaskTool);

// 3. move_task
server.tool('move_task', 'ย้ายงานไปยังคอลัมน์ที่ระบุ', {
  task_name: z.string().describe('ชื่องาน (ค้นหาแบบ fuzzy)'),
  column_name: z.string().describe('ชื่อคอลัมน์ปลายทาง เช่น กำลังทำ, เสร็จแล้ว'),
}, moveTaskTool);

// 4. check_in
server.tool('check_in', 'บันทึกเวลาเข้างาน', {}, checkInTool);

// 5. check_out
server.tool('check_out', 'บันทึกเวลาออกงาน', {}, checkOutTool);

// 6. add_worklog
server.tool('add_worklog', 'บันทึกชั่วโมงทำงานสำหรับงานที่ระบุ', {
  task_name: z.string().describe('ชื่องาน'),
  hours: z.number().describe('จำนวนชั่วโมง'),
  note: z.string().optional().describe('หมายเหตุ'),
}, addWorklogTool);

// 7. get_report
server.tool('get_report', 'ดูสรุปผลงานประจำเดือน', {
  month: z.string().optional().describe('เช่น 2026-06 (ค่าเริ่มต้น: เดือนปัจจุบัน)'),
}, getReportTool);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('MCP Kanban server started\n');
}

main().catch((err) => { process.stderr.write(`Fatal: ${err}\n`); process.exit(1); });
