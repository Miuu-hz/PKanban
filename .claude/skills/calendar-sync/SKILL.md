---
name: calendar-sync
description: Implement calendar integration — personal iCal (.ics) feed from card due dates (Phase 1) and optional Google Calendar OAuth two-way sync (Phase 2). Use when the user asks about calendar, Google Calendar, or .ics feeds.
---

# Calendar Sync Module

## Context
- Spec: `extension_blueprint.md` Module 4
- **Default to Phase 1 (iCal feed)** — no OAuth, works with Google Calendar AND device calendars (iOS/Android). Only build Phase 2 (Google OAuth two-way sync) if the user explicitly asks for editing-in-Google-syncs-back behavior.

## Phase 1: iCal feed (in BFF: `routes/calendar.ts` + `services/ical.ts`)

### Endpoint
`GET /bff/calendar/:userId/feed.ics?token=<ical_token>`
- Auth by per-user secret token (`members.ical_token`, `crypto.randomBytes(24).toString('hex')`) — NOT by JWT, because calendar apps can't send headers
- User can regenerate the token from LIFF settings to revoke a leaked URL

### Feed content
- Source: all Planka cards assigned to the user with `dueDate != null` and not completed
- RFC 5545 essentials: stable `UID:{cardId}@yourdomain`, `DTSTAMP`, `SUMMARY` = card title, `DESCRIPTION` = board + column, `URL` = LIFF deep link to the card
- All-day vs timed: if due date has 00:00 time, emit `DTSTART;VALUE=DATE` (all-day); else UTC datetime + 1h duration
- Headers: `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: max-age=300`
- Escape per RFC 5545: commas, semicolons, newlines in SUMMARY/DESCRIPTION (`\\,` `\\;` `\\n`) — Thai text is fine as UTF-8
- Line folding at 75 octets (use an ical library, e.g. `ics` npm package, instead of hand-rolling)

### LIFF settings screen
Show the personal URL + copy button + Thai instructions:
- Google Calendar: Settings → Add calendar → From URL
- iPhone: Settings → Calendar → Accounts → Add Subscribed Calendar
Note honestly: Google refreshes subscribed calendars every ~12–24 h (not real-time).

## Phase 2: Google Calendar OAuth (only on explicit request)
- Scope: `https://www.googleapis.com/auth/calendar.events` (events only — never full `calendar` scope)
- Tokens in `google_tokens` table; refresh flow handled server-side in BFF
- Planka webhook (card due date change) → `events.patch`; Google push channel → `/bff/webhooks/google-calendar`
- Conflict rule: last-write-wins, **Planka is source of truth**
- Requires Google Cloud project + OAuth consent screen verification — warn the user this adds external review time, similar to LINE review

## Testing
- Validate feed: paste output into https://icalendar.org/validator.html
- Subscribe in a real Google Calendar account and confirm events render with Thai titles intact
