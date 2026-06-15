---
name: org-membership
description: Implement the SME membership system — organizations, member roles (owner/admin/member/viewer), LINE-native invite flow, multi-tenant access control. Use when the user asks about orgs, members, roles, invites, or tenant isolation.
---

# SME Membership Module

## Context
- Spec: `extension_blueprint.md` Module 2 (schema, endpoints, invite flow)
- Lives in BFF: `routes/org.ts` + RBAC middleware
- Tenancy model: **1 organization = 1 Planka project** (`organizations.planka_project_id`). The BFF is the only enforcement point — Planka itself has no org concept.

## Tables
`organizations`, `members`, `org_members` — exact SQL in blueprint section 2.2. Extra columns referenced by other modules (add in same migration): `organizations.done_list_id`, `office_lat`, `office_lng`, `office_radius_m`, `allow_remote`, and `members.ical_token`.

## Role hierarchy
```
owner  > admin  > member > viewer
```
| Action | Minimum role |
|--------|--------------|
| View boards/cards, view own HR data | viewer |
| Create/move cards, check-in, worklog, request leave | member |
| Invite/remove members, change roles, approve leave, org settings | admin |
| Delete org, transfer ownership, billing/plan | owner |

RBAC middleware: `requireRole(minRole)` — loads the caller's role from `org_members` for the `:orgId` in the route; returns 403 with a Thai-language message if insufficient. Every `/bff/org/*`, `/bff/hr/*`, and `/bff/kanban/*` route MUST resolve org context — never trust an orgId from the request body alone.

## Invite flow (LINE-native)
1. Admin: `POST /bff/org/:orgId/invite { role }` → BFF creates row in `org_invites` (token = random 24 bytes hex, expires 72h, single-use or max_uses)
2. LIFF calls `liff.shareTargetPicker()` with Flex Message → deep link `https://liff.line.me/{LIFF_ID}?invite={token}`
3. Invitee opens link → LIFF auth → `POST /bff/org/join { token }` → BFF validates (not expired, not used), inserts `org_members`, marks token used
4. Also add the Planka user to the org's Planka project via admin API

`org_invites` table (add to migration): `id, org_id, token UNIQUE, role, created_by, expires_at, used_by, used_at`.

## Tenant isolation rules (security-critical)
- Every Kanban proxy request: verify target board belongs to `planka_project_id` of an org the caller is in
- HR queries always filter by `org_id` from the verified membership, never from client input
- iCal feed shows only cards in the user's orgs
- Last owner cannot leave/be removed — require ownership transfer first

## Plan limits (enforce in BFF, simple version)
| Plan | Members | Boards |
|------|---------|--------|
| free | 5 | 2 |
| starter | 15 | 10 |
| pro | unlimited | unlimited |

Check limits on invite-accept and board-create; return a friendly Thai upgrade message when exceeded.
