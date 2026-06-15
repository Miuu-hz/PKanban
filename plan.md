# Plan: Self-Hosted Kanban + LINE Mini App — Full Platform (SME Edition)

## Overview
Research, design, and architect a self-hosted Trello-like task management system with a LINE Mini App frontend, extended with SME membership, miniHR, Google Calendar sync, and MCP automation. All modules share a single BFF (Backend-for-Frontend) service and one PostgreSQL instance.

---

## Stage 1 — Research (Parallel Sub-Agents)

- **Agents**:
  - `github_researcher`: Search GitHub for top open-source Kanban systems (Planka, Wekan, Focalboard, TaskBoard, Kanboard, etc.). Evaluate: self-host support, API readiness, lightweight nature, community activity. Deliver top 3 with pros/cons + winner.
  - `liff_researcher`: Research LINE Mini App / LIFF framework capabilities, constraints, authentication patterns, and how external backends are integrated. Document findings.

---

## Stage 2 — Architecture & Development Planning (Parallel Sub-Agents)

- **Agents**:
  - `system_architect`: Take winner from Researcher. Design Proxmox + LXC self-hosted deployment, BFF layer, API gateway, security model, list core API endpoints for Kanban workflow + new modules.
  - `liff_developer`: Design LINE Mini App frontend architecture, LIFF integration, auth flow (LINE Login → BFF → Planka), API consumption layer, UX/UI flow for Kanban + HR modules inside LINE.

---

## Stage 3 — Module Planning (Sequential)

Each module is planned after Stage 2 architecture is confirmed.

| Module | Description |
|--------|-------------|
| **Kanban Core** | Planka backend + LIFF frontend (base blueprint) |
| **BFF Service** | Auth bridge between LIFF, Planka, and all new modules |
| **SME Membership** | Multi-tenant org/member/role management |
| **Google Calendar / iCal** | iCal feed per user from card due dates; optional Google Calendar OAuth |
| **miniHR** | Check-in/out with GPS, worklog per card, auto evaluation via Planka webhooks, leave requests |
| **MCP Automation** | Lightweight MCP server (≤7 tools, simple params) for local LLM automation |

---

## Stage 4 — Orchestrator Integration

Synthesize all outputs into two deliverable documents:
1. **`final_blueprint.md`** — Base Kanban platform (Planka + LIFF + BFF auth)
2. **`extension_blueprint.md`** — SME module extensions (Membership, HR, Calendar, MCP)

Output format: Markdown developer guides with DB schemas, API specs, LXC deployment configs, and implementation roadmap.

---

## Architecture Summary

```
LINE Mini App (LIFF)  ──┐
MCP Client (local LLM)  ─┼──> BFF Service (auth + membership + HR + iCal) ──> PostgreSQL
                         │          │  ▲
                         │          ▼  │  REST + Webhooks
                         └──────> Planka (Kanban engine)
                                        │
                                   Google Calendar API (optional Phase 2)
```

**Single BFF, single DB, Proxmox + LXC. Total RAM target: ≤1.5 GB.**
