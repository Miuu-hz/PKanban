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

## Current Status (Updated)
- Docker removed: bff/Dockerfile and infrastructure/docker-compose.yml deleted.
- 🔴 Priority fixes in GitHub repo completed:
  - nginx.conf: changed `user nginx;` → `user www-data;`
  - nginx/conf.d/app.conf: fixed `/bff/calendar/` proxy_pass to strip `/bff` prefix
  - bff/src/plugins/planka.ts: added auto accept-terms retry on Planka login
  - infrastructure/lxc-105-kanban-bff.service: added `EnvironmentFile=/opt/kanban/bff/.env`
- Deployment model: Proxmox + LXC with 4 containers:
  - kanban-db (10.0.10.10): PostgreSQL 16 + Redis 7
  - kanban-planka (10.0.10.11): Planka Kanban server
  - kanban-bff (LXC 105): BFF + MCP server code cloned, Node.js 20.20.2 installed, npm install done, bff/dist/ built (tsc bypass)
  - kanban-proxy (LXC 106): Nginx + static LIFF files; liff-app/dist/ built on LXC 105 and pushed to /var/www/kanban/dist/ on LXC 106
- .env files created and populated:
  - infrastructure/.env
  - bff/.env
  - liff-app/.env
- Domain configured on Cloudflare: kanban.phopy.net
- LINE channels configured:
  - LINE Login channel ID: 2010398551
  - Messaging API channel ID: 2010398526
  - LINE MINI App channel ID: 2010398344
  - LIFF ID (Developing): 2010398344-kGt5zcKv

## Known Issues
- Liff-app .env exists only inside containers and is NOT committed (correct policy).
- BFF TypeScript build errors were fixed (see git diff for details).

## What is in progress / Next immediate steps
1. Pull latest code from GitHub repo to LXCs 105 and 106.
2. Configure Nginx on LXC 106 (kanban-proxy) with SSL and reverse proxy rules.
3. Set up BFF .env + systemd service on LXC 105 (kanban-bff).
4. (After BFF runs) Verify /health endpoint and test LINE Login flow.

## Remaining Steps
1. Configure Nginx on kanban-proxy (LXC 106):
   - Use infrastructure/nginx/conf.d/app.conf as template
   - Replace placeholders with actual domain and LXC IPs
   - Set up SSL with certbot: certbot --nginx -d kanban.phopy.net
   - Test: curl -I https://kanban.phopy.net
2. Set up BFF environment and service on kanban-bff (LXC 105):
   - Copy bff/.env to LXC 105 /opt/kanban/bff/.env
   - Create systemd service /etc/systemd/system/kanban-bff.service
   - Enable and start: systemctl enable --now kanban-bff
   - Verify: curl http://10.0.10.12:3000/health
3. Configure LINE Developers Console:
   - LINE MINI App → Web app settings → Endpoint URL: https://kanban.phopy.net/app/
   - LINE Login → Callback URL: https://kanban.phopy.net/auth/line/callback
   - Messaging API → Webhook URL (optional): https://kanban.phopy.net/bff/webhooks/line
4. ~~Fix BFF TypeScript errors~~ ✅ DONE:
   - req.user.memberId type fixed via @fastify/jwt module augmentation
   - Tests pass: 69/69
5. Set up daily backup cron on kanban-db: 0 2 * * * /opt/kanban/scripts/backup.sh
6. End-to-end test:
   - Open LIFF app on LINE
   - Login with LINE
   - Test Kanban board loading
   - Test card CRUD operations

## Important Notes
- DO NOT commit .env files. They contain secrets.
- Secrets were generated with openssl rand and are stored in the .env files.
- LXC 105 has more RAM and is used for building the frontend because LXC 106 (512MB) is not enough.
- If the user shares new public IP or changes DNS, update Nginx and .env accordingly.

## Current Files of Interest
- infrastructure/proxmox-lxc-deployment.md : Full deployment guide
- infrastructure/REQUIREMENTS.md : Checklist of things to prepare
- infrastructure/.env, bff/.env, liff-app/.env : Environment variables
- infrastructure/nginx/conf.d/app.conf : Nginx virtual host config
- infrastructure/scripts/backup.sh : PostgreSQL backup script
- NEXT_STEPS_PROMPT.md : This file
```

---

## วิธีใช้

1. Copy บล็อกข้อความข้างต้นทั้งหมด (ระหว่าง ```text ... ```)
2. วางลงใน chat ของ AI ที่ต้องการให้ช่วย
3. ตามด้วยคำสั่งเฉพาะ เช่น "ช่วย deploy LXC ต่อ" หรือ "ช่วยตรวจสอบ DNS" หรือ "ช่วยแก้ nginx config"
