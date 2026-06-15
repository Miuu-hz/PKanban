# Self-Hosted Kanban Task Management System with LINE Mini App
## Complete Project Blueprint & Developer Guide

**Version:** 1.0.0
**Date:** June 2026
**Status:** Production-Ready Architecture

---

# Executive Summary

This blueprint documents the complete architecture, design, and implementation plan for a self-hosted task management system similar to Trello, delivered as a LINE Mini App. After comprehensive evaluation of seven open-source Kanban systems, **Planka** was selected as the backend. The frontend is built as a LINE Mini App using React 18 + TypeScript + LIFF SDK v2.26, communicating with Planka via its REST API (OpenAPI 3.0) over a secure Nginx reverse proxy.

### Architecture at a Glance

```
+------------------+        HTTPS         +------------------+        +------------------+
|  LINE App (User) | <----------------->  |  Nginx Reverse   | <----> |  Planka Server   |
|  LIFF Browser    |                      |  Proxy (SSL)     |        |  (Kanban API)    |
+------------------+                      +------------------+        +--------+---------+
                                                                               |
                                                                   +-----------+-----------+
                                                                   |                       |
                                                            +------v------+        +------v------+
                                                            |  PostgreSQL  |        |    Redis    |
                                                            |   (Data)     |        |  (Cache)    |
                                                            +--------------+        +-------------+
```

---

# Part 1: Research Findings — Selecting the Backend

## 1.1 Systems Evaluated

Seven open-source Kanban systems were evaluated across six criteria (scored 1-5, max 30 points):

| Rank | System | Score | Status |
|------|--------|-------|--------|
| **1** | **Planka** | **27/30** | Actively maintained |
| 2 | Kanboard | 25/30 | Actively maintained |
| 3 | Wekan | 24/30 | Very actively maintained |
| 4 | OpenProject | 23/30 | Full PM suite |
| 5 | Vikunja | 23/30 | Actively maintained |
| — | Focalboard | — | **DEPRECATED Aug 2024** |
| — | TaskBoard | — | **UNMAINTAINED** |

## 1.2 Top 3 Comparison

| Attribute | Planka (Winner) | Kanboard | Wekan |
|-----------|----------------|----------|-------|
| **GitHub Stars** | 12.1k | 9.6k | 21.0k |
| **Min RAM** | 256 MB | 64 MB | 512 MB |
| **Database** | PostgreSQL | SQLite/MySQL/PostgreSQL | MongoDB |
| **API Style** | REST (OpenAPI 3.0) | JSON-RPC | REST (OpenAPI 2.0) |
| **Real-Time** | WebSocket | Polling | WebSocket |
| **Self-Host Ease** | Excellent | Good | Moderate |
| **UI Modernity** | Excellent | Basic | Good |
| **LINE Login Ready** | OIDC Native | Via proxy | OAuth2 Native |
| **Webhook Events** | 50+ | Basic | Moderate |

## 1.3 Winner: Planka

**Planka** was selected for these decisive reasons:

1. **Best API Documentation** — Interactive Swagger UI, OpenAPI 3.0, official Python/PHP SDKs, 50+ webhook events
2. **Easiest Self-Hosted Deployment** — Single Node.js app + PostgreSQL, runs directly on LXC or bare-metal
3. **OIDC Authentication** — Native LINE Login integration via OpenID Connect
4. **Lightweight Real-Time** — WebSocket sync without MongoDB overhead
5. **Modern Stack Alignment** — Node.js/React backend matches frontend technology choices
6. **Company Backing** — Planka Software GmbH ensures long-term sustainability

---

# Part 2: System Architecture — Self-Hosted Backend

## 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Kanban Backend** | Planka (ghcr.io/plankanban/planka) | Kanban API + WebSocket |
| **Reverse Proxy** | Nginx 1.25-alpine | SSL termination, rate limiting, CORS |
| **Database** | PostgreSQL 16-alpine | Primary data store |
| **Cache** | Redis 7-alpine | Sessions, rate limit counters |
| **SSL** | Let's Encrypt (Certbot) | Free auto-renewing certificates |
| **OS** | Ubuntu 24.04 LTS | Server operating system |

