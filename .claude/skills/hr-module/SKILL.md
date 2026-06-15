---
name: hr-module
description: Implement or extend miniHR features — GPS check-in/out, worklog, auto-evaluation from Planka webhooks, leave requests, monthly reports. Use when the user asks about HR features, attendance, or performance evaluation.
---

# miniHR Module

## Context
- Spec: `extension_blueprint.md` Module 3 (schema, endpoints, webhook logic, GPS anti-spoof)
- Lives inside the BFF service (`bff/src/routes/hr.ts` + `bff/src/services/evaluation.ts`)
- Tables: `hr_checkins`, `hr_worklog`, `hr_evaluations`, `hr_leave` — exact SQL in blueprint section 3.2

## Feature map

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Check-in/out | `POST /bff/hr/checkin`, `/checkout` | GPS haversine check vs org office location |
| Today status | `GET /bff/hr/today` | Drives the big button state in LIFF |
| Worklog | `POST /bff/hr/worklog` | Links to Planka card via `card_id` |
| Auto-eval | webhook-driven | See below |
| Leave | `POST/GET/PATCH /bff/hr/leave` | PATCH approve/reject is admin-only |
| Report | `GET /bff/hr/report?period=YYYY-MM` | Aggregates all of the above |

## Auto-evaluation pipeline (the core differentiator)
1. Planka webhook `card:update` arrives at `POST /bff/webhooks`
2. Detect "moved to Done": `event.data.card.listId === doneListId && prevCard.listId !== doneListId`
   - `doneListId` per org: store in `organizations` table as `done_list_id` (admin picks the column in org settings — do NOT hardcode by column name)
3. Insert `hr_evaluations`: `on_time = completed_at <= due_date`, `hours_spent = SUM(hr_worklog.hours WHERE card_id)`
4. Push LINE message to assignee via Messaging API (Flex Message: card title, hours, on-time status)
5. Idempotency: unique index on `(card_id, member_id)` — webhook retries must not double-insert

## Business rules
- Check-in twice without checkout → reject with friendly message, suggest checkout first
- Forgot checkout → daily cron (in BFF) at 23:00 Asia/Bangkok sends LINE reminder; auto-close at midnight with `note='auto-closed'`
- GPS spoof guard: reject if `accuracy > 100m` or distance > `office_radius_m` (skip when `org.allow_remote = true`)
- Leave overlapping an existing approved leave → reject
- All timestamps stored UTC (`TIMESTAMPTZ`), displayed in `Asia/Bangkok`

## Report metrics (period = month)
- Tasks completed, on-time rate (%), total worklog hours
- Attendance days, late count (check-in after org-configured start time), leave days by type
- Return both JSON (for LIFF charts) and a Thai-language summary string (for LINE push / MCP `get_report` tool)
