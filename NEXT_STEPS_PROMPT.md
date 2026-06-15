# Prompt: สถานะปัจจุบันและขั้นตอนต่อไปของ Kanban + LINE Mini App

> Copy ข้อความด้านล่างนี้ไปใช้เป็น prompt กับ AI เพื่อให้เข้าใจ context ปัจจุบันและช่วยดำเนินการต่อ

---

```text
You are assisting with a self-hosted Kanban + LINE Mini App project.

## Project Context
- This is a monorepo with three main services:
  - bff/ : Backend-for-Frontend (Node.js + Fastify + TypeScript)
  - liff-app/ : LINE Mini App frontend (React + TypeScript + Vite + LIFF SDK)
  - mcp-kanban/ : MCP automation server (Node.js + TypeScript)
- The project has been migrated FROM Docker Compose TO Proxmox VE + LXC deployment.
- Docker files have been removed. The deployment guide is at infrastructure/proxmox-lxc-deployment.md.
- Requirements checklist is at infrastructure/REQUIREMENTS.md.

## Current Status
- Docker removed: bff/Dockerfile and infrastructure/docker-compose.yml deleted.
- Deployment model changed to Proxmox + LXC with 4 containers:
  - kanban-db (10.0.10.10): PostgreSQL 16 + Redis 7
  - kanban-planka (10.0.10.11): Planka Kanban server
  - kanban-bff (10.0.10.12): BFF + MCP server
  - kanban-proxy (10.0.10.13): Nginx + static LIFF files
- .env files created and populated:
  - infrastructure/.env
  - bff/.env
  - liff-app/.env
- Domain chosen: kanban.phopy.net
- LINE channels configured:
  - LINE Login channel ID: 2010398551
  - Messaging API channel ID: 2010398526
  - LINE MINI App channel ID: 2010398344
  - LIFF ID (Developing): 2010398344-kGt5zcKv

## What is in progress
- The user is currently setting up the DNS subdomain kanban.phopy.net.
- It is not yet pointing to the Proxmox/public server IP.

## What still needs to be done
1. Wait for DNS A record kanban.phopy.net → public IP to propagate.
2. Configure LINE Developers Console:
   - LINE MINI App → Web app settings → Endpoint URL: https://kanban.phopy.net/app/
   - LINE Login → Callback URL: https://kanban.phopy.net/auth/line/callback
   - Messaging API → Webhook URL (optional): https://kanban.phopy.net/bff/webhooks/line
3. Provision 4 LXC containers on Proxmox with Ubuntu 24.04.
4. Install software per infrastructure/proxmox-lxc-deployment.md:
   - kanban-db: PostgreSQL 16 + Redis 7
   - kanban-planka: Node.js 20 + Planka from git
   - kanban-bff: Node.js 20 + project bff/ code
   - kanban-proxy: Nginx + Certbot + built liff-app/dist/
5. Copy .env files to the appropriate LXCs.
6. Run database migrations on kanban-bff: npm run migrate
7. Obtain SSL certificate: certbot --nginx -d kanban.phopy.net
8. Verify endpoints:
   - curl http://10.0.10.11:1337 (Planka)
   - curl http://10.0.10.12:3000/health (BFF)
   - curl -I https://kanban.phopy.net (Nginx + SSL)
9. Set up daily backup cron on kanban-db: 0 2 * * * /opt/kanban/scripts/backup.sh

## Important Notes
- DO NOT commit .env files. They contain secrets.
- Secrets were generated with openssl rand and are stored in the .env files.
- The user has the public IP of the Proxmox server but it has not been shared yet.
- If the user shares the public IP, update DNS A record instructions accordingly.
- If the user wants to proceed before DNS is ready, they can still set up LXCs internally but LINE integration will not work until HTTPS domain is reachable.

## Current Files of Interest
- infrastructure/proxmox-lxc-deployment.md : Full deployment guide
- infrastructure/REQUIREMENTS.md : Checklist of things to prepare
- infrastructure/.env, bff/.env, liff-app/.env : Environment variables
- infrastructure/nginx/conf.d/app.conf : Nginx virtual host config
- infrastructure/scripts/backup.sh : PostgreSQL backup script
```

---

## วิธีใช้

1. Copy บล็อกข้อความข้างต้นทั้งหมด (ระหว่าง ```text ... ```)
2. วางลงใน chat ของ AI ที่ต้องการให้ช่วย
3. ตามด้วยคำสั่งเฉพาะ เช่น "ช่วย deploy LXC ต่อ" หรือ "ช่วยตรวจสอบ DNS" หรือ "ช่วยแก้ nginx config"
