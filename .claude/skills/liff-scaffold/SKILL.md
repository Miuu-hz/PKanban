---
name: liff-scaffold
description: Scaffold or extend the LINE Mini App frontend — React + TypeScript + Vite + LIFF SDK, Kanban board UI, HR screens. Use when the user asks to create the frontend, add a screen, or work on LIFF integration.
---

# LIFF Frontend Scaffold

## Context
- Spec: `final_blueprint.md` Part 3 (full structure, components, UX) + `line_mini_app_development.md` (complete reference implementations — check here FIRST before writing new code, most components already exist as code samples)
- Stack: React 18 + TypeScript 5 + Vite 5 + Tailwind 3 + Zustand + @dnd-kit + @line/liff 2.26
- All API calls go to the BFF (`VITE_API_BASE_URL`), never to Planka directly

## Critical conventions
- Env vars MUST use `VITE_` prefix (NOT `REACT_APP_` — Vite silently ignores those)
- Auth storage key: `app_auth` in localStorage `{ accessToken, refreshToken, user }`
- Token exchange endpoint: `POST /bff/auth/line { idToken }`
- LINE brand green: `#06C755`; follow LINE Mini App design guidelines (header, safe areas)

## Project layout
Follow `final_blueprint.md` section 3.2 exactly. New screens for extension modules:

```
src/pages/
├── ...existing Kanban pages...
├── hr/
│   ├── CheckInPage.tsx       # Big check-in/out button + GPS status + today's log
│   ├── WorklogPage.tsx       # Hours per card, weekly view
│   ├── LeavePage.tsx         # Request form + status list
│   └── ReportPage.tsx        # Monthly summary (tasks done, on-time %, hours)
├── org/
│   ├── OrgSettingsPage.tsx   # Org info, member list, roles
│   └── InvitePage.tsx        # shareTargetPicker invite flow
└── settings/
    └── CalendarSyncPage.tsx  # Show iCal URL + copy button + setup steps
```

## Key flows

### GPS check-in (CheckInPage)
```typescript
navigator.geolocation.getCurrentPosition(
  (pos) => api.post('/bff/hr/checkin', { lat: pos.coords.latitude, lng: pos.coords.longitude }),
  (err) => showToast('เปิด GPS ก่อนเช็คอินนะครับ'),
  { enableHighAccuracy: true, timeout: 10000 }
);
```
Handle the 400 "Too far from office" response by showing distance and the org's allowed radius.

### Invite flow (InvitePage)
1. `POST /bff/org/:orgId/invite` → get invite token
2. `liff.shareTargetPicker()` with a Flex Message containing `https://liff.line.me/{LIFF_ID}?invite={token}`
3. On app launch, check `liff.state` / URL params for `invite` and call join endpoint

### Testing during development
- `npm run dev` + `npx ngrok http 5173`, set ngrok URL as LIFF endpoint in LINE console
- LIFF features (`getIDToken`, `shareTargetPicker`) only work inside the LINE app — use `VITE_DEV_MOCK_MODE=true` to stub them in desktop browser

## UX rules (from blueprint section 3.5)
- Mobile-first: 85vw column width, horizontal snap scroll, bottom sheets for forms
- Touch: long-press context menus, pull-to-refresh (threshold 80px)
- Thai language UI by default; all dates in Buddhist Era display (but ISO 8601 in API)