## 2.2 Network Architecture

```
Internet
   |
   | HTTPS
   v
+-------------------+     +-------------------+     +-------------------+
|   Nginx :443      |---->|  Planka :1337     |---->|  PostgreSQL :5432 |
| - SSL termination |     | - REST API        |     | - Kanban data     |
| - Rate limiting   |     | - WebSocket       |     | - User data       |
| - CORS handling   |     | - OIDC auth       |     | - Auth data       |
| - WS proxying     |     +-------------------+     +-------------------+
+--------+----------+              |
         |                         v
         |                  +-------------------+
         |                  |    Redis :6379    |
         |                  | - Session store   |
         |                  | - Rate limit cache|
         |                  +-------------------+
         |
   +-----v-----+
   |  Certbot  |
   | (SSL auto |
   |  renewal) |
   +-----------+
```

## 2.3 LXC Deployment Overview

The deployment uses four separate LXC containers on Proxmox (no Docker):

| LXC Container | Services | IP Example | Memory |
|---------|---------|------------|--------|
| kanban-proxy | Nginx + static LIFF files | 10.0.10.13 | 256 MB |
| kanban-planka | Planka Kanban server | 10.0.10.11 | 512 MB |
| kankan-db | PostgreSQL 16 + Redis 7 | 10.0.10.10 | 512 MB |
| kanban-bff | BFF + MCP server | 10.0.10.12 | 256 MB |
| **Total** | | | **~1.5 GB** |

See `infrastructure/proxmox-lxc-deployment.md` for the full installation guide.

## 2.4 Core API Endpoints

Planka exposes 30+ REST endpoints organized into categories:

### Authentication (5 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/users/auth/native` | Local login (admin fallback) |
| GET | `/api/users/auth/oidc` | Initiate LINE Login OIDC |
| GET | `/api/users/auth/oidc/callback` | OIDC callback handler |
| POST | `/api/users/auth/token` | Refresh access token |
| POST | `/api/users/auth/logout` | End session |

### Boards (5 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects/:id/boards` | List all boards |
| GET | `/api/boards/:id` | Get board details |
| POST | `/api/projects/:id/boards` | Create board |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |

### Lists/Columns (4 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/boards/:id/lists` | Create column |
| PATCH | `/api/lists/:id` | Update column |
| DELETE | `/api/lists/:id` | Delete column |
| POST | `/api/lists/:id/positions` | Reorder column |

### Cards (5 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/lists/:id/cards` | Create card |
| GET | `/api/cards/:id` | Get card details |
| PATCH | `/api/cards/:id` | Update card |
| POST | `/api/cards/:id/positions` | Move card between columns |
| DELETE | `/api/cards/:id` | Delete card |

### Labels (4 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/boards/:id/labels` | List labels |
| POST | `/api/boards/:id/labels` | Create label |
| POST | `/api/cards/:id/labels` | Assign label to card |
| DELETE | `/api/cards/:id/labels/:id` | Remove label |

### Members (3 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/boards/:id/memberships` | List board members |
| POST | `/api/cards/:id/memberships` | Assign member to card |
| DELETE | `/api/cards/:id/memberships/:id` | Remove member |

### Webhooks (3 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects/:id/webhooks` | List webhooks |
| POST | `/api/projects/:id/webhooks` | Register webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |

## 2.5 Security Architecture

### Defense-in-Depth Layers

| Layer | Measures |
|-------|----------|
| **Network Perimeter** | UFW firewall (ports 22, 80, 443 only), Fail2Ban brute-force protection |
| **Transport** | TLS 1.2+ via Let's Encrypt, HSTS header, certificate auto-renewal |
| **Application Gateway** | Nginx rate limiting (30 req/min API, 5 req/min auth), CORS policy for LIFF origins, security headers |
| **Application** | OIDC authentication via LINE Login, Bearer token validation, input sanitization, Redis session management |
| **Data** | PostgreSQL password auth, Redis password auth, encrypted volume backups, secrets in `.env` only |

