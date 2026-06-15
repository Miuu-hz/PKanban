# Self-Hosted Kanban / Task Management Systems — Comprehensive Research Report

**Date:** June 2026
**Researcher:** Open-Source Software Analyst
**Scope:** Evaluate open-source, self-hosted Kanban board alternatives to Trello with strong Docker support and robust APIs for custom frontend integration (e.g., LINE Mini App)

---

## Executive Summary

This report evaluates **7 major self-hosted Kanban/task management systems** across **6 criteria** (scored 1-5 each, max 30 points). After extensive research of GitHub repositories, documentation, Docker configurations, API completeness, and community health, three systems emerge as clear leaders. Notably, **two of the seven systems are effectively deprecated** (Focalboard and TaskBoard), and one (OpenProject) is a full project management suite rather than a focused Kanban tool.

### Quick Verdict
| Rank | System | Total Score | Best For |
|------|--------|-------------|----------|
| 🥇 1 | **Planka** | **27/30** | Modern teams, LINE Mini App integration, easy self-hosting |
| 🥈 2 | **Kanboard** | **25/30** | Lightweight deployments, minimal resource usage, maximum stability |
| 🥉 3 | **Wekan** | **24/30** | Trello migrants, large teams, maximum feature completeness |

---

## Research Methodology

Data was collected from:
- GitHub repository metadata (stars, forks, commits, releases, last activity)
- Official documentation and API references
- Docker Hub and docker-compose configurations
- Community forums, Reddit r/selfhosted, Hacker News discussions
- Direct repository inspection (Dockerfile quality, API specs)

### Systems Evaluated

| System | GitHub | Stars | Status |
|--------|--------|-------|--------|
| **Planka** | plankanban/planka | 12.1k | ✅ Actively maintained |
| **Wekan** | wekan/wekan | 21.0k | ✅ Very actively maintained |
| **Focalboard** | mattermost-community/focalboard | 26.2k | ⚠️ Deprecated Aug 2024 |
| **Kanboard** | kanboard/kanboard | 9.6k | ✅ Actively maintained |
| **TaskBoard** | kiswa/TaskBoard | 1.4k | ❌ Unmaintained (2025) |
| **OpenProject** | opf/openproject | 15.3k | ✅ Very actively maintained |
| **Vikunja** | go-vikunja/vikunja | ~2k | ✅ Actively maintained |

> **Note:** Focalboard and TaskBoard are excluded from final scoring due to deprecation. OpenProject is evaluated but noted as a full PM suite. Vikunja is included as a discovered notable candidate.

---

## Detailed Scoring Matrix

### Scoring Criteria (1-5 scale)

| # | Criterion | Description |
|---|-----------|-------------|
| 1 | **Ease of Self-Hosting** | Docker Compose quality, one-click deploy options, configuration simplicity |
| 2 | **API Readiness** | REST/GraphQL completeness, documentation quality, OpenAPI/Swagger, CORS support |
| 3 | **Lightweight** | RAM/CPU footprint, startup time, database dependencies |
| 4 | **Active Maintenance** | Last commit date, release frequency, issue response time |
| 5 | **Feature Completeness** | Boards, lists, cards, drag-and-drop, labels, assignments, due dates, attachments |
| 6 | **Authentication Options** | OAuth2/OIDC, LDAP, API keys, webhook support for custom auth |

---

### Final Rankings (Top 5 + Notable)

| Rank | System | Ease of Hosting | API Readiness | Lightweight | Maintenance | Features | Auth Options | **Total** |
|------|--------|-----------------|---------------|-------------|-------------|----------|--------------|-----------|
| 🥇 1 | **Planka** | 5 | 5 | 4 | 5 | 5 | 3 | **27/30** |
| 🥈 2 | **Kanboard** | 5 | 4 | 5 | 4 | 4 | 3 | **25/30** |
| 🥉 3 | **Wekan** | 3 | 4 | 3 | 5 | 5 | 4 | **24/30** |
| 4 | OpenProject | 3 | 4 | 2 | 5 | 5 | 5 | **23/30** |
| 5 | Vikunja | 4 | 4 | 4 | 4 | 3 | 4 | **23/30** |
| — | Focalboard | 3 | 3 | 3 | 1 | 3 | 2 | — |
| — | TaskBoard | 2 | 2 | 4 | 1 | 2 | 1 | — |

