---
name: kanban-deploy
description: Deploy or operate the self-hosted Planka + BFF stack on Proxmox + LXC (no Docker). Use when the user asks to deploy, start, stop, update, or troubleshoot the backend infrastructure.
---

# Kanban Stack Deployment (Proxmox + LXC)

## Context
- Architecture reference: `final_blueprint.md` Part 2 + `system_architecture.md`
- Extension services (BFF): `extension_blueprint.md` Module 1
- Stack: Nginx → Planka (:1337) + BFF (:3000) → PostgreSQL 16 + Redis 7
- Deployment model: **Proxmox VE with separate LXC containers** — no Docker
- RAM budget: ~1.5 GB total across 4 LXCs — fits a 2 GB VPS split into containers

## LXC Layout

| Container | Hostname | IP (example) | Services |
|---|---|---|---|
| `kanban-db` | db.kanban.local | 10.0.10.10 | PostgreSQL 16 + Redis 7 |
| `kanban-planka` | planka.kanban.local | 10.0.10.11 | Planka Kanban server |
| `kanban-bff` | bff.kanban.local | 10.0.10.12 | BFF + MCP server |
| `kanban-proxy` | proxy.kanban.local | 10.0.10.13 | Nginx + static LIFF files |

Full guide: `infrastructure/proxmox-lxc-deployment.md`

## Workflow

### First-time deploy
1. Provision 4 LXC containers on Proxmox with Ubuntu 24.04, static IPs on `10.0.10.0/24`
2. Add hostnames to `/etc/hosts` on each LXC (or use DNS)
3. On `kanban-db`: install PostgreSQL 16 + Redis 7, create `planka` DB/user
4. On `kanban-planka`: install Node.js 20, clone/build Planka, create `.env`, run via systemd
5. On `kanban-bff`: install Node.js 20, deploy `bff/` code, run `npm ci`, `npm run build`, `npm run migrate`, run via systemd
6. On `kanban-proxy`: install Nginx + Certbot, copy built `liff-app/dist/` to `/var/www/liff`, configure vhost, run `certbot --nginx`
7. Verify endpoints: `curl http://10.0.10.11:1337`, `curl http://10.0.10.12:3000/health`, `curl -I https://<APP_DOMAIN>`

### Update
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

# LIFF static files: rebuild on dev machine, then rsync to proxy LXC
rsync -avz liff-app/dist/ root@10.0.10.13:/var/www/liff/
```

### Backup / Restore
Backup script: `infrastructure/scripts/backup.sh`

```bash
# On kanban-db, add to crontab:
# 0 2 * * * /opt/kanban/scripts/backup.sh

# Manual backup
pg_dump -h 10.0.10.10 -U planka planka | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_YYYYMMDD.sql.gz | psql -h 10.0.10.10 -U planka planka
```

### Troubleshooting checklist
1. `systemctl status planka kanban-bff nginx` — any service failing?
2. `journalctl -u kanban-bff -n 100` / `journalctl -u planka -n 100`
3. Planka can't reach DB → check PostgreSQL `pg_hba.conf` allows `10.0.10.0/24` and `listen_addresses = '*'`
4. LIFF can't call API → check Nginx CORS headers allow origin `https://liff.line.me` and `VITE_API_BASE_URL` is correct
5. WebSocket fails → confirm Nginx has `proxy_set_header Upgrade $http_upgrade` on `/socket.io`
6. SSL error → verify certbot certificate path and `certbot renew --dry-run`

## Rules
- Never print secret values in output; refer to `.env` keys by name only
- Never run `DROP DATABASE` or destructive SQL without explicit user confirmation
- Memory limits: keep Planka ≤ 512 MB, BFF ≤ 256 MB, DB ≤ 1 GB total