### Rate Limiting
| Zone | Rate | Burst | Purpose |
|------|------|-------|---------|
| `api_limit` | 30 req/min | 15 | General API protection |
| `auth_limit` | 5 req/min | 5 | Brute force prevention |
| `webhook_limit` | 20 req/min | 10 | Webhook endpoint protection |

## 2.6 Authentication: LINE Login Integration

### Recommended Approach: Hybrid (Native OIDC + Local Fallback)

Regular users authenticate via LINE Login through Planka's native OIDC support. A local admin account serves as fallback for recovery.

### OIDC Configuration for LINE

| Setting | Value |
|---------|-------|
| `OIDC_ISSUER` | `https://access.line.me` |
| `OIDC_CLIENT_ID` | Your LINE Channel ID |
| `OIDC_CLIENT_SECRET` | Your LINE Channel Secret |
| `OIDC_SCOPES` | `openid profile email` |
| `OIDC_RESPONSE_MODE` | `fragment` |
| `OIDC_ID_TOKEN_SIGNED_RESPONSE_ALG` | `ES256` |
| `OIDC_CLAIMS_SOURCE` | `userinfo` |
| `OIDC_USERNAME_ATTRIBUTE` | `sub` (LINE user ID) |
| `OIDC_ENFORCED` | `false` (keeps local admin fallback) |

### Authentication Flow

```
User opens LIFF URL in LINE
       |
       v
LIFF browser loads endpoint
       |
       v
liff.init() obtains LINE ID token
       |
       v
Frontend sends ID token to backend
       |
       v
Backend verifies with LINE JWK endpoint
       |
       v
Backend finds/creates Planka user
       |
       v
Backend issues Planka JWT (7-day expiry)
       |
       v
Frontend stores JWT, calls Kanban APIs
```

## 2.7 Deployment Checklist

| Step | Action | Command/Details |
|------|--------|----------------|
| 1 | Server setup | Ubuntu 24.04 LTS, 2 vCPU, 2 GB RAM |
| 2 | Provision LXC containers | 4 containers on Proxmox (db, planka, bff, proxy) |
| 3 | Configure firewall | UFW: allow 22, 80, 443 |
| 4 | Configure Fail2Ban | SSH + Nginx jails |
| 5 | Get SSL certificate | Let's Encrypt Certbot |
| 6 | Deploy configs | Nginx, PostgreSQL, Redis, `.env` |
| 7 | Generate secrets | `openssl rand -base64 48` |
| 8 | Start services | `systemctl enable --now planka kanban-bff nginx postgresql redis-server` |
| 9 | Create admin | First-run via `DEFAULT_ADMIN_*` env vars |
| 10 | Configure LINE OIDC | Set `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` |
| 11 | Verify | Health check, SSL, API test |
| 12 | Schedule backups | Daily cron at 2 AM |

---

# Part 3: LINE Mini App Frontend

## 3.1 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18.3 | UI library |
| **Language** | TypeScript 5.4 | Type safety |
| **Bundler** | Vite 5.0 | Fast dev & optimized builds |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **State** | Zustand 4.5 | Lightweight global state |
| **HTTP** | Axios 1.6 | API client with interceptors |
| **Drag/Drop** | @dnd-kit/core | Touch-friendly Kanban DnD |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **Dates** | date-fns | Date formatting |
| **Icons** | lucide-react | Icon set |
| **LIFF** | @line/liff SDK 2.26 | LINE integration |
| **WebSocket** | Native WebSocket | Real-time sync |

## 3.2 Project Structure

