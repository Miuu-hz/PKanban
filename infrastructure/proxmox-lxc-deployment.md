# Proxmox + LXC Deployment Guide

> แนวทาง deploy Kanban + LINE Mini App บน Proxmox โดยใช้ LXC containers แทน Docker
> ไม่มี Docker ในทุกขั้นตอน — ติดตั้ง services ลงบน LXC โดยตรง

---

## 1. Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────────────────┐
│  Nginx Reverse Proxy (LXC: kanban-proxy)    │
│  - SSL termination                            │
│  - Serve LIFF static files                  │
│  - Proxy /bff → BFF                         │
│  - Proxy /socket.io → Planka                │
│  - Proxy / → Planka web UI                  │
└────────────┬────────────────────────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌─────────────┐
│ Planka │ │  BFF   │ │ PostgreSQL  │
│ :1337  │ │ :3000  │ │ + Redis     │
└────────┘ └────────┘ └─────────────┘
```

### LXC Containers

| Container | Hostname | IP (example) | Spec | Role |
|---|---|---|---|---|
| `kanban-db` | db.kanban.local | 10.0.10.10 | 1 vCPU / 1 GB RAM / 20 GB | PostgreSQL 16 + Redis 7 |
| `kanban-planka` | planka.kanban.local | 10.0.10.11 | 1 vCPU / 1 GB RAM / 20 GB | Planka Kanban server |
| `kanban-bff` | bff.kanban.local | 10.0.10.12 | 1 vCPU / 512 MB RAM / 10 GB | BFF + MCP server |
| `kanban-proxy` | proxy.kanban.local | 10.0.10.13 | 1 vCPU / 512 MB RAM / 10 GB | Nginx + static LIFF files |

---

## 2. Prerequisites

ก่อนเริ่ม ต้องมีสิ่งนี้พร้อม:

- Proxmox VE ระดับหนึ่ง
- Ubuntu 24.04 LXC template
- Domain name ที่ชี้มาที่ public IP ของ `kanban-proxy`
- SSH access เข้าแต่ละ LXC
- `nodejs` v20+, `npm`, `git` ติดตั้งในแต่ละ LXC ที่ต้องรัน Node.js

---

## 3. Network Setup

สร้าง Linux Bridge หรือใช้ VLAN สำหรับ internal network:

```
10.0.10.0/24  → kanban internal network
```

ตั้งค่า `/etc/hosts` ในแต่ละ LXC ให้ resolve hostnames:

```
10.0.10.10  db.kanban.local
10.0.10.11  planka.kanban.local
10.0.10.12  bff.kanban.local
10.0.10.13  proxy.kanban.local
```

หรือใช้ static IP แทนชื่อก็ได้.

---

## 4. LXC: kanban-db (PostgreSQL + Redis)

### 4.1 Install PostgreSQL 16

```bash
apt update && apt upgrade -y
apt install -y postgresql-16 postgresql-contrib-16 postgresql-client-16
```

### 4.2 Create Database + User

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

### 4.3 Allow Internal Network Access

Edit `/etc/postgresql/16/main/postgresql.conf`:

```conf
listen_addresses = '*'
```

Edit `/etc/postgresql/16/main/pg_hba.conf`:

```conf
host    planka    planka    10.0.10.0/24    scram-sha-256
```

```bash
systemctl restart postgresql
```

### 4.4 Install Redis 7

```bash
apt install -y redis-server
```

Edit `/etc/redis/redis.conf`:

```conf
bind 0.0.0.0
requirepass REPLACE_REDIS_PASSWORD
maxmemory 64mb
maxmemory-policy allkeys-lru
save ""  # disable persistence (optional)
```

```bash
systemctl restart redis-server
```

---

## 5. LXC: kanban-planka (Planka)

### 5.1 Install Dependencies

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential python3
```

### 5.2 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 5.3 Clone and Build Planka

```bash
cd /opt
git clone https://github.com/plankanban/planka.git
cd planka
npm install
npm run build
```

### 5.4 Create Environment File

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

### 5.5 Run Planka with systemd

Create `/etc/systemd/system/planka.service`:

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

```bash
systemctl daemon-reload
systemctl enable --now planka
```

---

## 6. LXC: kanban-bff (BFF + MCP)

### 6.1 Install Node.js 20

