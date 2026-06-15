# Self-Hosted Planka + LINE Mini App Integration - System Architecture

> **Document Version:** 1.1
> **Last Updated:** 2026-06-15
> **Status:** Production-Ready Architecture Specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Network Architecture Diagram](#3-network-architecture-diagram)
4. [LXC Deployment Configuration](#4-lxc-deployment-configuration)
5. [Environment Variables Template](#5-environment-variables-template)
6. [API Endpoint Mapping](#6-api-endpoint-mapping)
7. [Security Architecture](#7-security-architecture)
8. [LINE Login Authentication Integration](#8-line-login-authentication-integration)
9. [Webhook Event Architecture](#9-webhook-event-architecture)
10. [Deployment Checklist](#10-deployment-checklist)
11. [Operations & Maintenance](#11-operations--maintenance)
12. [Troubleshooting Guide](#12-troubleshooting-guide)

---

## 1. Executive Summary

This document defines a complete, production-ready self-hosted architecture for integrating **Planka** (open-source Kanban board) with a **LINE Mini App** (LIFF-based frontend). The architecture provides a secure, scalable, and maintainable deployment on **Proxmox VE** using lightweight **LXC containers**, Nginx reverse proxy, PostgreSQL database, Redis caching, and OIDC-based authentication via LINE Login.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Kanban Backend | Planka (built from source) | Mature, open-source, REST API + WebSocket, OIDC support |
| Reverse Proxy | Nginx + Let's Encrypt | Industry standard, SSL termination, rate limiting |
| Database | PostgreSQL 16 | Planka's native supported database |
| Cache/Session | Redis 7 | Session store, API rate limit counters, cache layer |
| Auth Method | OIDC via LINE Login | Native Planka support, seamless LINE Mini App UX |
| SSL Certificates | Let's Encrypt (Certbot) | Free, automated renewal |
| Deployment | Proxmox VE + LXC containers | Lightweight OS-level virtualization, simple orchestration, easy backup |

---

## 2. Technology Stack

### 2.1 Core Services

```
┌─────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY STACK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   LINE Mini  │  │    Nginx     │  │    Planka    │          │
│  │   App (LIFF) │──│ Reverse Proxy│──│    Server    │          │
│  │              │  │   :443/:80   │  │    :1337     │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                              │                  │
│                                       ┌──────┴──────┐          │
│                                       │             │          │
│                                  ┌────┴───┐    ┌────┴───┐      │
│                                  │PostgreSQL│    │ Redis  │      │
│                                  │  :5432   │    │ :6379  │      │
│                                  └──────────┘    └────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Specifications

| Container | Hostname | IP (example) | Spec | Role |
|-----------|----------|--------------|------|------|
| `kanban-db` | `db.kanban.local` | `10.0.10.10` | 1 vCPU / 1 GB RAM / 20 GB | PostgreSQL 16 + Redis 7 |
| `kanban-planka` | `planka.kanban.local` | `10.0.10.11` | 1 vCPU / 1 GB RAM / 20 GB | Planka Kanban server |
| `kanban-bff` | `bff.kanban.local` | `10.0.10.12` | 1 vCPU / 512 MB RAM / 10 GB | BFF + MCP server |
| `kanban-proxy` | `proxy.kanban.local` | `10.0.10.13` | 1 vCPU / 512 MB RAM / 10 GB | Nginx + static LIFF files |

---

## 3. Network Architecture Diagram

### 3.1 Complete Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                          │
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │   LINE App       │  │   LIFF Browser   │  │  LINE Messaging  │                  │
│  │   (Mobile)       │  │   (Frontend)     │  │  API (Webhook)   │                  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                  │
│           │                     │                     │                            │
│           │ HTTPS               │ HTTPS               │ POST webhook               │
│           │                     │                     │                            │
└───────────┼─────────────────────┼─────────────────────┼────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           NGINX REVERSE PROXY (443/80)                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  - SSL/TLS Termination (Let's Encrypt)                                         │  │
│  │  - Rate Limiting (req/sec per IP)                                              │  │
│  │  - CORS Headers for LIFF Origins                                               │  │
│  │  - Static Asset Caching                                                        │  │
│  │  - WebSocket Upgrade Proxying                                                  │  │
│  │  - Webhook Endpoint Routing                                                    │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                   │                                                  │
│           ┌───────────────────────┼───────────────────────┐                         │
│           │                       │                       │                         │
│           ▼                       ▼                       ▼                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐              │
│  │   /app/         │  │   /bff/*        │  │   / (Web UI)            │              │
│  │   LIFF static   │  │   BFF API       │  │   Planka web            │              │
│  │   /var/www/liff │  │   10.0.10.12    │  │   10.0.10.11            │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘              │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
            │
            │ Internal LXC Network: 10.0.10.0/24
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                                       │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                        PLANKA LXC :10.0.10.11 :1337                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │  │
│  │  │   Express    │  │   Sails.js   │  │   WebSocket  │  │  OIDC Auth   │      │  │
│  │  │   REST API   │  │   Framework  │  │   Real-time  │  │  Middleware  │      │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │  │
│  └──────────────────────────────┬────────────────────────────────────────────────┘  │
│                                 │                                                    │
│                                 │ Internal LXC Network                               │
│                                 ▼                                                    │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                         DATABASE LAYER                                         │  │
│  │                                                                                │  │
│  │   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │  │
│  │   │  PostgreSQL  │      │    Redis     │      │   Static     │              │  │
│  │   │  kanban-db   │      │  kanban-db   │      │   Assets     │              │  │
│  │   │  10.0.10.10  │      │  10.0.10.10  │      │ - avatars    │              │  │
│  │   │  Port 5432   │      │  Port 6379   │      │ - backgrounds│              │  │
│  │   │              │      │              │      │ - attachments│              │  │
│  │   │  Kanban Data │      │  Sessions    │      │              │              │  │
│  │   │  User Data   │      │  Rate Limit  │      │              │              │  │
│  │   │  Auth Data   │      │  Cache       │      │              │              │  │
│  │   └──────────────┘      └──────────────┘      └──────────────┘              │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Request Flow Sequences

#### 3.2.1 LIFF App User Request Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│LINE App │───>│LIFF SDK │───>│  Nginx  │───>│ Planka  │───>│ Planka  │───>│   PgSQL │
│ (User)  │    │ (liff.m)│    │  :443   │    │  Router │    │  API    │    │ :5432   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │             │              │              │              │              │
     │ Open LIFF   │              │              │              │              │
     │────────────>│              │              │              │              │
     │             │ GET /boards  │              │              │              │
     │             │─────────────>│              │              │              │
     │             │              │ Proxy Pass   │              │              │
     │             │              │─────────────>│              │              │
     │             │              │              │ Validate     │              │
     │             │              │              │ Bearer Token │              │
     │             │              │              │────┐         │              │
     │             │              │              │    │         │              │
     │             │              │              │<───┘         │              │
     │             │              │              │  Query       │              │
     │             │              │              │─────────────>│              │
     │             │              │              │              │  SQL Query   │
     │             │              │              │              │─────────────>│
     │             │              │              │              │  Result Set  │
     │             │              │              │              │<─────────────│
     │             │              │              │  JSON Data   │              │
     │             │              │              │<─────────────│              │
     │             │              │  HTTP 200 +  │              │              │
     │             │              │ JSON Body    │              │              │
     │             │              │<─────────────│              │              │
     │             │ Render Cards │              │              │              │
     │             │<─────────────│              │              │              │
     │ Display UI  │              │              │              │              │
     │<────────────│              │              │              │              │
```

#### 3.2.2 Real-time WebSocket Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ User A  │    │ User B  │    │  Nginx  │    │ Planka  │
│(Browser)│    │(Browser)│    │ (WS)    │    │ WS Srv  │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │
     │ WS Connect   │              │              │
     │─────────────>│              │              │
     │              │ WS Upgrade   │              │
     │              │─────────────>│ WS Connect   │
     │              │              │─────────────>│
     │              │              │  WS Session  │
     │              │              │<─────────────│
     │ WS Connected │              │              │
     │<─────────────│              │              │
     │              │              │              │
     │ Move Card    │              │              │
     │─────────────>│              │              │
     │              │              │  Card Update │
     │              │              │<─────────────│
     │              │  WS Broadcast│              │
     │              │<─────────────│              │
     │  Card Moved  │              │              │
     │<─────────────│              │              │
```

#### 3.2.3 Webhook Event Flow (Planka → LINE Messaging API)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │    │ Planka  │    │ Webhook │    │  LINE   │    │  User's │
│  Action │    │  Core   │    │ Handler │    │  Push   │    │  LINE   │
│         │    │         │    │ Service │    │   API   │    │  Chat   │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │              │
     │ Move Card    │              │              │              │
     │─────────────>│              │              │              │
     │              │  Event Fired │              │              │
     │              │─────────────>│              │              │
     │              │              │  Process     │              │
     │              │              │  Build Msg   │              │
     │              │              │────┐         │              │
     │              │              │    │         │              │
     │              │              │<───┘         │              │
     │              │              │  POST Push   │              │
     │              │              │  Message     │              │
     │              │              │─────────────>│              │
     │              │              │              │  Deliver     │
     │              │              │              │  Message     │
     │              │              │              │─────────────>│
     │              │              │              │              │ Notify User
     │              │              │              │              │────┐
     │              │              │              │              │    │
     │              │              │              │              │<───┘
```

---

## 4. LXC Deployment Configuration

This section describes the four LXC containers used to run the stack on Proxmox VE. For the full, step-by-step deployment procedure, see `infrastructure/proxmox-lxc-deployment.md`.

### 4.1 Container Overview

| Container | IP Address | Services | Listen Ports | Data Directories |
|-----------|------------|----------|--------------|------------------|
| `kanban-db` | `10.0.10.10` | PostgreSQL 16, Redis 7 | `5432`, `6379` | `/var/lib/postgresql`, `/var/lib/redis` |
| `kanban-planka` | `10.0.10.11` | Planka server | `1337` | `/opt/planka` |
| `kanban-bff` | `10.0.10.12` | BFF API, MCP server | `3000` | `/opt/kanban/bff`, `/opt/kanban/mcp-kanban` |
| `kanban-proxy` | `10.0.10.13` | Nginx reverse proxy, LIFF static files | `80`, `443` | `/etc/nginx`, `/var/www/liff`, `/etc/letsencrypt` |

### 4.2 Container: `kanban-db` (PostgreSQL + Redis)

Install PostgreSQL 16 and Redis 7 directly on the LXC:

```bash
apt update && apt upgrade -y
apt install -y postgresql-16 postgresql-contrib-16 postgresql-client-16 redis-server
```

Create the Planka database and user:

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE planka;
CREATE USER planka WITH ENCRYPTED PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE planka TO planka;
\c planka
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQL
```

Allow access from the internal LXC network. Edit `/etc/postgresql/16/main/postgresql.conf`:

```conf
listen_addresses = '*'
```

Edit `/etc/postgresql/16/main/pg_hba.conf`:

```conf
host    planka    planka    10.0.10.0/24    scram-sha-256
```

Restart PostgreSQL:

```bash
systemctl restart postgresql
```

Configure Redis in `/etc/redis/redis.conf`:

```conf
bind 0.0.0.0
requirepass REPLACE_REDIS_PASSWORD
maxmemory 64mb
maxmemory-policy allkeys-lru
save ""  # disable persistence (optional)
```

Restart Redis:

```bash
systemctl restart redis-server
```

### 4.3 Container: `kanban-planka` (Planka Server)

Install Node.js 20 and build Planka from source:

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential python3

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

cd /opt
git clone https://github.com/plankanban/planka.git
cd planka
npm install
npm run build
```

Create `/opt/planka/.env`:

```bash
BASE_URL=https://kanban.yourdomain.com
DATABASE_URL=postgresql://planka:REPLACE_WITH_STRONG_PASSWORD@10.0.10.10:5432/planka
SECRET_KEY=REPLACE_WITH_64_CHAR_SECRET
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
DEFAULT_ADMIN_NAME=Administrator
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_LANGUAGE=en-US
TRUST_PROXY=true
REDIS_URL=redis://:REPLACE_REDIS_PASSWORD@10.0.10.10:6379
OIDC_ENFORCED=false
LOG_LEVEL=info
```

Create the systemd service at `/etc/systemd/system/planka.service`:

```ini
[Unit]
Description=Planka Kanban Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/planka
Environment=NODE_ENV=production
EnvironmentFile=/opt/planka/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start Planka:

```bash
systemctl daemon-reload
systemctl enable --now planka
```

### 4.4 Container: `kanban-bff` (BFF + MCP)

Install Node.js 20 and deploy the BFF code:

```bash
apt update && apt upgrade -y
apt install -y git curl

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

mkdir -p /opt/kanban
cd /opt/kanban/bff
npm ci
npm run build
npm run migrate
```

Create `/opt/kanban/bff/.env`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://planka:REPLACE_WITH_STRONG_PASSWORD@10.0.10.10:5432/planka
PLANKA_BASE_URL=http://10.0.10.11:1337
PLANKA_ADMIN_EMAIL=admin@yourdomain.com
PLANKA_ADMIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
JWT_SECRET=REPLACE_WITH_64_CHAR_SECRET
JWT_EXPIRES_IN=7d
LINE_CHANNEL_ID=your_line_login_channel_id
LINE_CHANNEL_SECRET=your_line_login_channel_secret
LINE_MESSAGING_TOKEN=your_messaging_api_long_lived_token
ICAL_SECRET=REPLACE_WITH_32_CHAR_SECRET
OFFICE_LAT=13.7563
OFFICE_LNG=100.5018
OFFICE_RADIUS_M=300
APP_DOMAIN=kanban.yourdomain.com
LIFF_ID=your_liff_id
```

Create the systemd service at `/etc/systemd/system/kanban-bff.service`:

```ini
[Unit]
Description=Kanban BFF Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/kanban/bff
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the BFF:

```bash
systemctl daemon-reload
systemctl enable --now kanban-bff
```

The MCP server is usually invoked over STDIO by an MCP client (e.g., Claude Desktop, Cline). To expose it as a standalone service, create a similar systemd unit for `/opt/kanban/mcp-kanban/dist/server.js`.

### 4.5 Container: `kanban-proxy` (Nginx + LIFF Static Files)

Install Nginx and Certbot:

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx
```

Build the LIFF app on a dev machine:

```bash
cd /path/to/liff-app
cp .env.example .env
# fill VITE_LIFF_ID and VITE_API_BASE_URL
npm ci
npm run build
```

Deploy the static files to the proxy LXC:

```bash
rsync -avz liff-app/dist/ root@10.0.10.13:/var/www/liff/
```

Create `/etc/nginx/conf.d/kanban.conf`:

```nginx
server {
    listen 80;
    server_name kanban.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kanban.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/kanban.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kanban.yourdomain.com/privkey.pem;

    # --- LIFF static files ---
    location /app/ {
        alias /var/www/liff/;
        try_files $uri $uri/ /app/index.html;
        add_header Cache-Control "no-cache";
    }

    # --- BFF API ---
    location /bff/ {
        proxy_pass http://10.0.10.12:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Planka WebSocket ---
    location /socket.io/ {
        proxy_pass http://10.0.10.11:1337/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # --- Planka web ---
    location / {
        proxy_pass http://10.0.10.11:1337;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Obtain and install the SSL certificate:

```bash
certbot --nginx -d kanban.yourdomain.com
```

Verify and reload Nginx:

```bash
nginx -t
systemctl restart nginx
```

### 4.6 Nginx Main Configuration (`/etc/nginx/nginx.conf`)

```nginx
# =============================================================================
# NGINX Main Configuration - Planka + LINE Mini App (LXC)
# =============================================================================

user www-data;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # --- Basic Settings ---
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # --- Performance ---
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # --- Gzip Compression ---
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # --- Rate Limiting Zones ---
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=20r/m;
    limit_conn_zone $binary_remote_addr zone=addr_limit:10m;

    # --- SSL Configuration (Modern/Intermediate Profile) ---
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # --- Security Headers ---
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # --- Include Virtual Host Configs ---
    include /etc/nginx/conf.d/*.conf;
}
```

### 4.7 Redis Configuration (`/etc/redis/redis.conf`)

```conf
# =============================================================================
# Redis Configuration - Planka Session Store & Cache
# =============================================================================

# --- Basic Settings ---
bind 0.0.0.0
port 6379
protected-mode yes
requirepass ${REDIS_PASSWORD}

# --- Memory Management ---
maxmemory 64mb
maxmemory-policy allkeys-lru

# --- Persistence (for session durability) ---
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# --- Security ---
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# --- Logging ---
loglevel notice

# --- Connection Limits ---
maxclients 100
timeout 300
tcp-keepalive 60
```

### 4.8 PostgreSQL Tuning (`/etc/postgresql/16/main/postgresql.conf`)

```conf
# Optimizations for Planka workload
shared_buffers = 128MB
effective_cache_size = 384MB
maintenance_work_mem = 32MB
wal_buffers = 4MB
work_mem = 4MB
max_connections = 100
log_statement = mod
log_duration = on
log_min_duration_statement = 1000
```

Create a read-only backup role:

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backup_user') THEN
        CREATE ROLE backup_user WITH LOGIN PASSWORD '${BACKUP_PASSWORD}';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE planka TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;
```

---

## 5. Environment Variables Template

Create environment files from these templates on each LXC. **NEVER commit these files to version control.**

### 5.1 Planka Environment (`/opt/planka/.env`)

```bash
# =============================================================================
# PLANKA + LINE MINI APP - ENVIRONMENT VARIABLES
# =============================================================================
# Copy this file to /opt/planka/.env and fill in all required values.
# Generate secure values with: openssl rand -base64 48
# =============================================================================

# -----------------------------------------------------------------------------
# DOMAIN & BASE URL
# -----------------------------------------------------------------------------
# Your public domain where Planka will be accessible
BASE_URL=https://kanban.yourdomain.com

# -----------------------------------------------------------------------------
# SECURITY - SECRET KEY
# -----------------------------------------------------------------------------
# Generate with: openssl rand -base64 48
# This is used for session encryption and JWT signing
SECRET_KEY=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_48

# -----------------------------------------------------------------------------
# POSTGRESQL DATABASE
# -----------------------------------------------------------------------------
# Use the kanban-db LXC IP (10.0.10.10)
DATABASE_URL=postgresql://planka:CHANGE_ME_DB_PASSWORD@10.0.10.10:5432/planka

# -----------------------------------------------------------------------------
# REDIS
# -----------------------------------------------------------------------------
# Use the kanban-db LXC IP (10.0.10.10)
REDIS_URL=redis://:CHANGE_ME_REDIS_PASSWORD@10.0.10.10:6379

# -----------------------------------------------------------------------------
# DEFAULT ADMIN USER (Only used on first startup)
# -----------------------------------------------------------------------------
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_USERNAME=admin
# Generate a strong password for the admin account
DEFAULT_ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD
DEFAULT_ADMIN_NAME="System Administrator"

# -----------------------------------------------------------------------------
# LOCALIZATION
# -----------------------------------------------------------------------------
DEFAULT_LANGUAGE=en-US

# -----------------------------------------------------------------------------
# OIDC / LINE LOGIN CONFIGURATION
# -----------------------------------------------------------------------------
# LINE Login OIDC Discovery endpoint
OIDC_ISSUER=https://access.line.me

# Your LINE Login Channel ID (from LINE Developers Console)
OIDC_CLIENT_ID=YOUR_LINE_CHANNEL_ID

# Your LINE Login Channel Secret (from LINE Developers Console)
OIDC_CLIENT_SECRET=YOUR_LINE_CHANNEL_SECRET

# Scopes to request (openid is required for OIDC)
OIDC_SCOPES=openid profile email

# LINE uses fragment response mode by default
OIDC_RESPONSE_MODE=fragment
OIDC_USE_DEFAULT_RESPONSE_MODE=false

# Use explicit OAuth callback flow (recommended for LINE)
OIDC_USE_OAUTH_CALLBACK=true

# LINE uses ES256 for ID token signing
OIDC_ID_TOKEN_SIGNED_RESPONSE_ALG=ES256

# Source claims from userinfo endpoint (LINE's default)
OIDC_CLAIMS_SOURCE=userinfo

# Attribute mappings (LINE specific)
OIDC_EMAIL_ATTRIBUTE=email
OIDC_NAME_ATTRIBUTE=name
OIDC_USERNAME_ATTRIBUTE=sub
OIDC_ROLES_ATTRIBUTE=groups

# Ignore username from LINE (use email-based matching)
OIDC_IGNORE_USERNAME=true

# Ignore role mappings (manage roles in Planka)
OIDC_IGNORE_ROLES=true

# Set to true to disable local auth and enforce LINE Login only
OIDC_ENFORCED=false

# -----------------------------------------------------------------------------
# TRUST PROXY (Required when behind Nginx)
# -----------------------------------------------------------------------------
TRUST_PROXY=true

# -----------------------------------------------------------------------------
# SMTP / EMAIL NOTIFICATIONS (Optional)
# -----------------------------------------------------------------------------
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="Planka Kanban <noreply@example.com>"

# -----------------------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------------------
LOG_LEVEL=info

# -----------------------------------------------------------------------------
# KNEX / DATABASE SSL
# -----------------------------------------------------------------------------
KNEX_REJECT_UNAUTHORIZED_SSL_CERTIFICATE=true
```

### 5.2 BFF Environment (`/opt/kanban/bff/.env`)

```bash
NODE_ENV=production
PORT=3000

# Use the kanban-db LXC IP (10.0.10.10)
DATABASE_URL=postgresql://planka:CHANGE_ME_DB_PASSWORD@10.0.10.10:5432/planka

# Use the kanban-planka LXC IP (10.0.10.11)
PLANKA_BASE_URL=http://10.0.10.11:1337
PLANKA_ADMIN_EMAIL=admin@yourdomain.com
PLANKA_ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD

JWT_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_48
JWT_EXPIRES_IN=7d

LINE_CHANNEL_ID=YOUR_LINE_CHANNEL_ID
LINE_CHANNEL_SECRET=YOUR_LINE_CHANNEL_SECRET
LINE_MESSAGING_TOKEN=YOUR_MESSAGING_API_LONG_LIVED_TOKEN

ICAL_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_24

OFFICE_LAT=13.7563
OFFICE_LNG=100.5018
OFFICE_RADIUS_M=300

APP_DOMAIN=kanban.yourdomain.com
LIFF_ID=your_liff_id
```

### 5.3 Secure Password Generation Script

```bash
#!/bin/bash
# generate-secrets.sh - Generate secure secrets for all environment files
# Usage: ./generate-secrets.sh

echo "=== Generating Secure Secrets for Planka + BFF ==="
echo ""
echo "# Copy these values into the relevant .env files:"
echo ""
echo "SECRET_KEY=$(openssl rand -base64 48)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
echo "DEFAULT_ADMIN_PASSWORD=$(openssl rand -base64 16)"
echo "BFF_JWT_SECRET=$(openssl rand -base64 48)"
echo "ICAL_SECRET=$(openssl rand -base64 24)"
echo "BACKUP_PASSWORD=$(openssl rand -base64 24)"
echo ""
echo "=== Done. Keep these values secure and never commit them. ==="
```

---

## 6. API Endpoint Mapping

### 6.1 Base URL & Authentication

| Property | Value |
|----------|-------|
| Base URL | `https://kanban.yourdomain.com` |
| API Prefix | `/api` |
| Authentication | Bearer Token (`Authorization: Bearer <token>`) |
| Content-Type | `application/json` |

### 6.2 Authentication Endpoints

#### 6.2.1 Local Authentication (Login)

| | |
|---|---|
| **Endpoint** | `POST /api/users/auth/native` |
| **Headers** | `Content-Type: application/json` |
| **Body** | ```json { "email": "user@example.com", "password": "yourpassword", "username": "optional_username" } ``` |
| **Response 200** | ```json { "item": { "id": "user-id", "email": "user@example.com", "username": "username", "name": "User Name", "avatar": null, "phone": null, "organization": null, "language": "en-US", "subscribeToOwnCards": false, "dueDateNotificationSubscription": "all", "notificationSound": null, "createdAt": "2024-01-01T00:00:00.000Z", "updatedAt": "2024-01-01T00:00:00.000Z", "isAdmin": false }, "accessToken": "eyJhbGciOiJIUzI1NiIs...", "refreshToken": "eyJhbGciOiJIUzI1NiIs..." } ``` |

#### 6.2.2 OIDC Authentication (LINE Login)

| | |
|---|---|
| **Endpoint** | `GET /api/users/auth/oidc` |
| **Headers** | None (browser redirect) |
| **Description** | Initiates OIDC login flow. Redirects to LINE Login authorization endpoint. |
| **Response** | HTTP 302 Redirect to LINE Login (`https://access.line.me/oauth2/v2.1/authorize`) |

#### 6.2.3 OIDC Callback

| | |
|---|---|
| **Endpoint** | `GET /api/users/auth/oidc/callback` |
| **Headers** | None (handled by browser) |
| **Query Params** | `code`, `state` (returned by LINE) |
| **Description** | Callback endpoint after LINE Login authorization. Exchanges code for tokens. |
| **Response 200** | Sets session cookie, redirects to Planka SPA |

#### 6.2.4 Token Refresh

| | |
|---|---|
| **Endpoint** | `POST /api/users/auth/token` |
| **Headers** | `Content-Type: application/json` |
| **Body** | ```json { "refreshToken": "eyJhbGciOiJIUzI1NiIs..." } ``` |
| **Response 200** | ```json { "accessToken": "eyJhbGciOiJIUzI1NiIs...", "refreshToken": "eyJhbGciOiJIUzI1NiIs..." } ``` |

#### 6.2.5 Logout

| | |
|---|---|
| **Endpoint** | `POST /api/users/auth/logout` |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Response 204** | No content, session invalidated |

### 6.3 Board Endpoints

#### 6.3.1 List All Boards (by Project)

| | |
|---|---|
| **Endpoint** | `GET /api/projects/:projectId/boards` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "items": [ { "id": "board-id-1", "name": "Development Board", "position": 0, "projectId": "project-id", "createdAt": "2024-01-01T00:00:00.000Z", "updatedAt": "2024-01-01T00:00:00.000Z", "lists": [...] } ] } ``` |

#### 6.3.2 Get Board by ID

| | |
|---|---|
| **Endpoint** | `GET /api/boards/:boardId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Query Params** | `?boardId=<id>` |
| **Response 200** | ```json { "item": { "id": "board-id", "name": "Development Board", "position": 0, "projectId": "project-id", "lists": [ { "id": "list-1", "name": "To Do", "position": 0, "cards": [...] } ], "labels": [...], "memberships": [...], "createdAt": "2024-01-01T00:00:00.000Z", "updatedAt": "2024-01-01T00:00:00.000Z" } } ``` |

#### 6.3.3 Create Board

| | |
|---|---|
| **Endpoint** | `POST /api/projects/:projectId/boards` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "New Board", "position": 1 } ``` |
| **Response 200** | ```json { "item": { "id": "new-board-id", "name": "New Board", "position": 1, "projectId": "project-id", "createdAt": "2024-01-01T00:00:00.000Z", "updatedAt": "2024-01-01T00:00:00.000Z" } } ``` |

#### 6.3.4 Update Board

| | |
|---|---|
| **Endpoint** | `PATCH /api/boards/:boardId` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "Updated Board Name", "position": 0 } ``` |
| **Response 200** | ```json { "item": { "id": "board-id", "name": "Updated Board Name", "position": 0, "projectId": "project-id", "createdAt": "2024-01-01T00:00:00.000Z", "updatedAt": "2024-01-01T00:00:01.000Z" } } ``` |

#### 6.3.5 Delete Board

| | |
|---|---|
| **Endpoint** | `DELETE /api/boards/:boardId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "id": "board-id", "name": "Deleted Board" } } ``` |

### 6.4 List (Column) Endpoints

#### 6.4.1 Create List

| | |
|---|---|
| **Endpoint** | `POST /api/boards/:boardId/lists` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "In Progress", "position": 1, "color": "blue" } ``` |
| **Response 200** | ```json { "item": { "id": "list-id", "name": "In Progress", "position": 1, "boardId": "board-id", "color": "blue", "createdAt": "2024-01-01T00:00:00.000Z" } } ``` |

#### 6.4.2 Update List

| | |
|---|---|
| **Endpoint** | `PATCH /api/lists/:listId` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "Updated List Name", "position": 2, "color": "green" } ``` |
| **Response 200** | ```json { "item": { "id": "list-id", "name": "Updated List Name", "position": 2, "color": "green" } } ``` |

#### 6.4.3 Delete List

| | |
|---|---|
| **Endpoint** | `DELETE /api/lists/:listId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "id": "list-id", "name": "Deleted List" } } ``` |

#### 6.4.4 Reorder Lists

| | |
|---|---|
| **Endpoint** | `POST /api/lists/:listId/positions` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "position": 3 } ``` |
| **Response 200** | ```json { "item": { "id": "list-id", "position": 3 } } ``` |

### 6.5 Card Endpoints

#### 6.5.1 Create Card

| | |
|---|---|
| **Endpoint** | `POST /api/lists/:listId/cards` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "Implement feature X", "position": 0, "description": "Detailed description here", "dueDate": "2024-12-31T23:59:59.000Z" } ``` |
| **Response 200** | ```json { "item": { "id": "card-id", "name": "Implement feature X", "position": 0, "listId": "list-id", "boardId": "board-id", "description": "Detailed description here", "dueDate": "2024-12-31T23:59:59.000Z", "creatorUserId": "user-id", "createdAt": "2024-01-01T00:00:00.000Z" } } ``` |

#### 6.5.2 Get Card Details

| | |
|---|---|
| **Endpoint** | `GET /api/cards/:cardId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "id": "card-id", "name": "Implement feature X", "position": 0, "listId": "list-id", "boardId": "board-id", "description": "Detailed description", "dueDate": "2024-12-31T23:59:59.000Z", "creatorUserId": "user-id", "assignees": [...], "labels": [...], "tasks": [...], "attachments": [...], "activities": [...], "createdAt": "2024-01-01T00:00:00.000Z", "updatedAt": "2024-01-01T00:00:00.000Z" } } ``` |

#### 6.5.3 Update Card

| | |
|---|---|
| **Endpoint** | `PATCH /api/cards/:cardId` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "Updated card name", "description": "Updated description", "dueDate": "2025-01-15T12:00:00.000Z" } ``` |
| **Response 200** | ```json { "item": { "id": "card-id", "name": "Updated card name", "description": "Updated description", "dueDate": "2025-01-15T12:00:00.000Z", "updatedAt": "2024-01-01T00:00:01.000Z" } } ``` |

#### 6.5.4 Move Card Between Lists

| | |
|---|---|
| **Endpoint** | `POST /api/cards/:cardId/positions` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "listId": "target-list-id", "position": 2 } ``` |
| **Response 200** | ```json { "item": { "id": "card-id", "listId": "target-list-id", "position": 2 } } ``` |

#### 6.5.5 Delete Card

| | |
|---|---|
| **Endpoint** | `DELETE /api/cards/:cardId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "id": "card-id", "name": "Deleted Card" } } ``` |

### 6.6 Label Endpoints

#### 6.6.1 Create Label

| | |
|---|---|
| **Endpoint** | `POST /api/boards/:boardId/labels` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "name": "Bug", "color": "red" } ``` |
| **Response 200** | ```json { "item": { "id": "label-id", "name": "Bug", "color": "red", "boardId": "board-id" } } ``` |

#### 6.6.2 List Board Labels

| | |
|---|---|
| **Endpoint** | `GET /api/boards/:boardId/labels` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "items": [ { "id": "label-1", "name": "Bug", "color": "red" }, { "id": "label-2", "name": "Feature", "color": "blue" } ] } ``` |

#### 6.6.3 Assign Label to Card

| | |
|---|---|
| **Endpoint** | `POST /api/cards/:cardId/labels` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "labelId": "label-id" } ``` |
| **Response 200** | ```json { "item": { "cardId": "card-id", "labelId": "label-id" } } ``` |

#### 6.6.4 Remove Label from Card

| | |
|---|---|
| **Endpoint** | `DELETE /api/cards/:cardId/labels/:labelId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "cardId": "card-id", "labelId": "label-id" } } ``` |

### 6.7 Member Endpoints

#### 6.7.1 List Board Members

| | |
|---|---|
| **Endpoint** | `GET /api/boards/:boardId/memberships` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "items": [ { "id": "membership-id", "boardId": "board-id", "userId": "user-id", "role": "editor", "user": { "id": "user-id", "name": "John Doe", "email": "john@example.com", "avatar": null } } ] } ``` |

#### 6.7.2 Assign Member to Card

| | |
|---|---|
| **Endpoint** | `POST /api/cards/:cardId/memberships` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "userId": "user-id" } ``` |
| **Response 200** | ```json { "item": { "id": "membership-id", "cardId": "card-id", "userId": "user-id" } } ``` |

#### 6.7.3 Remove Member from Card

| | |
|---|---|
| **Endpoint** | `DELETE /api/cards/:cardId/memberships/:userId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "cardId": "card-id", "userId": "user-id" } } ``` |

### 6.8 Webhook Endpoints

#### 6.8.1 Register Webhook

| | |
|---|---|
| **Endpoint** | `POST /api/projects/:projectId/webhooks` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | ```json { "url": "https://your-webhook-handler.com/webhook/planka", "events": ["cardCreate", "cardUpdate", "cardDelete", "cardMove"], "secret": "your-webhook-signing-secret" } ``` |
| **Response 200** | ```json { "item": { "id": "webhook-id", "url": "https://your-webhook-handler.com/webhook/planka", "events": ["cardCreate", "cardUpdate", "cardDelete", "cardMove"], "isEnabled": true, "createdAt": "2024-01-01T00:00:00.000Z" } } ``` |

#### 6.8.2 List Webhooks

| | |
|---|---|
| **Endpoint** | `GET /api/projects/:projectId/webhooks` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "items": [ { "id": "webhook-id", "url": "https://your-webhook-handler.com/webhook/planka", "events": [...], "isEnabled": true } ] } ``` |

#### 6.8.3 Delete Webhook

| | |
|---|---|
| **Endpoint** | `DELETE /api/webhooks/:webhookId` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response 200** | ```json { "item": { "id": "webhook-id" } } ``` |

### 6.9 Complete API Endpoint Summary

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Auth** | POST | `/api/users/auth/native` | Local login |
| **Auth** | GET | `/api/users/auth/oidc` | Initiate OIDC login |
| **Auth** | GET | `/api/users/auth/oidc/callback` | OIDC callback |
| **Auth** | POST | `/api/users/auth/token` | Refresh access token |
| **Auth** | POST | `/api/users/auth/logout` | Logout |
| **Board** | GET | `/api/projects/:id/boards` | List boards |
| **Board** | GET | `/api/boards/:id` | Get board |
| **Board** | POST | `/api/projects/:id/boards` | Create board |
| **Board** | PATCH | `/api/boards/:id` | Update board |
| **Board** | DELETE | `/api/boards/:id` | Delete board |
| **List** | POST | `/api/boards/:id/lists` | Create list |
| **List** | PATCH | `/api/lists/:id` | Update list |
| **List** | DELETE | `/api/lists/:id` | Delete list |
| **List** | POST | `/api/lists/:id/positions` | Reorder list |
| **Card** | GET | `/api/cards/:id` | Get card details |
| **Card** | POST | `/api/lists/:id/cards` | Create card |
| **Card** | PATCH | `/api/cards/:id` | Update card |
| **Card** | DELETE | `/api/cards/:id` | Delete card |
| **Card** | POST | `/api/cards/:id/positions` | Move card |
| **Label** | GET | `/api/boards/:id/labels` | List labels |
| **Label** | POST | `/api/boards/:id/labels` | Create label |
| **Label** | POST | `/api/cards/:id/labels` | Assign label |
| **Label** | DELETE | `/api/cards/:id/labels/:id` | Remove label |
| **Member** | GET | `/api/boards/:id/memberships` | List members |
| **Member** | POST | `/api/cards/:id/memberships` | Assign member |
| **Member** | DELETE | `/api/cards/:id/memberships/:id` | Remove member |
| **Webhook** | GET | `/api/projects/:id/webhooks` | List webhooks |
| **Webhook** | POST | `/api/projects/:id/webhooks` | Create webhook |
| **Webhook** | DELETE | `/api/webhooks/:id` | Delete webhook |

### 6.10 Available Webhook Events

| Event Name | Description |
|------------|-------------|
| `cardCreate` | Card created |
| `cardUpdate` | Card updated (name, description, due date) |
| `cardDelete` | Card deleted |
| `cardMove` | Card moved to different list |
| `cardMembershipCreate` | User assigned to card |
| `cardMembershipDelete` | User removed from card |
| `cardLabelCreate` | Label added to card |
| `cardLabelDelete` | Label removed from card |
| `cardCommentCreate` | Comment added to card |
| `cardDueDateUpdate` | Card due date changed |
| `listCreate` | List created |
| `listUpdate` | List updated |
| `listDelete` | List deleted |
| `listMove` | List reordered |
| `boardCreate` | Board created |
| `boardUpdate` | Board updated |
| `boardDelete` | Board deleted |

---

## 7. Security Architecture

### 7.1 Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Network Perimeter                                                  │
│  ├── Cloudflare / CDN (optional)                                             │
│  ├── Firewall (UFW) - Ports 22, 80, 443 only                                │
│  └── Fail2Ban - Brute force protection                                       │
│                                                                              │
│  Layer 2: Transport Security                                                 │
│  ├── TLS 1.2+ (Let's Encrypt)                                                │
│  ├── HSTS Header                                                             │
│  └── Certificate auto-renewal                                                │
│                                                                              │
│  Layer 3: Application Gateway (Nginx)                                        │
│  ├── Rate Limiting (per IP)                                                  │
│  ├── Request size limiting (50MB)                                            │
│  ├── CORS policy for LIFF origins only                                       │
│  └── Security headers (XSS, CSRF, Clickjacking)                              │
│                                                                              │
│  Layer 4: Planka Application                                                 │
│  ├── OIDC Authentication (LINE Login)                                        │
│  ├── Bearer token validation                                                 │
│  ├── Input sanitization                                                      │
│  └── Session management via Redis                                            │
│                                                                              │
│  Layer 5: Data Security                                                      │
│  ├── PostgreSQL password auth                                                │
│  ├── Redis password auth                                                     │
│  ├── Encrypted volume backups                                                │
│  └── No secrets in code/images                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Reverse Proxy Security

Planka runs behind Nginx with the following security measures:

| Measure | Implementation | Config Location |
|---------|---------------|-----------------|
| SSL/TLS | Let's Encrypt certificates | `/etc/nginx/conf.d/kanban.conf` |
| TLS Version | Minimum TLS 1.2 | `/etc/nginx/nginx.conf` |
| Rate Limiting | 30 req/min API, 5 req/min auth | `/etc/nginx/nginx.conf` |
| Max Body Size | 50MB (for attachments) | `/etc/nginx/nginx.conf` |
| Trust Proxy | `TRUST_PROXY=true` in Planka | `/opt/planka/.env` |
| Security Headers | X-Frame-Options, CSP, etc. | `/etc/nginx/nginx.conf` |
| WebSocket Proxy | Upgrade headers for /socket.io/ | `/etc/nginx/conf.d/kanban.conf` |

### 7.3 CORS Configuration for LIFF

The Nginx configuration restricts CORS to known LIFF origins:

```nginx
map $http_origin $cors_origin {
    default "";
    "https://liff.line.me" $http_origin;
    "https://your-liff-app-url" $http_origin;
}
```

This ensures:
- Only LINE's LIFF runtime and your specific LIFF app can make cross-origin requests
- Credentials (cookies/auth headers) are only sent to trusted origins
- Preflight requests are handled efficiently with 24h cache

### 7.4 Rate Limiting Strategy

| Endpoint Zone | Rate | Burst | Scope | Purpose |
|--------------|------|-------|-------|---------|
| `api_limit` | 30 req/min | 15 | Per IP | General API protection |
| `auth_limit` | 5 req/min | 5 | Per IP | Brute force prevention |
| `webhook_limit` | 20 req/min | 10 | Per IP | Webhook endpoint protection |
| `addr_limit` | - | - | Per IP | Max 10 concurrent connections |

Redis-backed rate limiting can be added for distributed deployments.

### 7.5 API Token Management

**Token Flow:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   LIFF App   │────>│ Planka Auth  │────>│    Redis     │
│              │     │   Endpoint   │     │   Session    │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                    ┌───────┴───────┐
                    │  JWT Tokens   │
                    │               │
                    │ Access Token  │  ── 15 min expiry
                    │ Refresh Token │  ── 7 day expiry
                    └───────────────┘
```

**Token Security:**
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Tokens are signed with `SECRET_KEY` (48+ byte random)
- Refresh tokens are stored in Redis with rotation (single use)
- Token transmission uses HTTPS only

### 7.6 Webhook Signature Verification

When Planka sends webhook events, sign them with a shared secret:

```python
# webhook-handler.py - Example signature verification
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify webhook signature using HMAC-SHA256.
    
    Args:
        payload: Raw request body bytes
        signature: Signature from X-Webhook-Signature header
        secret: Shared webhook secret
    
    Returns:
        True if signature is valid
    """
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

# Usage in Flask/FastAPI handler:
# @app.post("/webhook/planka")
# async def handle_webhook(request: Request):
#     body = await request.body()
#     signature = request.headers.get("X-Webhook-Signature")
#     if not verify_webhook_signature(body, signature, WEBHOOK_SECRET):
#         raise HTTPException(401, "Invalid signature")
```

### 7.7 Database Backup Strategy

#### Automated Daily Backups

```bash
#!/bin/bash
# /opt/kanban/scripts/backup.sh
# Run via cron on kanban-db: 0 2 * * * /opt/kanban/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/kanban/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="planka"
DB_USER="planka"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_FILE="${BACKUP_DIR}/planka_${DATE}.sql.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# PostgreSQL backup
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# Clean old backups
find "${BACKUP_DIR}" -name "planka_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: ${BACKUP_FILE}"
```

Install the cron job on `kanban-db`:

```bash
chmod +x /opt/kanban/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/kanban/scripts/backup.sh") | crontab -
```

#### Backup Restoration

```bash
#!/bin/bash
# /opt/kanban/scripts/restore.sh
# Usage: ./restore.sh planka_20240101_020000.sql.gz

set -euo pipefail

BACKUP_FILE="$1"
DB_NAME="planka"
DB_USER="planka"
DB_HOST="localhost"
DB_PORT="5432"

echo "Restoring database from ${BACKUP_FILE}..."

# Stop Planka
ssh root@10.0.10.11 systemctl stop planka

# Drop and recreate database
sudo -u postgres dropdb -h "${DB_HOST}" -p "${DB_PORT}" "${DB_NAME}" || true
sudo -u postgres createdb -h "${DB_HOST}" -p "${DB_PORT}" -O "${DB_USER}" "${DB_NAME}"

# Restore from backup
gunzip < "${BACKUP_FILE}" | sudo -u postgres psql -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}"

# Restart Planka
ssh root@10.0.10.11 systemctl start planka

echo "Restore completed."
```

### 7.8 Security Checklist

- [ ] All secrets generated with `openssl rand -base64 48` and stored in `.env`
- [ ] `.env` files have `chmod 600` permissions
- [ ] `.env` files added to `.gitignore`
- [ ] Firewall configured: only 22, 80, 443 open on `kanban-proxy`
- [ ] Database ports accessible only from `10.0.10.0/24`
- [ ] SSH key-based auth only (no password login)
- [ ] Automatic security updates enabled (`unattended-upgrades`)
- [ ] Fail2Ban configured for SSH and HTTP brute force protection
- [ ] SSL Labs A+ rating on SSL configuration
- [ ] Database not exposed to public (internal LXC network only)
- [ ] Redis password-protected, not exposed publicly
- [ ] Services run under dedicated user accounts where possible
- [ ] Resource limits set on all LXC containers
- [ ] Health checks configured on all services

---

## 8. LINE Login Authentication Integration

### 8.1 LINE Login OIDC Configuration

LINE Login supports OpenID Connect 1.0. Key endpoints:

| Endpoint | URL |
|----------|-----|
| Discovery | `https://access.line.me/.well-known/openid-configuration` |
| Authorization | `https://access.line.me/oauth2/v2.1/authorize` |
| Token | `https://api.line.me/oauth2/v2.1/token` |
| UserInfo | `https://api.line.me/oauth2/v2.1/userinfo` |
| JWKS (Certs) | `https://api.line.me/oauth2/v2.1/certs` |
| Revocation | `https://api.line.me/oauth2/v2.1/revoke` |

### 8.2 Option A: Planka Native OIDC with LINE Login

**Architecture:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   LIFF App   │────>│    Planka    │────>│   LINE Login OIDC    │
│              │     │   OIDC Auth  │     │   access.line.me     │
└──────────────┘     └──────────────┘     └──────────────────────┘
                           │
                     ┌─────┴──────┐
                     │  Planka    │
                     │  User DB   │
                     └────────────┘
```

**Configuration in `/opt/planka/.env`:**

```bash
OIDC_ISSUER=https://access.line.me
OIDC_CLIENT_ID=YOUR_LINE_CHANNEL_ID
OIDC_CLIENT_SECRET=YOUR_LINE_CHANNEL_SECRET
OIDC_SCOPES=openid profile email
OIDC_RESPONSE_MODE=fragment
OIDC_USE_OAUTH_CALLBACK=true
OIDC_ID_TOKEN_SIGNED_RESPONSE_ALG=ES256
OIDC_CLAIMS_SOURCE=userinfo
OIDC_EMAIL_ATTRIBUTE=email
OIDC_NAME_ATTRIBUTE=name
OIDC_USERNAME_ATTRIBUTE=sub
OIDC_IGNORE_USERNAME=true
OIDC_IGNORE_ROLES=true
OIDC_ENFORCED=false
```

**Pros:**
- Native Planka support, no additional infrastructure
- Automatic user provisioning (auto-create on first login)
- Account linking by email address
- Session managed by Planka's existing system

**Cons:**
- LINE's non-standard `id_token_key_type=JWK` parameter may cause issues
- Limited customization of the auth flow
- LINE's `sub` claim used as username (not human-readable)

### 8.3 Option B: Separate Auth Proxy/Service

**Architecture:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   LIFF App   │────>│   LINE SDK   │────>│   LINE Login         │
│              │     │  (liff.init) │     │   (Built-in LIFF)    │
└──────┬───────┘     └──────────────┘     └──────────────────────┘
       │
       │ Access Token (from LIFF)
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Custom     │────>│   Planka     │────>│   Planka     │
│ Auth Service │     │   API Key    │     │   Backend    │
│ (Middleware) │     │   Auth       │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Implementation:**

```python
# auth-proxy.py - FastAPI middleware example
from fastapi import FastAPI, HTTPException, Depends
from linebot.v3.messaging import MessagingApi
import httpx
import jwt

app = FastAPI()
PLANKA_BASE_URL = "https://kanban.yourdomain.com"
PLANKA_WEBHOOK_SECRET = "your-webhook-secret"

async def verify_line_token(liff_access_token: str) -> dict:
    """Verify LIFF access token with LINE API."""
    async with httpx.AsyncClient() as client:
        # Get user profile from LINE
        response = await client.get(
            "https://api.line.me/oauth2/v2.1/userinfo",
            headers={"Authorization": f"Bearer {liff_access_token}"}
        )
        if response.status_code != 200:
            raise HTTPException(401, "Invalid LINE token")
        return response.json()

async def get_planka_service_token(user_data: dict) -> str:
    """Get or create Planka token for LINE user."""
    # Check if user exists in Planka
    async with httpx.AsyncClient() as client:
        # Use Planka admin API to create/impersonate user
        # Return service token
        pass

@app.post("/api/v1/auth/line")
async def auth_with_line(liff_token: str):
    """
    Exchange LIFF access token for Planka-compatible token.
    
    1. Verify LIFF token with LINE
    2. Find or create Planka user
    3. Generate Planka access token
    """
    line_user = await verify_line_token(liff_token)
    planka_token = await get_planka_service_token(line_user)
    return {
        "planka_access_token": planka_token["accessToken"],
        "planka_refresh_token": planka_token["refreshToken"],
        "user": {
            "line_id": line_user["sub"],
            "name": line_user.get("name"),
            "email": line_user.get("email")
        }
    }
```

**Pros:**
- Full control over authentication flow
- LINE SDK integration with LIFF (no redirects)
- Can map LINE profiles to Planka users flexibly
- Token exchange pattern isolates concerns

**Cons:**
- Additional service to maintain
- Custom code to manage
- Need to handle Planka token lifecycle

### 8.4 Recommendation: Hybrid Approach

**Recommended Architecture:**

Use **Option A (Native OIDC)** for the initial integration with a **fallback to local auth** for admin access:

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Regular Users ──> LINE Login OIDC ──> Auto-provisioned        │
│  (via LIFF)           (Planka native)    Planka account        │
│                                                                  │
│  Admin Users ────> Local Auth ──────> Pre-configured admin     │
│  (fallback)          (direct login)    account                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Planka Config:                                          │    │
│  │  OIDC_ENFORCED=false  (keep local auth for admins)       │    │
│  │  DEFAULT_ADMIN_*  (protected admin account)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Justification:**

| Factor | Option A | Option B | Hybrid |
|--------|----------|----------|--------|
| Implementation Complexity | Low | High | Medium |
| Infrastructure Overhead | None | +1 Service | None |
| Maintenance Burden | Low | High | Low |
| Customization Flexibility | Limited | High | Medium |
| Security | Good | Good | Good |
| LIFF Integration UX | Redirect-based | Seamless | Redirect-based |
| Recovery Admin Access | Local fallback | Via proxy | Local fallback |

The Hybrid approach provides:
1. **Simplicity** - Use Planka's built-in OIDC (battle-tested)
2. **Reliability** - Local admin account as fallback if LINE Login fails
3. **Maintainability** - No custom auth service to maintain
4. **Security** - OIDC_ENFORCED can be toggled based on needs

**Important Note for LINE OIDC:**

LINE Login requires a special parameter `id_token_key_type=JWK` when calling the token endpoint to receive properly signed ES256 ID tokens. As of recent Planka versions, this is handled automatically in the OIDC callback flow. If you encounter JWT signature validation errors, ensure:

1. `OIDC_USE_OAUTH_CALLBACK=true` is set
2. `OIDC_ID_TOKEN_SIGNED_RESPONSE_ALG=ES256` matches LINE's algorithm
3. Planka version is up to date

---

## 9. Webhook Event Architecture

### 9.1 Webhook Event Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK EVENT PROCESSING                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Planka Event                                                        │
│      │                                                               │
│      ▼                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │   Event      │───>│   N8n /      │───>│   LINE       │           │
│  │   Dispatcher │    │   Custom     │    │   Messaging  │           │
│  │              │    │   Handler    │    │   API        │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│                             │                                         │
│                             ▼                                         │
│                    ┌──────────────────┐                              │
│                    │  Transform       │                              │
│                    │  Format message  │                              │
│                    │  Add Flex UI     │                              │
│                    │  Call LINE API   │                              │
│                    └──────────────────┘                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Webhook Handler Service

```python
# webhook-service.py - Example webhook handler for LINE notifications
from fastapi import FastAPI, Request, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import hmac
import hashlib
import httpx
import os

app = FastAPI(title="Planka Webhook Handler")

# Configuration
LINE_CHANNEL_ACCESS_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
PLANKA_WEBHOOK_SECRET = os.environ["PLANKA_WEBHOOK_SECRET"]
PLANKA_BASE_URL = os.environ["PLANKA_BASE_URL"]

class WebhookEvent(BaseModel):
    event: str
    data: dict
    boardId: Optional[str] = None
    cardId: Optional[str] = None
    userId: Optional[str] = None
    timestamp: str

async def send_line_message(user_id: str, message: dict):
    """Send push message via LINE Messaging API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.line.me/v2/bot/message/push",
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "to": user_id,
                "messages": [message]
            }
        )
        response.raise_for_status()

def format_card_move_message(event: WebhookEvent) -> dict:
    """Format LINE Flex Message for card move event."""
    card = event.data.get("card", {})
    from_list = event.data.get("fromList", {})
    to_list = event.data.get("toList", {})
    user = event.data.get("user", {})
    
    return {
        "type": "flex",
        "altText": f"Card moved: {card.get('name', 'Unknown')}",
        "contents": {
            "type": "bubble",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "Card Moved",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#1DB446"
                    }
                ],
                "backgroundColor": "#F0F8F0"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": card.get("name", "Unknown Card"),
                        "weight": "bold",
                        "size": "md",
                        "wrap": True
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "From:", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": from_list.get("name", "?"), "wrap": True, "color": "#666666", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "To:", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": to_list.get("name", "?"), "wrap": True, "color": "#1DB446", "size": "sm", "flex": 5, "weight": "bold"}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "By:", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": user.get("name", "Unknown"), "wrap": True, "color": "#666666", "size": "sm", "flex": 5}
                                ]
                            }
                        ]
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#1DB446",
                        "action": {
                            "type": "uri",
                            "label": "Open in Board",
                            "uri": f"{PLANKA_BASE_URL}/boards/{event.boardId}"
                        }
                    }
                ]
            }
        }
    }

@app.post("/webhook/planka")
async def handle_planka_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None)
):
    """
    Receive and process Planka webhook events.
    Sends LINE push notifications for relevant events.
    """
    body = await request.body()
    
    # Verify signature if configured
    if PLANKA_WEBHOOK_SECRET and x_webhook_signature:
        expected = hmac.new(
            PLANKA_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(f"sha256={expected}", x_webhook_signature):
            raise HTTPException(401, "Invalid signature")
    
    event_data = await request.json()
    event = WebhookEvent(**event_data)
    
    # Handle card move events
    if event.event == "cardMove":
        message = format_card_move_message(event)
        
        # Get assignees and notify them
        assignees = event.data.get("card", {}).get("assignees", [])
        for assignee in assignees:
            line_user_id = assignee.get("lineUserId")
            if line_user_id:
                await send_line_message(line_user_id, message)
    
    # Handle card due date reminders
    elif event.event == "cardDueDateUpdate":
        # Schedule reminder notification
        pass
    
    return {"status": "processed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 9.3 Webhook Registration

Register the webhook in Planka using the API:

```bash
# Register webhook for card events
curl -X POST https://kanban.yourdomain.com/api/projects/PROJECT_ID/webhooks \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook-handler.yourdomain.com/webhook/planka",
    "events": [
      "cardCreate",
      "cardUpdate",
      "cardDelete",
      "cardMove",
      "cardMembershipCreate",
      "cardMembershipDelete",
      "cardCommentCreate",
      "cardDueDateUpdate"
    ],
    "secret": "your-webhook-signing-secret"
  }'
```

---

## 10. Deployment Checklist

### 10.1 Server / Proxmox VE Prerequisites

**Recommended Node Specifications:**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 80 GB SSD | 160 GB SSD |
| OS | Proxmox VE 8.x | Proxmox VE 8.x |
| Network | 1 Gbps | 1 Gbps |

### 10.2 Step-by-Step Deployment

> For the complete, copy-paste deployment procedure, refer to `infrastructure/proxmox-lxc-deployment.md`.

#### Step 1: Proxmox VE Setup

```bash
# Ensure Proxmox VE is up to date
apt update && apt dist-upgrade -y

# Download the Ubuntu 24.04 LXC template
pveam update
pveam download local ubuntu-24.04-standard_24.04-1_amd64.tar.zst
```

#### Step 2: Create Internal Network

Create a Linux bridge or VLAN for the internal LXC network:

```
10.0.10.0/24  → kanban internal network
```

Example `/etc/network/interfaces` snippet on Proxmox host:

```
auto vmbr10
iface vmbr10 inet static
    address 10.0.10.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0
```

#### Step 3: Provision LXC Containers

Create the four LXC containers on Proxmox VE:

| Container | VMID | IP Address | Resources |
|-----------|------|------------|-----------|
| `kanban-db` | 100 | 10.0.10.10/24 | 1 vCPU / 1 GB RAM / 20 GB |
| `kanban-planka` | 101 | 10.0.10.11/24 | 1 vCPU / 1 GB RAM / 20 GB |
| `kanban-bff` | 102 | 10.0.10.12/24 | 1 vCPU / 512 MB RAM / 10 GB |
| `kanban-proxy` | 103 | 10.0.10.13/24 | 1 vCPU / 512 MB RAM / 10 GB |

Use the Proxmox web UI or `pct create` commands. Example:

```bash
pct create 100 local:vztmpl/ubuntu-24.04-standard_24.04-1_amd64.tar.zst \
  --hostname kanban-db \
  --storage local-lvm \
  --rootfs 20 \
  --memory 1024 \
  --cores 1 \
  --net0 name=eth0,bridge=vmbr10,ip=10.0.10.10/24,gw=10.0.10.1 \
  --unprivileged 1
```

Repeat for the remaining containers.

Start all containers:

```bash
for vmid in 100 101 102 103; do
  pct start $vmid
done
```

#### Step 4: Configure Hostname Resolution

On each LXC, set `/etc/hosts` so hostnames resolve to static IPs:

```
10.0.10.10  db.kanban.local
10.0.10.11  planka.kanban.local
10.0.10.12  bff.kanban.local
10.0.10.13  proxy.kanban.local
```

#### Step 5: Base LXC Setup

On each LXC:

```bash
apt update && apt upgrade -y
apt install -y curl wget git vim htop ufw fail2ban

timedatectl set-timezone Asia/Tokyo
```

#### Step 6: Configure Firewall on `kanban-proxy`

```bash
# Reset UFW to defaults
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (critical - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable UFW
ufw enable

# Check status
ufw status verbose
```

#### Step 7: Configure Fail2Ban

On `kanban-proxy`, create `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

Enable and start Fail2Ban:

```bash
systemctl enable fail2ban
systemctl restart fail2ban
fail2ban-client status
```

#### Step 8: Deploy Services

Follow the container-specific instructions in `infrastructure/proxmox-lxc-deployment.md`:

1. Deploy PostgreSQL + Redis on `kanban-db`
2. Build and run Planka on `kanban-planka`
3. Deploy BFF (+ optional MCP) on `kanban-bff`
4. Install Nginx, deploy LIFF files, and obtain SSL on `kanban-proxy`

#### Step 9: First Admin Setup

The admin user is created automatically on first startup using the `DEFAULT_ADMIN_*` environment variables in `/opt/planka/.env`.

Verify the admin user exists:

```bash
# On kanban-db
sudo -u postgres psql -d planka -c \
    "SELECT email, username, name FROM user_account WHERE is_admin = true;"
```

Login at `https://kanban.yourdomain.com` using `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`.

If you need to reset the admin password:

```bash
sudo -u postgres psql -d planka -c \
    "UPDATE user_account SET password = '<new_bcrypt_hash>' WHERE email = 'admin@yourdomain.com';"
```

#### Step 10: Configure LINE Login OIDC

1. Go to https://developers.line.biz/ and create a LINE Login channel
2. Set callback URL: `https://kanban.yourdomain.com/api/users/auth/oidc/callback`
3. Note the Channel ID and Channel Secret
4. Update `/opt/planka/.env` and `/opt/kanban/bff/.env` with LINE credentials
5. Restart Planka to apply OIDC settings:

```bash
# On kanban-planka
systemctl restart planka
```

6. Verify OIDC configuration in logs:

```bash
journalctl -u planka -n 100 | grep -i "oidc\|OIDC"
```

#### Step 11: Verify Deployment

```bash
# Check all services
curl -s https://kanban.yourdomain.com/health

# Test API authentication
curl -s -X POST https://kanban.yourdomain.com/api/users/auth/native \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"YOUR_PASSWORD"}'

# Test board listing
curl -s https://kanban.yourdomain.com/api/projects/YOUR_PROJECT_ID/boards \
  -H "Authorization: Bearer YOUR_TOKEN"

# SSL certificate check
echo | openssl s_client -servername kanban.yourdomain.com \
    -connect kanban.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates -subject
```

### 10.3 Post-Deployment Checklist

- [ ] All LXC containers running (`pct list`)
- [ ] All systemd services active (`systemctl status ...`)
- [ ] SSL certificate valid
- [ ] Admin login works
- [ ] LINE Login OIDC flow works
- [ ] Board CRUD operations work
- [ ] Card movement works
- [ ] Real-time sync (WebSocket) works
- [ ] Webhook events fire correctly
- [ ] Backup script runs successfully
- [ ] Firewall rules active
- [ ] Fail2Ban running
- [ ] Auto-updates configured
- [ ] Monitoring/alerting configured (optional)

---

## 11. Operations & Maintenance

### 11.1 Useful Commands

```bash
# --- View service logs ---
journalctl -u planka -f
journalctl -u kanban-bff -f
journalctl -u postgresql -f
journalctl -u redis-server -f
journalctl -u nginx -f

# --- Restart services ---
systemctl restart planka
systemctl restart kanban-bff
systemctl restart postgresql
systemctl restart redis-server
systemctl restart nginx

# --- Update Planka ---
ssh root@10.0.10.11
cd /opt/planka
git pull
npm install
npm run build
systemctl restart planka

# --- Update BFF ---
ssh root@10.0.10.12
cd /opt/kanban/bff
git pull
npm ci
npm run build
npm run migrate
systemctl restart kanban-bff

# --- Database shell ---
# On kanban-db
sudo -u postgres psql -d planka

# --- Redis CLI ---
# On kanban-db
redis-cli -a $(grep REDIS_PASSWORD /opt/planka/.env | cut -d= -f2) ping

# --- Check resource usage per LXC ---
# On Proxmox host
pct list
top
free -h

# --- LXC status ---
pct status 100
pct status 101
pct status 102
pct status 103

# --- Restart an LXC container ---
pct reboot 101
```

### 11.2 Monitoring with systemd + Health Checks

```bash
# Check service status
systemctl status planka kanban-bff postgresql redis-server nginx

# View failed services
systemctl --failed

# Health checks from the proxy LXC
curl http://10.0.10.11:1337
curl http://10.0.10.12:3000/health
pg_isready -h 10.0.10.10 -U planka
redis-cli -h 10.0.10.10 -a YOUR_REDIS_PASSWORD ping
curl -I https://kanban.yourdomain.com
```

### 11.3 Log Rotation

```bash
# Configure logrotate for Planka and BFF logs
sudo tee /etc/logrotate.d/kanban << 'EOF'
/opt/planka/logs/*.log /opt/kanban/bff/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        /bin/kill -USR1 $(cat /var/run/nginx.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF

# Test logrotate
sudo logrotate -d /etc/logrotate.d/kanban
```

---

## 12. Troubleshooting Guide

### 12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `502 Bad Gateway` | Planka not running | Check `systemctl status planka`, restart Planka |
| `Database connection failed` | Wrong DB credentials / firewall | Verify `DATABASE_URL` and `pg_hba.conf` allows `10.0.10.0/24` |
| `SSL certificate expired` | Certbot renewal failed | Run `certbot renew --force-renewal` |
| `OIDC login fails` | Wrong LINE callback URL | Verify callback in LINE Developers Console |
| `WebSocket not connecting` | Nginx not proxying WS | Check `location /socket.io/` in Nginx config |
| `CORS errors` | Missing origin in Nginx | Add LIFF URL to `map $http_origin` block |
| `Rate limited` | Too many requests | Wait for rate limit window to reset |
| `Permission denied` | Wrong file ownership | Run `chown -R root:root /opt/planka` or appropriate user |
| `BFF cannot connect DB` | PostgreSQL not listening externally | Verify `listen_addresses = '*'` and restart PostgreSQL |
| `LIFF cannot call BFF` | Wrong `VITE_API_BASE_URL` or CORS | Check Nginx CORS headers and LIFF environment |

### 12.2 Debug Commands

```bash
# --- LXC container status ---
pct list
pct status <vmid>

# --- Service status ---
systemctl status planka kanban-bff postgresql redis-server nginx

# --- Network connectivity test from proxy LXC ---
curl http://10.0.10.11:1337
curl http://10.0.10.12:3000/health
nc -zv 10.0.10.10 5432
nc -zv 10.0.10.10 6379

# --- Database connectivity ---
pg_isready -h 10.0.10.10 -U planka

# --- Redis connectivity ---
redis-cli -h 10.0.10.10 -a YOUR_REDIS_PASSWORD ping

# --- Nginx configuration test ---
nginx -t

# --- SSL certificate info ---
echo | openssl s_client -connect kanban.yourdomain.com:443 -servername kanban.yourdomain.com 2>/dev/null | openssl x509 -text -noout | head -20

# --- View recent logs ---
journalctl -u planka --since "1 hour ago"
journalctl -u kanban-bff --since "1 hour ago"
journalctl -u nginx --since "1 hour ago"
```

### 12.3 Recovery Procedures

#### Planka Service Fails to Start

```bash
# On kanban-planka

# Check logs for errors
journalctl -u planka -n 100

# Restart Planka service
systemctl stop planka
systemctl start planka

# If database migration fails, check DB state
ssh root@10.0.10.10
sudo -u postgres psql -d planka -c "\dt"
```

#### Database Corruption Recovery

```bash
# On kanban-db

# Stop Planka first
ssh root@10.0.10.11 systemctl stop planka

# Restore from latest backup
LATEST_BACKUP=$(ls -t /opt/kanban/backups/planka_*.sql.gz | head -1)
/opt/kanban/scripts/restore.sh "$LATEST_BACKUP"

# Restart Planka
ssh root@10.0.10.11 systemctl start planka
```

#### SSL Certificate Issues

```bash
# On kanban-proxy

# Check certificate expiry
sudo openssl x509 -in /etc/letsencrypt/live/kanban.yourdomain.com/cert.pem -noout -dates

# Force renewal
sudo certbot renew --force-renewal

# If certificate is completely broken, recreate
sudo certbot delete --cert-name kanban.yourdomain.com
sudo certbot certonly --nginx -d kanban.yourdomain.com
```

#### Full LXC Restore from Backup

```bash
# On Proxmox host

# Stop the affected container
pct stop <vmid>

# Restore from a Proxmox backup (if available)
vzdump-restore /var/lib/vz/dump/vzdump-lxc-<vmid>-*.tar.zst <vmid>

# Or recreate the LXC and restore service data + database from backups
```

---

## Appendix A: File Structure

```
/opt/planka/
├── .env                        # Planka environment variables (secret)
├── .env.example               # Template for .env
├── node_modules/              # Installed Node.js packages
├── package.json               # Planka package manifest
├── logs/                      # Planka application logs
└── server/                    # Planka server source

/opt/kanban/
├── bff/
│   ├── .env                   # BFF environment variables (secret)
│   ├── node_modules/          # Installed Node.js packages
│   ├── dist/                  # Compiled BFF output
│   ├── logs/                  # BFF application logs
│   └── package.json           # BFF package manifest
├── mcp-kanban/
│   ├── .env                   # MCP environment variables (optional)
│   ├── node_modules/          # Installed Node.js packages
│   ├── dist/                  # Compiled MCP output
│   └── package.json           # MCP package manifest
├── scripts/
│   ├── generate-secrets.sh    # Secret generation
│   ├── backup.sh              # PostgreSQL backup script
│   └── restore.sh             # PostgreSQL restore script
└── backups/                   # Database backups
    └── planka_*.sql.gz

/var/www/liff/
├── index.html                 # LIFF app entry point
├── assets/                    # Static JS/CSS assets
└── ...

/etc/nginx/
├── nginx.conf                 # Main Nginx configuration
├── conf.d/
│   └── kanban.conf            # Virtual host for kanban domain
└── sites-enabled/             # Symlink to conf.d (distro-specific)

/etc/postgresql/16/main/
├── postgresql.conf            # PostgreSQL tuning
├── pg_hba.conf                # Client authentication rules
└── ...

/etc/redis/
└── redis.conf                 # Redis configuration

/etc/systemd/system/
├── planka.service             # Planka systemd unit
├── kanban-bff.service         # BFF systemd unit
└── kanban-mcp.service         # Optional MCP systemd unit
```

## Appendix B: Resource Requirements Summary

| Container | CPU | Memory | Storage | Network |
|-----------|-----|--------|---------|---------|
| `kanban-planka` | 1 vCPU | 1 GB | 20 GB | Internal + External |
| `kanban-bff` | 1 vCPU | 512 MB | 10 GB | Internal + External |
| `kanban-db` | 1 vCPU | 1 GB | 20 GB | Internal only |
| `kanban-proxy` | 1 vCPU | 512 MB | 10 GB | External (80, 443) |
| **Total** | **~3.5 vCPU** | **~3 GB** | **~60 GB** | |

## Appendix C: Port Reference

| Port | Service | Direction | Purpose |
|------|---------|-----------|---------|
| 22 | SSH | Inbound | LXC administration |
| 80 | Nginx | Inbound | HTTP (redirects to HTTPS) |
| 443 | Nginx | Inbound | HTTPS (Planka web + API + LIFF) |
| 1337 | Planka | Internal | Planka application |
| 3000 | BFF | Internal | BFF API |
| 5432 | PostgreSQL | Internal | Database |
| 6379 | Redis | Internal | Cache/Session store |

---

## Appendix D: Proxmox VE Deployment Reference

For the complete, step-by-step deployment guide on Proxmox VE + LXC, including copy-paste commands for creating each container, installing services, and configuring the network, see:

**`infrastructure/proxmox-lxc-deployment.md`**

---

> **End of Document**
>
> This architecture provides a production-ready foundation for self-hosting Planka with LINE Mini App integration on Proxmox VE + LXC. Regular security updates and monitoring are essential for maintaining a secure deployment.
>
> For updates and questions, refer to:
> - Proxmox VE: https://www.proxmox.com/en/proxmox-virtual-environment
> - Planka: https://github.com/plankanban/planka
> - Planka Docs: https://docs.planka.cloud/
> - LINE Login: https://developers.line.biz/en/docs/line-login/
> - Full deployment guide: `infrastructure/proxmox-lxc-deployment.md`
