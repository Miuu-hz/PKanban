# Extension Blueprint: SME Platform Modules
## Membership · miniHR · Google Calendar · MCP Automation

**Version:** 1.0.0
**Date:** June 2026
**Prerequisite:** `final_blueprint.md` (Kanban core + BFF auth) must be completed first.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  LINE Mini App (LIFF)  /  MCP Client (local LLM)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + Bearer JWT (BFF token)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BFF Service  (Fastify/Node or FastAPI/Python)                  │
│                                                                 │
│  Routes:                                                        │
│   /bff/auth/*       — LINE Login → BFF JWT                      │
│   /bff/kanban/*     — proxy to Planka REST API                  │
│   /bff/org/*        — SME membership & roles                    │
│   /bff/hr/*         — check-in/out, worklog, leave, evaluation  │
│   /bff/calendar/*   — iCal feed generation                      │
│   /bff/mcp/*        — MCP tool endpoints                        │
│   /bff/webhooks     — receives Planka webhook events            │
└────────────┬──────────────────────┬────────────────────────────┘
             │                      │
             ▼                      ▼
    ┌────────────────┐     ┌─────────────────┐
    │  Planka        │     │  PostgreSQL 16   │
    │  (Kanban API)  │     │  (shared DB)     │
    │  :1337         │     │  Tables:         │
    └────────────────┘     │  - org/members   │
                           │  - hr_checkins   │
                           │  - hr_worklog    │
                           │  - hr_leave      │
                           │  - hr_evaluation │
                           └─────────────────┘
```

**RAM budget:** Planka 512 MB + BFF 128 MB + PostgreSQL 256 MB + Redis 64 MB + Nginx 64 MB = **~1.0 GB** (fits 2 GB VPS)

---

# Module 1: BFF Service

## 1.1 Technology Choice

| Option | Pros | Cons |
|--------|------|------|
| **Node + Fastify** (recommended) | Same ecosystem as Planka/React, low overhead, fast HTTP proxy | Less ML-friendly |
| Python + FastAPI | Better for ML/LLM integrations | Extra runtime to manage |

Recommendation: **Node + Fastify** since the rest of the stack is Node-based. Switch to FastAPI only if you plan to embed local LLM inference in the BFF itself.

## 1.2 BFF LXC Deployment

The BFF runs on its own LXC container (`kanban-bff`) behind the Nginx proxy LXC.

### Environment (`/opt/kanban/bff/.env`)

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://planka:${POSTGRES_PASSWORD}@10.0.10.10:5432/planka
PLANKA_BASE_URL=http://10.0.10.11:1337
PLANKA_ADMIN_EMAIL=${DEFAULT_ADMIN_EMAIL}
PLANKA_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}
JWT_SECRET=${BFF_JWT_SECRET}
JWT_EXPIRES_IN=7d
LINE_CHANNEL_ID=${LINE_CHANNEL_ID}
LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
LINE_MESSAGING_TOKEN=${LINE_MESSAGING_TOKEN}
ICAL_SECRET=${ICAL_SECRET}
APP_DOMAIN=${APP_DOMAIN}
LIFF_ID=${VITE_LIFF_ID}
```

### Deploy Steps

```bash
# On kanban-bff LXC
cd /opt/kanban/bff
npm ci
npm run build
npm run migrate
systemctl enable --now kanban-bff
```

### Nginx upstream

```nginx
location /bff/ {
  proxy_pass http://10.0.10.12:3000/;
  proxy_set_header Authorization $http_authorization;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

See `infrastructure/proxmox-lxc-deployment.md` for the full guide.

## 1.3 Auth Flow (corrected from base blueprint)

```
LIFF App
  │  liff.init() → idToken
  ▼
POST /bff/auth/line  { idToken }
  │  BFF verifies idToken with LINE JWK (https://access.line.me/oauth2/v2.1/certs)
  │  BFF finds or creates Planka user via Planka local API
  │  BFF issues its own JWT (userId, orgId, role)
  ▼
{ accessToken, refreshToken, user: { id, lineId, name, orgId, role } }
  │
  ▼  (stored in localStorage as 'app_auth')
All subsequent requests → Authorization: Bearer <BFF accessToken>
BFF validates → proxies to Planka with Planka admin token internally
```

## 1.4 Key BFF Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bff/auth/line` | Exchange LINE idToken for BFF JWT |
| POST | `/bff/auth/refresh` | Refresh BFF access token |
| DELETE | `/bff/auth/logout` | Invalidate session |
| GET | `/bff/kanban/*` | Proxy to Planka (all Kanban CRUD) |
| — | `/bff/org/*` | See Module 2 |
| — | `/bff/hr/*` | See Module 3 |
| GET | `/bff/calendar/:userId/feed.ics` | See Module 4 |
| POST | `/bff/webhooks` | Planka event receiver |

---

# Module 2: SME Membership System

## 2.1 Concept

One LINE user can belong to one or more **organizations**. Each org maps to one Planka project. The BFF enforces org-level access control — Planka only sees admin-level API calls.

## 2.2 Database Schema

```sql
-- Organizations (one per SME business)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50)  UNIQUE NOT NULL,
  owner_id    UUID REFERENCES members(id),
  plan        VARCHAR(20)  DEFAULT 'free',  -- free / starter / pro
  planka_project_id VARCHAR(50),             -- linked Planka project ID
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Members (LINE users + org membership)
CREATE TABLE members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  picture_url  TEXT,
  email        VARCHAR(150),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Org membership + roles
CREATE TABLE org_members (
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
  role        VARCHAR(20) DEFAULT 'member', -- owner / admin / member / viewer
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, member_id)
);
```

## 2.3 API Endpoints

| Method | Path | Role required | Description |
|--------|------|--------------|-------------|
| POST | `/bff/org` | any | Create new organization |
| GET | `/bff/org/:orgId` | member+ | Get org details |
| GET | `/bff/org/:orgId/members` | member+ | List members |
| POST | `/bff/org/:orgId/invite` | admin+ | Invite by LINE userId or email |
| PATCH | `/bff/org/:orgId/members/:memberId` | admin+ | Change role |
| DELETE | `/bff/org/:orgId/members/:memberId` | admin+ | Remove member |

## 2.4 Invite Flow (LINE-native)

```
Admin taps "Invite" in LIFF
  │
  ▼
liff.shareTargetPicker() → user picks LINE friends/groups
  │  Sends Flex Message with deep-link:
  │  https://liff.line.me/{LIFF_ID}?invite={token}
  ▼
Invited user opens link → LIFF auto-joins org
```

---

# Module 3: miniHR

## 3.1 Features

| Feature | Description |
|---------|-------------|
| **Check-in / Check-out** | GPS-verified, time-stamped, anti-spoof (distance check from office) |
| **Worklog** | Log hours against a Planka card; shows in card detail |
| **Auto-evaluation** | Triggered by Planka webhook when card moves to "Done" column |
| **Leave requests** | Submit → notify admin via LINE → approve/reject flow |
| **Monthly report** | Summary: tasks done, on-time rate, total hours, leave days |

## 3.2 Database Schema

```sql
-- Check-in / Check-out records
CREATE TABLE hr_checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  member_id   UUID REFERENCES members(id),
  type        VARCHAR(10) NOT NULL,   -- 'in' or 'out'
  lat         DECIMAL(10,7),
  lng         DECIMAL(10,7),
  note        VARCHAR(200),
  checked_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Worklog per Planka card
CREATE TABLE hr_worklog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  member_id   UUID REFERENCES members(id),
  card_id     VARCHAR(50) NOT NULL,   -- Planka card ID
  hours       DECIMAL(4,2) NOT NULL,
  note        VARCHAR(300),
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-evaluation (created by webhook handler)
CREATE TABLE hr_evaluations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  member_id   UUID REFERENCES members(id),
  card_id     VARCHAR(50) NOT NULL,
  card_title  VARCHAR(200),
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  on_time     BOOLEAN,               -- completed_at <= due_date
  hours_spent DECIMAL(6,2),          -- sum from hr_worklog for this card
  period      CHAR(7),               -- 'YYYY-MM' for monthly rollup
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Leave requests
CREATE TABLE hr_leave (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  member_id   UUID REFERENCES members(id),
  leave_type  VARCHAR(30) DEFAULT 'annual',  -- annual / sick / personal
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      VARCHAR(300),
  status      VARCHAR(20) DEFAULT 'pending', -- pending / approved / rejected
  approved_by UUID REFERENCES members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## 3.3 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bff/hr/checkin` | Record check-in (body: `{ lat, lng, note? }`) |
| POST | `/bff/hr/checkout` | Record check-out (body: `{ lat, lng, note? }`) |
| GET | `/bff/hr/today` | Get today's check-in/out status |
| POST | `/bff/hr/worklog` | Add worklog (body: `{ cardId, hours, note? }`) |
| GET | `/bff/hr/worklog?cardId=` | Get worklogs for a card |
| POST | `/bff/hr/leave` | Submit leave request |
| GET | `/bff/hr/leave` | List own leave requests |
| PATCH | `/bff/hr/leave/:id` | Approve/reject (admin only) |
| GET | `/bff/hr/report?period=YYYY-MM` | Monthly summary report |

## 3.4 Auto-Evaluation via Planka Webhook

```
Planka fires: card:update event
BFF webhook receiver at POST /bff/webhooks
  │
  │  if event.data.card.listId === "done_list_id"
  │    and event.data.prevCard.listId !== "done_list_id"
  ▼
BFF inserts hr_evaluations record:
  - on_time = (completed_at <= card.dueDate)
  - hours_spent = SUM(hr_worklog WHERE card_id = card.id)

BFF sends LINE push message to card assignee:
  "✅ งาน [card.title] เสร็จแล้ว!
   ⏱ ใช้เวลา X ชั่วโมง  |  📅 ทันกำหนด / เกินกำหนด N วัน"
```

## 3.5 GPS Check-in Anti-Spoof

```
Office location stored in organizations.office_lat / office_lng / office_radius_m

On check-in request:
  distance = haversine(request.lat, request.lng, org.office_lat, org.office_lng)
  if distance > org.office_radius_m:
    return 400 { error: "Too far from office", distance_m: distance }

Bypass flag: org.allow_remote = true → skip distance check
```

---

# Module 4: Google Calendar / iCal Feed

## 4.1 Phase 1 (recommended) — iCal Feed (zero OAuth, works everywhere)

BFF generates a personal `.ics` file from the user's Planka cards that have due dates.

### How it works

```
GET /bff/calendar/:userId/feed.ics?token=<ical_secret_token>
  │  No auth header needed (shareable URL, token is per-user secret)
  ▼
BFF fetches all cards assigned to user from Planka
Filters: dueDate IS NOT NULL and not completed
Returns RFC 5545 iCal file:
  BEGIN:VCALENDAR
  PRODID:-//KanbanApp//KanbanApp//EN
  VERSION:2.0
  X-WR-CALNAME:งาน Kanban
  BEGIN:VEVENT
  UID:{cardId}@kanban.yourdomain.com
  SUMMARY:{card.title}
  DTSTART:{card.dueDate in UTC}
  DTEND:{card.dueDate + 1 hour}
  DESCRIPTION:Board: {board.name} | Column: {list.name}
  URL:https://liff.line.me/{LIFF_ID}/cards/{cardId}
  END:VEVENT
  ...
  END:VCALENDAR
```

### User setup (shown in LIFF settings screen)

```
"เพิ่มปฏิทินของคุณ:

Google Calendar:
  1. เปิด Google Calendar → Other Calendars → From URL
  2. วาง URL นี้: https://kanban.yourdomain.com/bff/calendar/abc123/feed.ics

iPhone / Mac:
  กด 'Subscribe to iCal' เพื่อเพิ่มอัตโนมัติ"
```

**iCal token generation:** `crypto.randomBytes(24).toString('hex')` stored in `members.ical_token`. User can regenerate to revoke old URL.

## 4.2 Phase 2 (optional, add later) — Google Calendar OAuth Push

Only implement if users need two-way sync (editing in Google Calendar updates Planka cards).

| Step | Detail |
|------|--------|
| OAuth scope | `https://www.googleapis.com/auth/calendar.events` |
| Store tokens | `google_tokens` table (access_token, refresh_token, org_id, member_id) |
| Sync trigger | When card due date changes → Google Calendar API `events.patch` |
| Push notifications | Google Calendar push → `POST /bff/webhooks/google-calendar` |
| Conflict strategy | Last-write-wins; Planka is source of truth |

**Recommendation:** Start with Phase 1 iCal. Add Phase 2 only if users explicitly request it. Phase 1 covers 90% of the use case with 5% of the complexity.

---

# Module 5: MCP Automation Server

## 5.1 Design Principles

- **≤ 7 tools** — keeps the tool list short enough for 7B/13B local LLMs
- **Simple param types** — strings and numbers only, no nested objects
- **Fuzzy name matching** — user says card name in natural language; BFF resolves to ID
- **stdio transport** — MCP server communicates over stdin/stdout, no extra port

## 5.2 MCP Server Tech

```
mcp-kanban/
├── src/
│   ├── server.ts        # MCP server entry (stdio)
│   ├── tools/           # One file per tool
│   │   ├── listTasks.ts
│   │   ├── createTask.ts
│   │   ├── moveTask.ts
│   │   ├── checkIn.ts
│   │   ├── checkOut.ts
│   │   ├── addWorklog.ts
│   │   └── getReport.ts
│   └── bffClient.ts     # Calls BFF API with stored token
├── package.json
└── mcp-config.json      # MCP host config (for LM Studio / Ollama / etc.)
```

## 5.3 The 7 Tools

```typescript
// 1. list_my_tasks
// No params. Returns: task title, column, due date (last 30 tasks)
{
  name: "list_my_tasks",
  description: "แสดงรายการงานของฉันทั้งหมด",
  inputSchema: { type: "object", properties: {} }
}

// 2. create_task
// title: string (required), due_date: string "YYYY-MM-DD" (optional)
{
  name: "create_task",
  description: "สร้างงานใหม่",
  inputSchema: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string", description: "ชื่องาน" },
      due_date: { type: "string", description: "วันกำหนดส่ง เช่น 2026-07-01" }
    }
  }
}

// 3. move_task
// task_name: string (fuzzy-matched by BFF), column_name: string (e.g. "กำลังทำ", "เสร็จแล้ว")
{
  name: "move_task",
  description: "ย้ายงานไปยังคอลัมน์ที่ระบุ",
  inputSchema: {
    type: "object",
    required: ["task_name", "column_name"],
    properties: {
      task_name: { type: "string" },
      column_name: { type: "string" }
    }
  }
}

// 4. check_in
// No params (GPS from device or omit for CLI use)
{
  name: "check_in",
  description: "บันทึกเวลาเข้างาน",
  inputSchema: { type: "object", properties: {} }
}

// 5. check_out
// No params
{
  name: "check_out",
  description: "บันทึกเวลาออกงาน",
  inputSchema: { type: "object", properties: {} }
}

// 6. add_worklog
// task_name: string, hours: number, note: string (optional)
{
  name: "add_worklog",
  description: "บันทึกชั่วโมงทำงานสำหรับงานที่ระบุ",
  inputSchema: {
    type: "object",
    required: ["task_name", "hours"],
    properties: {
      task_name: { type: "string" },
      hours: { type: "number" },
      note: { type: "string" }
    }
  }
}

// 7. get_report
// month: string "YYYY-MM" (optional, defaults to current month)
{
  name: "get_report",
  description: "ดูสรุปผลงานประจำเดือน",
  inputSchema: {
    type: "object",
    properties: {
      month: { type: "string", description: "เช่น 2026-06 (ค่าเริ่มต้น: เดือนปัจจุบัน)" }
    }
  }
}
```

## 5.4 MCP Config (mcp-config.json)

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/path/to/mcp-kanban/dist/server.js"],
      "env": {
        "BFF_BASE_URL": "https://kanban.yourdomain.com/bff",
        "BFF_TOKEN": "your-bff-access-token"
      }
    }
  }
}
```

Compatible with: LM Studio, Ollama (via MCP bridge), Claude Desktop, Cursor, VS Code Copilot.

## 5.5 Fuzzy Task Matching (BFF side)

```sql
-- BFF calls this when tool passes task_name as a string:
SELECT c.id, c.name, l.name as list_name
FROM planka_cards c
JOIN planka_lists l ON l.id = c.list_id
WHERE c.board_id = $orgBoardId
  AND LOWER(c.name) LIKE LOWER('%' || $taskName || '%')
ORDER BY c.created_at DESC
LIMIT 5;
-- Returns top match; if multiple, return list for LLM to disambiguate
```

---

# Phase 5–8: Extended Roadmap

## Phase 5: BFF Extensions + SME Membership (Week 6)

| Day | Task | Deliverable |
|-----|------|-------------|
| 35 | Add org/member tables to PostgreSQL | Schema ready |
| 36 | Implement org CRUD endpoints in BFF | Org API working |
| 37 | Implement invite flow with LIFF shareTargetPicker | Invite working |
| 38 | LIFF org settings screen (create org, invite, manage members) | Membership UI |
| 39 | Role-based access control middleware in BFF | RBAC enforced |
| 40 | Test multi-org isolation | Security verified |
| 41 | Buffer / fix issues | Stabilized |

## Phase 6: miniHR (Week 7)

| Day | Task | Deliverable |
|-----|------|-------------|
| 42 | Add HR tables to PostgreSQL | HR schema ready |
| 43 | Implement check-in/out endpoints with GPS | Check-in working |
| 44 | Implement worklog endpoints | Worklog working |
| 45 | Connect Planka webhook to auto-evaluation | Eval triggers |
| 46 | Implement leave request flow + LINE notification | Leave flow done |
| 47 | LIFF HR screen (check-in button, worklog, leave) | HR UI done |
| 48 | Monthly report endpoint + LIFF report page | Reports done |

## Phase 7: Calendar + MCP (Week 8)

| Day | Task | Deliverable |
|-----|------|-------------|
| 49 | Implement iCal feed generator in BFF | .ics endpoint live |
| 50 | LIFF settings: show iCal URL + copy button | User can subscribe |
| 51 | Scaffold MCP server (Node + @modelcontextprotocol/sdk) | MCP server stub |
| 52 | Implement all 7 MCP tools | Tools tested in Claude Desktop |
| 53 | Test with Ollama + local LLM (llama3 or qwen2.5) | Local LLM confirmed |
| 54 | Document MCP setup for users | MCP guide done |
| 55 | Buffer | Stabilized |

## Phase 8: Final QA + Production (Weeks 9–10)

| Task | Deliverable |
|------|-------------|
| Full regression test (all modules) | All features stable |
| Performance test (50 concurrent users) | Under 200ms p95 |
| Security review (BFF endpoints, JWT, GPS) | No critical vulns |
| LINE Mini App resubmission (if rejected) | App published |
| Operations runbook (backup, update, rollback) | Ops docs done |
| Team training / handover | Platform live |

---

# Resource Update (Full Platform)

| Service | RAM |
|---------|-----|
| Planka | 512 MB |
| BFF Service | 128 MB |
| MCP Server | 32 MB (CLI, not always running) |
| PostgreSQL | 256 MB |
| Redis | 64 MB |
| Nginx | 64 MB |
| **Total** | **~1.05 GB** |

**Recommended server: 2 vCPU, 2 GB RAM, 40 GB SSD** — same as base blueprint, no upgrade needed.

---

# Quick Reference: New .env Variables

Add these to the existing `.env` file alongside the Planka variables:

```bash
# BFF
BFF_JWT_SECRET=<openssl rand -base64 48>
ICAL_SECRET=<openssl rand -base64 24>

# LINE Channel (for BFF token verification)
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret

# HR (optional: office location for GPS check-in)
OFFICE_LAT=13.7563
OFFICE_LNG=100.5018
OFFICE_RADIUS_M=300

# Google Calendar Phase 2 (leave blank until Phase 2)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

> **End of Extension Blueprint**
>
> Follow the base `final_blueprint.md` through Phase 4, then continue here from Phase 5.
> All modules share the same PostgreSQL instance and LXC deployment — no new infrastructure required.