```bash
apt update && apt upgrade -y
apt install -y git curl

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 6.2 Deploy BFF Code

Copy project folder `bff/` จาก dev machine มาไว้ที่ `/opt/kanban/bff`:

```bash
mkdir -p /opt/kanban
cd /opt/kanban/bff
npm ci
npm run build
npm run migrate
```

### 6.3 BFF Environment

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

### 6.4 BFF systemd Service

Create `/etc/systemd/system/kanban-bff.service`:

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

```bash
systemctl daemon-reload
systemctl enable --now kanban-bff
```

### 6.5 MCP Server

Copy `mcp-kanban/` มาที่ `/opt/kanban/mcp-kanban`:

```bash
cd /opt/kanban/mcp-kanban
npm ci
npm run build
```

Create `/opt/kanban/mcp-kanban/.env`:

```bash
BFF_BASE_URL=http://10.0.10.12:3000
```

MCP server ส่วนใหญ่รันผ่าน STDIO โดย MCP client (เช่น Claude Desktop, Cline) จะเรียก `node /opt/kanban/mcp-kanban/dist/server.js` โดยตรง

ถ้าต้องการรัน MCP เป็น service แยก ให้สร้าง systemd service คล้าย BFF แล้ว expose ผ่าน transport ที่ต้องการ

---

## 7. LXC: kanban-proxy (Nginx + LIFF Static Files)

### 7.1 Install Nginx + Certbot

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx
```

### 7.2 Build LIFF App

On dev machine:

```bash
cd /path/to/liff-app
cp .env.example .env
# fill VITE_LIFF_ID and VITE_API_BASE_URL
npm ci
npm run build
```

Copy `liff-app/dist/` มาที่ `/var/www/liff`:

```bash
rsync -avz liff-app/dist/ root@10.0.10.13:/var/www/liff/
```

### 7.3 Configure Nginx

Replace the placeholder `${APP_DOMAIN}` and proxy targets in `infrastructure/nginx/conf.d/app.conf` with actual values, then copy to the proxy LXC.

Example `/etc/nginx/conf.d/kanban.conf`:

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

### 7.4 Obtain SSL Certificate

```bash
certbot --nginx -d kanban.yourdomain.com
```

### 7.5 Restart Nginx

```bash
nginx -t
systemctl restart nginx
```

---

## 8. Environment Variables Summary

| Variable | Set In | Value Example |
|---|---|---|
| `APP_DOMAIN` | BFF `.env`, Nginx | `kanban.yourdomain.com` |
| `PLANKA_BASE_URL` | BFF `.env` | `http://10.0.10.11:1337` |
| `DATABASE_URL` | BFF `.env`, Planka `.env` | `postgresql://planka:xxx@10.0.10.10:5432/planka` |
| `REDIS_URL` | Planka `.env` | `redis://:xxx@10.0.10.10:6379` |
| `LINE_CHANNEL_ID` | BFF `.env` | from LINE Developers |
| `LINE_CHANNEL_SECRET` | BFF `.env` | from LINE Developers |
| `LINE_MESSAGING_TOKEN` | BFF `.env` | from LINE Developers |
| `VITE_LIFF_ID` | liff-app `.env` | from LINE Developers |
| `VITE_API_BASE_URL` | liff-app `.env` | `https://kanban.yourdomain.com/bff` |
| `PLANKA_SECRET_KEY` | Planka `.env` | `openssl rand -base64 48` |
| `BFF_JWT_SECRET` | BFF `.env` | `openssl rand -base64 48` |
| `ICAL_SECRET` | BFF `.env` | `openssl rand -base64 24` |

---

## 9. Backup

Copy `infrastructure/scripts/backup.sh` to `kanban-db` LXC and add cron:

```bash
chmod +x /opt/kanban/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/kanban/scripts/backup.sh") | crontab -
```

Backups are saved to `/opt/kanban/backups/`.

---

## 10. Health Checks

| Service | Check Command |
|---|---|
| Planka | `curl http://10.0.10.11:1337` |
| BFF | `curl http://10.0.10.12:3000/health` |
| PostgreSQL | `pg_isready -h 10.0.10.10 -U planka` |
| Redis | `redis-cli -h 10.0.10.10 -a PASSWORD ping` |
| Nginx | `curl -I https://kanban.yourdomain.com` |

---

## 11. Update Procedure

```bash
# BFF
ssh root@10.0.10.12
cd /opt/kanban/bff
git pull
npm ci
npm run build
npm run migrate
systemctl restart kanban-bff

# Planka
ssh root@10.0.10.11
cd /opt/planka
git pull
npm install
npm run build
systemctl restart planka

# LIFF static files
# Rebuild on dev machine, then rsync to proxy LXC
```

---

## 12. Troubleshooting

- **BFF cannot connect DB**: check PostgreSQL `pg_hba.conf` allows `10.0.10.0/24` and `listen_addresses = '*'`
- **LIFF cannot call BFF**: check Nginx CORS headers and `VITE_API_BASE_URL`
- **WebSocket not working**: ensure Nginx has `proxy_set_header Upgrade` and `Connection "upgrade"`
- **SSL error**: verify certbot certificate path and renewal