```
planka-liff-app/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component
│   ├── modules/liff/               # LIFF SDK integration
│   │   ├── liff.ts                 # Core LIFF module (12 functions)
│   │   ├── LiffProvider.tsx        # React context provider
│   │   └── useLiff.ts              # LIFF hook
│   ├── services/
│   │   ├── authService.ts          # Auth (login/refresh/logout)
│   │   ├── apiClient.ts            # Axios with interceptors
│   │   └── websocketService.ts     # WebSocket manager
│   ├── stores/                     # Zustand state stores
│   │   ├── useAuthStore.ts
│   │   ├── useKanbanStore.ts
│   │   └── useUIStore.ts
│   ├── api/                        # API functions
│   │   ├── boardsApi.ts
│   │   ├── columnsApi.ts
│   │   ├── cardsApi.ts
│   │   ├── labelsApi.ts
│   │   └── membersApi.ts
│   ├── hooks/                      # Reusable hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useDragAndDrop.ts
│   │   ├── usePullToRefresh.ts
│   │   ├── useLongPress.ts
│   │   ├── useOfflineQueue.ts
│   │   └── useOptimisticUpdate.ts
│   ├── pages/                      # Route-level pages
│   │   ├── SplashPage.tsx
│   │   ├── BoardsListPage.tsx
│   │   ├── BoardDetailPage.tsx
│   │   ├── CardDetailPage.tsx
│   │   └── BoardSettingsPage.tsx
│   ├── components/                 # Reusable components
│   │   ├── common/                 # Button, Input, Modal, etc.
│   │   ├── kanban/                 # BoardHeader, Column, Card, etc.
│   │   ├── card-detail/            # CardDetailModal, LabelPicker, etc.
│   │   └── layout/                 # AuthGuard, KanbanLayout
│   └── types/                      # TypeScript interfaces
├── .env                            # Environment variables
└── package.json
```

## 3.3 Authentication Implementation

### LIFF-to-Backend Auth Flow

```typescript
// 1. Initialize LIFF on app mount
await liff.init({ liffId: "YOUR_LIFF_ID" });

// 2. Inside LINE: user auto-authenticated via liff.init()
//    Outside LINE: call liff.login() if needed

// 3. Get LINE ID token from LIFF
const idToken = liff.getIDToken();

// 4. Exchange for BFF session token
//    POST /bff/auth/line  →  BFF verifies idToken with LINE JWK,
//    creates/finds user in Planka via Planka local API, returns BFF JWT.
//    NOTE: The app talks to BFF only. BFF manages Planka credentials internally.
const response = await apiClient.post('/bff/auth/line', { idToken });
const { accessToken, refreshToken, user } = response.data;

// 5. Store BFF token — use for all subsequent calls (Kanban + HR + Calendar)
localStorage.setItem('app_auth', JSON.stringify({ accessToken, refreshToken, user }));
apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
```

> **Architecture note:** The LIFF app never calls Planka directly. All requests go through the BFF service which holds its own Planka admin token and proxies/translates calls. This enables the membership system, HR module, and MCP layer to share the same auth context. See `extension_blueprint.md` for BFF service specification.

### Key AuthService Methods

| Method | Purpose |
|--------|---------|
| `authService.login()` | Exchange LINE ID token for BFF JWT |
| `authService.refreshToken()` | Refresh expiring BFF access token |
| `authService.logout()` | Clear session + LIFF logout |
| `authService.isAuthenticated()` | Check if stored token is valid |
| `authService.initFromStorage()` | Restore session on app startup |

## 3.4 Kanban Board Components

### Component Architecture

```
App
├── LiffProvider (LIFF initialization)
├── AuthGuard (auth state protection)
└── KanbanLayout
    ├── BoardHeader (title, members, share)
    ├── ColumnsContainer (horizontal scroll)
    │   └── Column (droppable)
    │       ├── ColumnHeader (title, count, menu)
    │       └── CardsContainer
    │           └── Card (draggable)
    │               ├── CardTitle
    │               ├── CardLabels
    │               └── CardMeta (assignee, due date)
    └── AddColumnButton
```

### State Management (Zustand)

```typescript
// useKanbanStore manages:
- boards[]           // All user's boards
- activeBoard        // Currently viewed board
- columns[]          // Board columns (lists)
- cards (Map)        // Cards by column ID
- labels[]           // Board labels
- members[]          // Board members

// Actions:
- setBoards(), moveCard(), addCard(), updateCard()
- moveColumn(), reorder(), setActiveBoard()
```

## 3.5 Mobile-Optimized UX

### Responsive Breakpoints

