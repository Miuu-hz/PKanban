// RFC 5545 iCal feed generator
// Escape per spec: backslash, comma, semicolon, newlines

function escIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    parts.push(bytes.slice(offset, offset + 75).toString('utf8'));
    offset += 75;
  }
  return parts.join('\r\n ');
}

function toIcalDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

interface CardInfo {
  id: string;
  name: string;
  dueDate: string;
  boardName: string;
  listName: string;
}

export function generateIcal(
  calName: string,
  cards: CardInfo[],
  userId: string,
  domain: string,
): string {
  const now = toIcalDate(new Date().toISOString());

  const events = cards.map((card) => {
    const dtStart = toIcalDate(card.dueDate);
    const dtEnd = toIcalDate(new Date(new Date(card.dueDate).getTime() + 3600_000).toISOString());
    const url = `https://liff.line.me/${process.env.LIFF_ID ?? ''}?card=${card.id}`;
    return [
      'BEGIN:VEVENT',
      foldLine(`UID:${card.id}@${domain}`),
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      foldLine(`SUMMARY:${escIcal(card.name)}`),
      foldLine(`DESCRIPTION:${escIcal(`Board: ${card.boardName} | Column: ${card.listName}`)}`),
      foldLine(`URL:${url}`),
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//KanbanApp//${domain}//TH`,
    `X-WR-CALNAME:${escIcal(`งาน Kanban — ${calName}`)}`,
    'X-WR-TIMEZONE:Asia/Bangkok',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}
