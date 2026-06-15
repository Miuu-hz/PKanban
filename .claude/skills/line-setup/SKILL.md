---
name: line-setup
description: Configure LINE Developers console — LINE Login channel, LIFF app, Messaging API channel, Mini App verification submission. Use when the user asks about LINE console setup, LIFF ID, channel config, webhooks to LINE, or Mini App review.
---

# LINE Platform Setup

## Context
- Reference: `final_blueprint.md` Part 2.6 (OIDC values) + `line-liff-mini-app-research.md`
- This skill is a guided checklist — most steps happen in the LINE Developers console (https://developers.line.biz/console/) and cannot be automated. Walk the user through them and update `.env` files with the values they obtain.

## Channels needed (all under one Provider)

| Channel | Purpose | Values to collect |
|---------|---------|-------------------|
| LINE Login | LIFF app + idToken verification | Channel ID, Channel Secret, LIFF ID |
| Messaging API | Push notifications (HR reminders, card-done messages) | Channel access token (long-lived) |

## Setup checklist

### 1. LINE Login channel
1. Create channel → type "LINE Login", region Thailand
2. Add LIFF app: Size `Full`, Endpoint URL = dev ngrok URL (later: production Vercel URL), Scopes: `profile`, `openid`
3. Collect → `.env`: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`; frontend `.env.local`: `VITE_LIFF_ID`
4. Enable "Bot link feature" (aggressive) if you want the OA added as friend on login

### 2. Messaging API channel
1. Create channel → type "Messaging API"
2. Issue long-lived channel access token → BFF `.env`: `LINE_MESSAGING_TOKEN`
3. Webhook URL: leave OFF (we push only; inbound chat bot is out of scope)
4. Disable auto-reply / greeting messages in LINE Official Account Manager

### 3. Endpoint updates per environment
| Stage | LIFF Endpoint URL |
|-------|-------------------|
| Dev | `https://<random>.ngrok-free.app` (changes every ngrok restart — must re-update) |
| Prod | `https://your-project.vercel.app` |

### 4. LINE Mini App verification (production)
- Unverified Mini Apps work only for the developer/testers — public SME users REQUIRE verification
- Requirements: business registration docs (Thailand), privacy policy URL, app description in Thai, review by LINE (allow 1–2 weeks; budget rejection+resubmit time per roadmap Phase 8)
- Interim option: ship as a plain LIFF app (no verification needed, opens for anyone with the link) while Mini App review is pending — same codebase, same LIFF ID

## Common pitfalls
- idToken verify fails → frontend LIFF app and `LINE_CHANNEL_ID` in BFF must belong to the SAME LINE Login channel
- `liff.getIDToken()` returns null → `openid` scope missing on the LIFF app
- shareTargetPicker silently unavailable → must be enabled per-LIFF-app in console, and only works inside LINE app
- CORS errors → allow origin `https://liff.line.me` AND your endpoint domain in Nginx/BFF
