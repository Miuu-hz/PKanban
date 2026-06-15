---
name: bff-scaffold
description: Scaffold or extend the BFF (Backend-for-Frontend) service — Node + Fastify, LINE auth, Planka proxy, org/HR/calendar routes. Use when the user asks to create the BFF, add a BFF endpoint, or work on auth.
---

# BFF Service Scaffold

## Context
- Spec: `extension_blueprint.md` Module 1 (service), Module 2 (org routes), Module 3 (HR routes), Module 4 (calendar)
- Stack: Node 20 + Fastify + TypeScript, shares PostgreSQL with Planka
- The LIFF app NEVER calls Planka directly — every request goes through BFF

## Project layout (create under `bff/`)

```
bff/
├── src/
│   ├── server.ts            # Fastify entry, registers all route plugins
│   ├── plugins/
│   │   ├── auth.ts          # JWT verify decorator (fastify.authenticate)
│   │   ├── db.ts            # pg Pool
│   │   └── planka.ts        # Planka API client (admin token, auto-refresh)
│   ├── routes/
│   │   ├── auth.ts          # POST /auth/line, /auth/refresh, DELETE /auth/logout
│   │   ├── kanban.ts        # Proxy to Planka REST (board/list/card CRUD)
│   │   ├── org.ts           # Module 2 endpoints
│   │   ├── hr.ts            # Module 3 endpoints
│   │   ├── calendar.ts      # GET /calendar/:userId/feed.ics
│   │   └── webhooks.ts      # POST /webhooks (Planka events → auto-evaluation)
│   ├── services/
│   │   ├── lineVerify.ts    # Verify LIFF idToken against LINE JWK
│   │   ├── evaluation.ts    # Webhook → hr_evaluations logic
│   │   └── ical.ts          # RFC 5545 generator
│   └── db/migrations/       # SQL files, numbered 001_, 002_, ...
├── package.json
└── tsconfig.json
```

## Key implementation rules

### LINE idToken verification (`lineVerify.ts`)
- Verify against LINE's official endpoint: `POST https://api.line.me/oauth2/v2.1/verify` with `id_token` + `client_id` (simpler and officially supported vs manual JWK)
- Check `aud` equals `LINE_CHANNEL_ID` and token not expired
- On success extract `sub` (LINE user ID), `name`, `picture`

### Auth flow
1. `POST /auth/line { idToken }` → verify → upsert into `members` by `line_user_id`
2. Ensure a matching Planka user exists (create via Planka admin API if not)
3. Issue BFF JWT: payload `{ memberId, lineUserId, orgIds: [...] }`, expiry 7d, sign with `BFF_JWT_SECRET`
4. Return `{ accessToken, refreshToken, user }`

### Planka proxy (`kanban.ts`)
- BFF logs in to Planka once with `PLANKA_ADMIN_EMAIL/PASSWORD`, caches token, refreshes on 401
- Before proxying, enforce org-level ACL: the requested board must belong to a Planka project mapped to one of the user's orgs (`organizations.planka_project_id`)

### DB schema
- Use the exact SQL from `extension_blueprint.md` sections 2.2 and 3.2 as migrations 001 and 002
- Note: `organizations.owner_id` references `members` — create `members` table first

## Verification
After scaffolding: `cd bff && npm install && npm run build && npm test`. Add at minimum: auth route test with mocked LINE verify, and one RBAC rejection test.
