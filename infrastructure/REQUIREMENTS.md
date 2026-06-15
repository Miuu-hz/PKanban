# สิ่งที่ต้องเตรียมก่อน Deploy (Proxmox + LXC)

> ไฟล์นี้รวมทุกอย่างที่ต้องหามา/ตั้งค่าก่อน deploy ระบบ Kanban + LINE Mini App บน Proxmox + LXC

---

## 1. Infrastructure (Hardware + Hypervisor)

| # | สิ่งที่ต้องมี | ใส่ที่ไหน / ทำที่ไหน | หมายเหตุ |
|---|---|---|---|
| 1.1 | **Proxmox VE server** พร้อมสิทธิ์สร้าง LXC | Proxmox host | ต้องมีสิทธิ์ root หรือสิทธิ์สร้าง CT |
| 1.2 | **Ubuntu 24.04 LXC template** | ดาวน์โหลดบน Proxmox (`pveam download local ubuntu-24.04-standard_24.04-2_amd64.tar.zst`) | Template สำหรับสร้าง LXC ทุกตัว |
| 1.3 | **Public IP + Domain name** | ลงทะเบียน domain แล้วชี้ A record มาที่ public IP ของ `kanban-proxy` | ตัวอย่าง: `kanban.yourdomain.com` |
| 1.4 | **Network ภายใน** (เช่น `10.0.10.0/24`) | สร้าง Linux Bridge หรือ VLAN บน Proxmox | ใช้สื่อสารระหว่าง LXC |

### Spec ขั้นต่ำต่อ LXC

| LXC | vCPU | RAM | Disk | บทบาท |
|---|---|---|---|---|
| `kanban-db` | 1 | 1 GB | 20 GB | PostgreSQL + Redis |
| `kanban-planka` | 1 | 1 GB | 20 GB | Planka server |
| `kanban-bff` | 1 | 512 MB | 10 GB | BFF + MCP |
| `kanban-proxy` | 1 | 512 MB | 10 GB | Nginx + static files |
| **รวม** | **4** | **~3 GB** | **60 GB** | |

> ถ้าเครื่องมี RAM น้อย สามารถรวม `kanban-proxy` เข้ากับ `kanban-bff` ได้

---

## 2. Software / Runtime

| # | สิ่งที่ต้องมี | ใส่ที่ไหน / ทำที่ไหน | หมายเหตุ |
|---|---|---|---|
| 2.1 | **Node.js 20+** | ติดตั้งบน `kanban-planka` และ `kanban-bff` | Planka + BFF เขียนด้วย Node.js |
| 2.2 | **npm** | มาพร้อม Node.js | ใช้ `npm ci` ตอน deploy |
| 2.3 | **PostgreSQL 16** | ติดตั้งบน `kanban-db` | BFF + Planka ใช้ร่วมกัน |
| 2.4 | **Redis 7** | ติดตั้งบน `kanban-db` | Planka sessions + rate limit |
| 2.5 | **Nginx** | ติดตั้งบน `kanban-proxy` | Reverse proxy + SSL |
| 2.6 | **Certbot** | ติดตั้งบน `kanban-proxy` | ขอ SSL จาก Let's Encrypt |
| 2.7 | **git, curl, build-essential** | ติดตั้งบน `kanban-planka` | Build Planka จาก source |

---

## 3. LINE Developers Console

