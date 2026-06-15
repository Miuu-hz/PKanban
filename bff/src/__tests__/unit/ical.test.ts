import { describe, it, expect } from 'vitest';
import { generateIcal } from '../../services/ical';

const DOMAIN = 'test.example.com';

function sampleCards() {
  return [
    {
      id: 'card-abc-123',
      name: 'ทำรายงานประจำเดือน',
      dueDate: '2026-07-01T17:00:00.000Z',
      boardName: 'บอร์ดทีม',
      listName: 'กำลังทำ',
    },
  ];
}

describe('generateIcal', () => {
  it('returns RFC 5545 wrapper lines', () => {
    const output = generateIcal('TestUser', [], 'user-1', DOMAIN);
    expect(output).toContain('BEGIN:VCALENDAR');
    expect(output).toContain('END:VCALENDAR');
    expect(output).toContain('VERSION:2.0');
    expect(output).toContain('CALSCALE:GREGORIAN');
  });

  it('includes VEVENT for each card', () => {
    const output = generateIcal('TestUser', sampleCards(), 'user-1', DOMAIN);
    expect(output).toContain('BEGIN:VEVENT');
    expect(output).toContain('END:VEVENT');
  });

  it('sets stable UID from card id and domain', () => {
    const output = generateIcal('TestUser', sampleCards(), 'user-1', DOMAIN);
    expect(output).toContain(`UID:card-abc-123@${DOMAIN}`);
  });

  it('includes Thai card title in SUMMARY', () => {
    const output = generateIcal('TestUser', sampleCards(), 'user-1', DOMAIN);
    expect(output).toContain('SUMMARY:ทำรายงานประจำเดือน');
  });

  it('includes board and list in DESCRIPTION', () => {
    const output = generateIcal('TestUser', sampleCards(), 'user-1', DOMAIN);
    expect(output).toContain('Board: บอร์ดทีม | Column: กำลังทำ');
  });

  it('uses X-WR-CALNAME with user name', () => {
    const output = generateIcal('สมชาย', [], 'user-1', DOMAIN);
    expect(output).toContain('X-WR-CALNAME:งาน Kanban — สมชาย');
  });

  it('generates DTSTART from dueDate', () => {
    const output = generateIcal('TestUser', sampleCards(), 'user-1', DOMAIN);
    // 2026-07-01T17:00:00Z → 20260701T170000Z
    expect(output).toContain('DTSTART:20260701T170000Z');
  });

  it('DTEND is 1 hour after DTSTART', () => {
    const output = generateIcal('TestUser', sampleCards(), 'user-1', DOMAIN);
    expect(output).toContain('DTEND:20260701T180000Z');
  });

  it('escapes commas in card title', () => {
    const cards = [{ ...sampleCards()[0], name: 'งาน, ประชุม, รีวิว' }];
    const output = generateIcal('TestUser', cards, 'user-1', DOMAIN);
    expect(output).toContain('SUMMARY:งาน\\, ประชุม\\, รีวิว');
  });

  it('escapes semicolons in description', () => {
    const cards = [{ ...sampleCards()[0], boardName: 'Board; A', listName: 'List' }];
    const output = generateIcal('TestUser', cards, 'user-1', DOMAIN);
    expect(output).toContain('Board\\; A');
  });

  it('handles empty card list gracefully', () => {
    const output = generateIcal('TestUser', [], 'user-1', DOMAIN);
    expect(output).not.toContain('BEGIN:VEVENT');
    expect(output).toContain('BEGIN:VCALENDAR');
    expect(output).toContain('END:VCALENDAR');
  });

  it('renders each card as a separate VEVENT', () => {
    const cards = [
      { ...sampleCards()[0], id: 'c1', name: 'งาน 1' },
      { ...sampleCards()[0], id: 'c2', name: 'งาน 2' },
    ];
    const output = generateIcal('TestUser', cards, 'user-1', DOMAIN);
    const count = (output.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(count).toBe(2);
  });

  it('uses CRLF line endings per RFC 5545', () => {
    const output = generateIcal('TestUser', [], 'user-1', DOMAIN);
    expect(output).toMatch(/\r\n/);
  });
});