| Device Width | Columns Visible | Interaction Mode |
|-------------|----------------|-----------------|
| < 375px (small phone) | 1-2 | Vertical scroll with column switcher |
| 375-414px (standard) | 2 | Horizontal swipe between columns |
| 414-768px (large phone) | 2-3 | Horizontal scroll |
| > 768px (tablet) | 3-4 | Full drag-and-drop |

### Touch Interactions
- **@dnd-kit/core** with touch sensors for drag-and-drop
- **Long-press** context menus on cards
- **Pull-to-refresh** for board updates
- **Horizontal swipe** for column navigation
- **Bottom sheets** for card creation/editing

### LINE-Native Features

| Feature | LIFF API | Use Case |
|---------|----------|----------|
| Close App | `liff.closeWindow()` | Return to LINE chat |
| Share Board | `liff.sendMessages()` | Share board updates |
| Share with Friends | `liff.shareTargetPicker()` | Invite collaborators |
| Open External | `liff.openWindow()` | View full web version |

## 3.6 Offline-First Strategy

```
User action (move card)
       |
       v
+-------------------+        +-------------------+
| Optimistic UI     |        | Network available?  |
| Update local state|        |                   |
| (instant feedback)|        +--------+----------+
+-------------------+                 |
                               Yes    |    No
                              +------v------+  +-------------------+
                              | API call    |  | Queue in          |
                              | to Planka   |  | localStorage      |
                              +------+------+  | (offline queue)   |
                                     |          +-------------------+
                              Success| Failure
                             +-------v-------+
                             | Confirm /     |
                             | Revert UI     |
                             +---------------+
```

### Offline Queue Features
- FIFO queue with localStorage persistence
- Optimistic UI updates for instant feedback
- Automatic sync on reconnection
- Conflict resolution: last-write-wins
- Retry with exponential backoff

## 3.7 Environment Configuration

```bash
# LIFF Configuration
VITE_LIFF_ID=your-liff-id-from-line-console

# BFF API (NOT Planka directly — all calls go through BFF)
VITE_API_BASE_URL=https://kanban.yourdomain.com/bff
VITE_WS_URL=wss://kanban.yourdomain.com/bff/ws

# Feature Flags
VITE_ENABLE_OFFLINE_QUEUE=true
VITE_ENABLE_WEBSOCKET=true
VITE_DEV_MOCK_MODE=false
```

> **Note:** Vite requires the `VITE_` prefix (not `REACT_APP_`). Variables without this prefix are silently ignored at build time.

## 3.8 Build & Deploy Guide

### Development Setup

```bash
# 1. Clone repo
git clone <your-repo> planka-liff-app
cd planka-liff-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your LIFF ID and API URLs

# 4. Start dev server
npm run dev

# 5. In another terminal, expose via ngrok
npx ngrok http 5173

# 6. Update LIFF endpoint in LINE Console to ngrok URL
```

### Production Deploy (Vercel)

```bash
# 1. Build
npm run build

# 2. Deploy to Vercel
vercel --prod

# 3. Update LIFF endpoint URL in LINE Console
# Set to: https://your-project.vercel.app
```

---

# Part 4: Integration Architecture

## 4.1 Data Flow: LINE Mini App to Planka

```
+------------------+     +------------------+     +------------------+
|  LINE Mini App   |     |  Planka REST API |     |  PostgreSQL      |
|  (React + LIFF)  |     |  (Nginx + Node)  |     |  (Kanban Data)   |
+------------------+     +------------------+     +------------------+
        |                         |                         |
        | 1. liff.getIDToken()    |                         |
        |------------------------>|                         |
        |                         | 2. Verify with LINE     |
        |                         |    JWK endpoint         |
        |                         |------------------------>|
        |                         |<------------------------|
        |                         | 3. Query/create user    |
        |                         |------------------------>|
        |                         |<------------------------|
        | 4. Return JWT           |                         |
        |<------------------------|                         |
        |                         |                         |
        | 5. Bearer JWT           |                         |
        | GET /api/boards         |                         |
        |------------------------>|                         |
        |                         | 6. Query boards         |
        |                         |------------------------>|
        |                         |<------------------------|
        | 7. Board JSON           |                         |
        |<------------------------|                         |
        |                         |                         |
        | 8. WebSocket connect    |                         |
        | wss://.../socket.io    |                         |
        |<=======================>|                         |
```