ต้องสร้าง/หาค่าเหล่านี้จาก [LINE Developers](https://developers.line.biz/):

| # | ค่าที่ต้องมี | ใส่ที่ไหน | วิธีได้มา |
|---|---|---|---|
| 3.1 | **LINE_CHANNEL_ID** | `infrastructure/.env.example` → BFF `.env` | LINE Login channel → Channel ID |
| 3.2 | **LINE_CHANNEL_SECRET** | `infrastructure/.env.example` → BFF `.env` | LINE Login channel → Channel secret |
| 3.3 | **LINE_MESSAGING_TOKEN** | `infrastructure/.env.example` → BFF `.env` | Messaging API channel → Long-lived token |
| 3.4 | **VITE_LIFF_ID** | `infrastructure/.env.example` → `liff-app/.env` | LIFF app → LIFF ID |

### คู่มือสร้าง LINE app ดูที่:
- `line-liff-mini-app-research.md`
- `line_mini_app_development.md`
- หรือ `.claude/skills/line-setup/SKILL.md`

---

## 4. Secrets / Passwords

สร้างเองได้ด้วยคำสั่ง `openssl rand -base64 48` หรือ `openssl rand -base64 24`:

| # | ตัวแปร | ใส่ที่ไหน | ความยาวแนะนำ |
|---|---|---|---|
| 4.1 | **POSTGRES_PASSWORD** | `infrastructure/.env.example` → PostgreSQL + BFF `.env` + Planka `.env` | 32-48 ตัวอักษร |
| 4.2 | **REDIS_PASSWORD** | `infrastructure/.env.example` → Redis config + Planka `.env` | 24-32 ตัวอักษร |
| 4.3 | **PLANKA_SECRET_KEY** | Planka `.env` | 64 ตัวอักษร |
| 4.4 | **BFF_JWT_SECRET** | BFF `.env` | 64 ตัวอักษร |
| 4.5 | **ICAL_SECRET** | BFF `.env` | 32 ตัวอักษร |
| 4.6 | **DEFAULT_ADMIN_PASSWORD** | Planka `.env` | 16-24 ตัวอักษร |

### สคริปต์ช่วยสร้าง Secrets

ใช้ `infrastructure/scripts/generate-secrets.sh`:

```bash
bash infrastructure/scripts/generate-secrets.sh
```

---

## 5. Configuration Files ที่ต้อง Copy + แก้ไข

หลังจากมีค่าทั้งหมดแล้ว ต้อง copy ไฟล์เหล่านี้ไปใส่ในแต่ละ LXC:

| # | ไฟล์ต้นฉบับ | Copy ไปไว้ที่ | แก้ไขอะไร |
|---|---|---|---|
| 5.1 | `infrastructure/.env.example` | แยกเป็น `.env` ของแต่ละ service | ใส่ค่าจริงทั้งหมด |
| 5.2 | `infrastructure/nginx/nginx.conf` | `/etc/nginx/nginx.conf` บน `kanban-proxy` | โดยปกติไม่ต้องแก้ |
| 5.3 | `infrastructure/nginx/conf.d/app.conf` | `/etc/nginx/conf.d/kanban.conf` บน `kanban-proxy` | แก้ `${APP_DOMAIN}`, `${BFF_HOST}`, `${PLANKA_HOST}`, `${LIFF_DIST_PATH}` |
| 5.4 | `infrastructure/scripts/backup.sh` | `/opt/kanban/scripts/backup.sh` บน `kanban-db` | แก้ DB host/user ถ้าจำเป็น |
| 5.5 | `bff/` (ทั้ง folder) | `/opt/kanban/bff` บน `kanban-bff` | สร้าง `.env` แล้ว build |
| 5.6 | `mcp-kanban/` (ทั้ง folder) | `/opt/kanban/mcp-kanban` บน `kanban-bff` | build แล้วเรียกผ่าน MCP client |
| 5.7 | `liff-app/dist/` (หลัง build) | `/var/www/liff` บน `kanban-proxy` | build บนเครื่อง dev ก่อน |

---

## 6. Checklist ก่อนเปิดใช้งานจริง

- [ ] Domain ชี้มาที่ public IP ของ `kanban-proxy` แล้ว
- [ ] SSL certificate ได้รับแล้ว (`https://kanban.yourdomain.com` เปิดได้)
- [ ] PostgreSQL เปิด port 5432 และ allow `10.0.10.0/24`
- [ ] Redis เปิด port 6379 และตั้ง password แล้ว
- [ ] Planka start ได้ (`curl http://10.0.10.11:1337` ตอบ 200)
- [ ] BFF start ได้ (`curl http://10.0.10.12:3000/health` ตอบ 200)
- [ ] Nginx proxy `/bff/`, `/socket.io/`, `/` ถูกต้อง
- [ ] LIFF App build แล้ว (`npm run build` ใน `liff-app/`)
- [ ] LINE Login channel ตั้งค่า Callback URL ถูกต้อง
- [ ] LIFF app ลงทะเบียน endpoint เป็น `https://kanban.yourdomain.com/app/`
- [ ] Backup cron ทำงานได้ (`0 2 * * * /opt/kanban/scripts/backup.sh`)

---

## 7. เอกสารอ้างอิง

- คู่มือ deploy เต็ม: `infrastructure/proxmox-lxc-deployment.md`
- สถาปัตยกรรมระบบ: `system_architecture.md`
- คู่มือ LINE setup: `.claude/skills/line-setup/SKILL.md`