---

## 🥇 #1: PLANKA

**GitHub:** [plankanban/planka](https://github.com/plankanban/planka) | **Stars:** 12.1k | **Forks:** 1.3k | **License:** Fair Use / AGPL-3.0

| Metric | Value |
|--------|-------|
| **Language** | JavaScript (Node.js backend + React frontend) |
| **Database** | PostgreSQL |
| **Last Commit** | ~1 week ago (actively maintained) |
| **Latest Release** | v2.1.1 (April 2026) — 60 releases total |
| **Docker Image** | `ghcr.io/plankanban/planka` (official) |
| **Min RAM** | 256 MB (recommended: 512 MB) |
| **App Idle RAM** | ~80 MB |

### Scores Breakdown

| Criterion | Score | Justification |
|-----------|-------|---------------|
| **Ease of Self-Hosting** | **5/5** | Single Docker image, official docker-compose.yml, one-click deploy on Railway/DigitalOcean, Helm chart for Kubernetes, automated install scripts, backup/restore scripts included |
| **API Readiness** | **5/5** | Full REST API with **OpenAPI 3.0 / Swagger UI**, 50+ webhook events, official Postman collection, PHP and Python SDKs, comprehensive endpoint coverage for all CRUD operations |
| **Lightweight** | **4/5** | Single container (~80MB idle), requires PostgreSQL, very fast React frontend, but not as minimal as Kanboard |
| **Active Maintenance** | **5/5** | Weekly commits, company-backed (Planka Software GmbH), regular releases, Discord community, responsive to issues |
| **Feature Completeness** | **5/5** | Projects, boards, lists, cards, labels, due dates, assignments, time tracking, attachments, markdown descriptions, comments, real-time sync, customizable backgrounds, filters |
| **Authentication Options** | **3/5** | **OIDC/OAuth2** (Google, Microsoft Entra ID, Keycloak, Authentik), local auth, role mapping from OIDC claims — no built-in LDAP |

### ✅ Pros
- **Outstanding API documentation** — Interactive Swagger UI, OpenAPI 3.0 spec, official Postman collection, Python (plankapy) and PHP SDKs
- **Real-time collaboration** — WebSocket-based instant sync across all connected clients
- **Modern, beautiful UI** — React/Redux with polished drag-and-drop (closest Trello look-alike)
- **50+ webhook events** — Excellent for building custom integrations (like a LINE Mini App)
- **Exceptional Docker support** — Single container, compose file, Kubernetes Helm chart, Railway template
- **Active company backing** — Planka Software GmbH ensures long-term sustainability
- **100+ notification providers** — Via Apprise (Slack, Discord, Telegram, email, etc.)
- **CORS-friendly** — REST API designed for browser-based frontend consumption

### ❌ Cons
- No built-in LDAP support (OIDC-only for enterprise auth)
- Requires PostgreSQL (additional container overhead)
- Fair Use License has commercial restrictions (AGPL-3.0 for community)
- Smaller ecosystem than Wekan/Kanboard
- Mobile app still in beta (TestFlight)

### 🏆 Verdict
**The best all-rounder** — Planka combines modern architecture, exceptional API quality, easy Docker deployment, and beautiful UX. Its Swagger-documented REST API with 50+ webhooks makes it the ideal backend for a custom frontend like a LINE Mini App. The OIDC authentication can integrate with LINE Login.

---

## 🥈 #2: KANBOARD

**GitHub:** [kanboard/kanboard](https://github.com/kanboard/kanboard) | **Stars:** 9.6k | **Forks:** 2.0k | **License:** MIT

| Metric | Value |
|--------|-------|
| **Language** | PHP (97.7%) |
| **Database** | SQLite (default), MySQL/MariaDB, PostgreSQL |
| **Last Commit** | 2 days ago (very actively maintained) |
| **Latest Release** | v1.2.52 (April 2026) — 104 releases total |
| **Docker Image** | Official Dockerfile + compose files for all DBs |
| **Min RAM** | ~64 MB (runs on Raspberry Pi) |
| **App RAM** | Extremely low (<50 MB with SQLite) |

### Scores Breakdown

| Criterion | Score | Justification |
|-----------|-------|---------------|
| **Ease of Self-Hosting** | **5/5** | Single PHP container, SQLite by default (zero DB config), compose files for MySQL/PostgreSQL, runs on minimal hardware including Raspberry Pi |
| **API Readiness** | **4/5** | Comprehensive **JSON-RPC API** with full documentation, Python/Go/PHP/Ruby/Java clients available — but JSON-RPC is less intuitive than REST for modern frontend dev |
| **Lightweight** | **5/5** | **The lightest system tested** — PHP + SQLite runs on a Raspberry Pi, <64MB RAM, instant startup |
| **Active Maintenance** | **4/5** | Regular releases (~every 2 months), active bug fixes, mature/stable — described as "feature complete" by maintainer |
| **Feature Completeness** | **4/5** | Full Kanban (boards, swimlanes, subtasks, automated actions, plugins), time tracking, Gantt, CSV import/export — UI is utilitarian |
| **Authentication Options** | **3/5** | LDAP plugin, OAuth2 plugin, API tokens, webhooks — requires plugins for advanced auth |

### ✅ Pros
- **Ultra-lightweight** — The most resource-efficient option; runs on a Raspberry Pi
- **Incredibly stable** — Mature codebase, 10+ years old, "feature complete" means no breaking changes
- **Powerful automation** — Automatic actions triggered by column moves, due dates, etc.
- **Rich plugin ecosystem** — 100+ plugins for Gantt, calendar, OAuth, LDAP, theming
- **Multiple database options** — SQLite for simplicity, MySQL/PostgreSQL for scale
- **Excellent API clients** — Official Python library, community Go/PHP/Ruby/Java clients
- **Swimlane support** — Advanced board organization
- **Time tracking built-in** — Subtask time tracking and reporting

### ❌ Cons
- **JSON-RPC API (not REST)** — Requires different mental model; single endpoint (`jsonrpc.php`) vs RESTful URLs
- **Dated UI** — Functional but not beautiful; described as "old fashioned" by users
- **Mobile experience** — No native app; responsive web UI is basic
- **CORS requires plugin** — Needs `ApiCors` plugin for cross-origin requests
- **Plugin dependency** — Advanced features (OAuth, LDAP, CORS) require installing plugins
- **Limited real-time** — No WebSocket-based live updates

### 🏆 Verdict
**The efficiency champion** — Kanboard is unbeatable for lightweight, stable deployments where resources matter. Its JSON-RPC API is comprehensive but less frontend-friendly than REST. Best for teams prioritizing stability and minimal footprint over modern UX. For a LINE Mini App, the API works but requires a JSON-RPC client wrapper.

---

## 🥉 #3: WEKAN

**GitHub:** [wekan/wekan](https://github.com/wekan/wekan) | **Stars:** 21.0k | **Forks:** 3.0k | **License:** MIT

| Metric | Value |
|--------|-------|
| **Language** | JavaScript (Meteor framework) |
| **Database** | MongoDB |
| **Last Commit** | 10 hours ago (extremely actively maintained) |
| **Latest Release** | v9.36 (June 2026) — 630+ releases total |
| **Docker Image** | `wekanteam/wekan` (official) |
| **Min RAM** | ~512 MB (with MongoDB) |
| **Largest Deployment** | 30,000 users in a single company |

### Scores Breakdown

| Criterion | Score | Justification |
|-----------|-------|---------------|
| **Ease of Self-Hosting** | **3/5** | Docker Compose available, but Meteor + MongoDB is complex; multiple deployment platforms supported (Snap, Sandstorm, source) |
| **API Readiness** | **4/5** | REST API with OpenAPI 2.0 generation, comprehensive endpoints for boards/cards/users/lists, but docs can be fragmented |
| **Lightweight** | **3/5** | Meteor + MongoDB stack is resource-heavy; not suitable for low-end hardware |
| **Active Maintenance** | **5/5** | **Daily commits**, 630+ releases, highly responsive maintainer (xet7), 105 language translations |
| **Feature Completeness** | **5/5** | The most feature-rich Kanban: boards, swimlanes, custom fields, checklists, rules engine, templates, multi-board views, real-time sync |
| **Authentication Options** | **4/5** | LDAP, OAuth2, password, SAML, Sandstorm, API tokens — most auth options of any system |

### ✅ Pros
- **Most actively maintained** — Daily commits, security patches within hours
- **Maximum feature set** — Swimlanes, custom fields, rules engine, templates, multi-board, calendar
- **Trello-like experience** — Familiar UI minimizes migration friction
- **Battle-tested at scale** — Largest known deployment: 30,000 users
- **Outstanding internationalization** — 105 languages
- **Flexible deployment** — Docker, Snap, Sandstorm, source, Kubernetes
- **REST API** — Native REST with Bearer token auth

### ❌ Cons
- **Resource heavy** — MongoDB + Meteor requires significant RAM (~512MB+)
- **Complex stack** — Meteor framework adds complexity; harder to customize
- **MongoDB dependency** — No SQLite option; Mongo adds operational overhead
- **Fragmented support** — GitHub issues restricted; commercial support pushed
- **WebSocket overhead** — Real-time sync increases server load

### 🏆 Verdict
**The feature powerhouse** — Wekan offers the most features and the most active maintenance. Ideal for teams migrating from Trello who need every feature. However, its MongoDB+Meteor stack is heavy for small deployments, making it less ideal as a lightweight backend for a LINE Mini App.

---

## Other Systems Evaluated

### OpenProject (15.3k ⭐)
- **Type:** Full project management suite (not just Kanban)
- **Score:** 23/30
- **Best for:** Enterprises needing Gantt, Scrum, time tracking, wiki, forums
- **Verdict:** Overkill for a Kanban-only use case. Heavy Ruby on Rails stack.

### Vikunja (~2k ⭐)
- **Type:** Todo app with Kanban, Go + Vue.js
- **Score:** 23/30
- **Best for:** Personal task management with CalDAV sync
- **Verdict:** Promising but smaller community; good REST API and Docker support

### Focalboard (26.2k ⭐) — DEPRECATED ⚠️
- **Status:** Mattermost declared unmaintained August 2024
- **Last meaningful release:** v8.0.0 (June 2024)
- **Verdict:** **DO NOT USE for new deployments.** High star count is misleading.

### TaskBoard (1.4k ⭐) — UNMAINTAINED ❌
- **Status:** Author explicitly stated unmaintained in README (2025)
- **Last release:** v1.0.2 (September 2020)
- **Verdict:** **DO NOT USE.** Author says it's "much too far behind on PHP versions."

---

## 🏆 ULTIMATE WINNER: PLANKA

### For LINE Mini App Integration

Planka is the **unambiguous winner** for building a custom Kanban frontend (such as a LINE Mini App) for these reasons:

### 1. **API-First Architecture (5/5)**
Planka's REST API is the best-documented and most frontend-friendly of all systems evaluated:
- **Interactive Swagger UI** with OpenAPI 3.0 specification
- **50+ webhook events** for real-time push notifications
- **Official Postman collection** for rapid prototyping
- **Python SDK (plankapy)** and PHP SDK available
- Standard HTTP verbs (GET/POST/PUT/PATCH/DELETE) with JSON payloads
- Bearer token authentication

### 2. **Docker Simplicity (5/5)**
```yaml
# Planka docker-compose.yml is clean and minimal
services:
  planka:
    image: ghcr.io/plankanban/planka:latest
    environment:
      - DATABASE_URL=postgresql://...
      - SECRET_KEY=...
    volumes:
      - user-avatars:/app/public/user-avatars
      - project-background-images:/app/public/project-background-images
      - attachments:/app/private/attachments
```
- Single application container + PostgreSQL
- Pre-built images on GitHub Container Registry
- One-click Railway/DigitalOcean deploy templates

### 3. **Authentication for LINE (3/5 → 5/5 potential)**
Planka's OIDC support enables integration with LINE Login:
- Configure `OIDC_ISSUER` pointing to LINE's OAuth endpoint
- Automatic account creation/linking via email
- Role mapping from OIDC claims

### 4. **Real-Time Without Heavy Stack**
Unlike Wekan (MongoDB+Meteor) or OpenProject (Ruby on Rails), Planka delivers real-time collaboration via WebSocket with a lightweight Node.js backend. This means:
- Lower hosting costs
- Faster API response times
- Easier horizontal scaling

### 5. **Modern Frontend Stack Alignment**
Planka's React/Redux frontend demonstrates the API's capability for rich client-side applications. A LINE Mini App (typically React/Vue-based) can consume the same API endpoints seamlessly.

### Architecture for LINE Mini App + Planka

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  LINE Mini App  │────▶│  Planka REST API │────▶│   PostgreSQL    │
│  (React/Vue)    │◄────│  + WebSocket     │◄────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐     ┌──────────────────┐
│  LINE Login     │     │  Webhook Events  │
│  (OIDC/OAuth2)  │────▶│  (50+ events)    │
└─────────────────┘     └──────────────────┘
```

---

## Final Comparison: Top 3 at a Glance

| Attribute | 🥇 Planka | 🥈 Kanboard | 🥉 Wekan |
|-----------|-----------|-------------|----------|
| **GitHub Stars** | 12.1k | 9.6k | 21.0k |
| **Release Frequency** | Monthly | ~Bi-monthly | Weekly |
| **Min RAM** | 256 MB | 64 MB | 512 MB |
| **Database** | PostgreSQL | SQLite/MySQL/PostgreSQL | MongoDB |
| **API Style** | REST (OpenAPI 3.0) | JSON-RPC | REST (OpenAPI 2.0) |
| **Real-Time** | ✅ WebSocket | ❌ Polling | ✅ WebSocket |
| **Docker Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **UI Modernity** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Auth: OIDC/OAuth2** | ✅ Native | ❌ Plugin | ✅ Native |
| **Auth: LDAP** | ❌ | ✅ Plugin | ✅ Native |
| **LINE Login Ready** | ✅ OIDC | ⚠️ Via proxy | ✅ OAuth2 |
| **Webhook Events** | 50+ | Basic | Moderate |
| **Best For** | **LINE Mini App** | **Lightweight deploy** | **Feature richness** |

---

## Appendix: Feature Matrix (All Evaluated Systems)

| Feature | Planka | Kanboard | Wekan | OpenProject | Vikunja | Focalboard | TaskBoard |
|---------|--------|----------|-------|-------------|---------|------------|-----------|
| Kanban Boards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Drag & Drop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Labels/Tags | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Due Dates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assignments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attachments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Markdown | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real-Time Sync | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Swimlanes | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Time Tracking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Custom Fields | ❌ | Plugin | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gantt Charts | ❌ | Plugin | ❌ | ✅ | ✅ | ❌ | ❌ |
| REST API | ✅ | JSON-RPC | ✅ | ✅ | ✅ | ✅ | ✅ |
| OpenAPI Docs | ✅ 3.0 | ❌ | ✅ 2.0 | ✅ | ✅ | ❌ | ❌ |
| Webhooks | 50+ | Basic | Moderate | ✅ | ❌ | ❌ | ❌ |
| OIDC/OAuth2 | ✅ | Plugin | ✅ | ✅ | ✅ | ❌ | ❌ |
| LDAP | ❌ | Plugin | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mobile App | 🅱️ Beta | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |

---

*Report generated June 2026. All data sourced from official GitHub repositories and documentation as of the research date.*