## 4.2 WebSocket Real-Time Sync

The WebSocket connection enables real-time collaboration:
- Multiple users viewing the same board see updates instantly
- Card movements, edits, and creations propagate live
- WebSocket events mirror the REST API operations

### WebSocket Events (Client-Side)

| Event Type | Payload | Action |
|------------|---------|--------|
| `card:create` | `{ card: Card }` | Add card to board |
| `card:update` | `{ card: Card, oldValues }` | Update card fields |
| `card:move` | `{ card, sourceListId, targetListId }` | Move card between columns |
| `list:create` | `{ list: Column }` | Add new column |
| `list:update` | `{ list: Column }` | Update column |

## 4.3 Webhook Notifications to LINE

Planka webhooks can push notifications back to LINE:

```
Planka Event (card moved)
       |
       v
+------------------+     +------------------+     +------------------+
| Webhook Handler  |     | LINE Messaging   |     | User's LINE      |
| (Python/FastAPI) | --> | API              | --> | Chat             |
| - Verify HMAC    |     | - Flex Message   |     | - Notification   |
| - Format message |     | - Push message   |     |   with card info |
+------------------+     +------------------+     +------------------+
```

---

# Part 5: Implementation Roadmap

> **Scope note:** This roadmap covers the Kanban core platform (Phases 1–4). For the SME extension modules (membership, miniHR, Google Calendar, MCP), see `extension_blueprint.md` Phase 5–8.
> **Total timeline: 8–10 weeks** (5 weeks core + 3–5 weeks extensions).

## Phase 1: Infrastructure (Week 1)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Provision server (Ubuntu 24.04) | Running VPS |
| 2 | Provision 4 LXC containers on Proxmox | LXC hosts ready |
| 3 | Install PostgreSQL + Redis on DB LXC, install Planka on app LXC | Working backend |
| 4 | Configure Nginx + SSL (Let's Encrypt) | HTTPS ready |
| 5 | Configure security (UFW, Fail2Ban) | Hardened server |
| 6 | Set up PostgreSQL backups | Backup cron job |
| 7 | Configure Planka local admin + API token | Planka API ready |

## Phase 2: BFF Service + Auth (Week 2)

| Day | Task | Deliverable |
|-----|------|-------------|
| 8 | Scaffold BFF service (Node/Fastify or Python/FastAPI) | BFF running on LXC |
| 9 | Implement `POST /bff/auth/line` — verify LIFF idToken with LINE JWK | LINE auth working |
| 10 | BFF proxies Planka API with admin token; issues BFF JWT to LIFF client | End-to-end auth done |
| 11 | Configure CORS for LIFF origin | Cross-origin working |
| 12 | Set up Planka webhook receiver in BFF | Webhook service |
| 13 | Load test BFF + Planka pipeline | Performance baseline |
| 14 | Document BFF API | API docs |

## Phase 3: Frontend Development (Weeks 3–4)

| Week | Task | Deliverable |
|------|------|-------------|
| 3a | Set up React + TypeScript + Vite | Project scaffold |
| 3b | Integrate LIFF SDK | LIFF init working |
| 3c | Implement auth flow (LIFF → BFF token) | Login/logout working |
| 3d | Build Kanban board components | Board UI |
| 3e | Implement drag-and-drop | Card movement |
| 4a | Integrate BFF/Planka API (CRUD) | CRUD operations |
| 4b | Add WebSocket real-time sync | Live updates |
| 4c | Implement offline queue | Offline support |
| 4d | Polish mobile UX | Production-ready UI |

## Phase 4: Testing & Publishing (Week 5)

| Day | Task | Deliverable |
|-----|------|-------------|
| 29 | End-to-end testing (Kanban core) | Bug-free app |
| 30 | LIFF endpoint deploy (Vercel) | Live frontend |
| 31 | Configure LINE Mini App in console | Console setup |
| 32 | LINE Mini App verification submission | Submitted (takes 1–2 weeks for LINE review) |
| 33 | User acceptance testing (UAT) | Core approved |
| 34 | Handover core docs; begin extension development | Transition to Phase 5 |

> **Phases 5–8** (SME Membership → miniHR → Calendar → MCP) are detailed in `extension_blueprint.md`.

---

# Part 6: Resource Requirements

## Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Network | 1 Gbps | 1 Gbps |

## Estimated Costs (Self-Hosted)

| Item | Monthly Cost (USD) |
|------|-------------------|
| VPS (2 vCPU, 2 GB RAM) | $10-20 |
| Domain | $1-2 |
| SSL (Let's Encrypt) | Free |
| Backup storage (S3) | $1-5 |
| **Total** | **$12-27/month** |

---

# Part 7: Operations & Maintenance

## Daily Operations

```bash
# Check service health
systemctl status planka kanban-bff nginx postgresql redis-server

# View logs
journalctl -u planka -f
journalctl -u kanban-bff -f
journalctl -u nginx -f

# Monitor resources
htop

# Database connectivity
pg_isready -h 10.0.10.10 -U planka
redis-cli -h 10.0.10.10 -a REDIS_PASSWORD ping
```

## Backup Strategy

| Type | Schedule | Retention |
|------|----------|-----------|
| Database dump | Daily at 2 AM | 30 days |
| Asset volumes | Weekly | 30 days |
| Full system | Monthly | 90 days |

## Security Maintenance

| Task | Frequency |
|------|-----------|
| Update OS packages | Weekly |
| Update Planka from git | Monthly |
| Update BFF code from git | As needed |
| Rotate secrets | Quarterly |
| Review access logs | Weekly |
| SSL certificate check | Monthly |
| Security patch updates | As needed |

---

# Appendix A: File Structure (Server — Proxmox + LXC)

## kanban-proxy LXC
```
/etc/nginx/
├── nginx.conf                  # Main Nginx config
└── conf.d/
    └── kanban.conf             # Virtual host
/var/www/liff/                  # Built LIFF static files
```

## kanban-db LXC
```
/etc/postgresql/16/main/        # PostgreSQL config
/etc/redis/redis.conf           # Redis config
/opt/kanban/
├── scripts/
│   ├── generate-secrets.sh     # Secret generation
│   └── backup.sh               # Backup script
└── backups/                    # DB backups
```

## kanban-planka LXC
```
/opt/planka/
├── .env                        # Planka environment (secret)
└── ...                         # Planka source + build
```

## kanban-bff LXC
```
/opt/kanban/
├── bff/
│   ├── .env                    # BFF environment (secret)
│   ├── dist/                   # Built BFF
│   └── ...
└── mcp-kanban/
    └── ...                     # MCP server
```

# Appendix B: File Structure (Frontend)

```
planka-liff-app/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── modules/liff/
│   │   ├── liff.ts
│   │   ├── LiffProvider.tsx
│   │   └── useLiff.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── apiClient.ts
│   │   └── websocketService.ts
│   ├── stores/
│   ├── api/
│   ├── hooks/
│   ├── pages/
│   ├── components/
│   └── types/
├── .env
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

# Appendix C: Official References

| Resource | URL |
|----------|-----|
| Planka GitHub | https://github.com/plankanban/planka |
| Planka Documentation | https://docs.planka.cloud/ |
| Planka API (Swagger) | https://docs.planka.cloud/docs/api/ |
| LINE Developers | https://developers.line.biz/ |
| LINE Login | https://developers.line.biz/en/docs/line-login/ |
| LIFF Documentation | https://developers.line.biz/en/docs/liff/ |
| LINE Mini App | https://developers.line.biz/en/docs/line-mini-app/ |

---

> **End of Blueprint**
>
> This document provides a complete, production-ready architecture for building a self-hosted Kanban task management system with a LINE Mini App frontend. All components are open-source and deployable on standard cloud VPS infrastructure.
