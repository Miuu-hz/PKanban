---
name: mcp-server
description: Build or extend the MCP automation server (7 simple tools for local LLMs — list/create/move tasks, check-in/out, worklog, report). Use when the user asks about MCP, automation, or local LLM integration.
---

# MCP Automation Server

## Context
- Spec: `extension_blueprint.md` Module 5 — read it before writing code; the 7 tool schemas there are the contract
- Stack: Node + TypeScript + `@modelcontextprotocol/sdk`, stdio transport
- The MCP server is a thin client of the BFF — it holds a `BFF_TOKEN` and calls `/bff/*` endpoints. NO direct DB or Planka access.

## Hard design constraints (for local LLM compatibility)
1. **Maximum 7 tools.** If a new tool is requested, propose removing/merging one first.
2. **Params are strings and numbers only.** No nested objects, no arrays, no enums.
3. **Names over IDs.** Tools accept `task_name` / `column_name`; the BFF fuzzy-matches (`extension_blueprint.md` section 5.5). Never expose UUIDs in tool inputs.
4. **Thai descriptions** on every tool and param — the target users prompt in Thai.
5. **Short outputs.** Tool results must be compact plain text (≤ ~500 tokens) — local models lose track with long JSON dumps. Format: one line per task, `• {title} | {column} | ครบกำหนด {date}`.

## The 7 tools
`list_my_tasks` · `create_task(title, due_date?)` · `move_task(task_name, column_name)` · `check_in` · `check_out` · `add_worklog(task_name, hours, note?)` · `get_report(month?)`

Exact inputSchemas: `extension_blueprint.md` section 5.3 — copy them verbatim.

## Project layout
```
mcp-kanban/
├── src/
│   ├── server.ts        # McpServer + StdioServerTransport, registers 7 tools
│   ├── tools/           # one file per tool: schema + handler
│   └── bffClient.ts     # fetch wrapper: BFF_BASE_URL + Bearer BFF_TOKEN
├── package.json         # bin entry so `npx mcp-kanban` works
└── mcp-config.json      # sample host config (section 5.4)
```

## Error handling for LLM consumers
- Fuzzy match returns multiple cards → respond with a numbered list and ask: "พบหลายงาน เลือกชื่อให้ชัดขึ้น: 1) ... 2) ..."
- BFF 401 → "Token หมดอายุ — ขอ token ใหม่จากหน้า Settings ในแอป LINE"
- Network error → return the error as tool result text (never throw — a crash kills the stdio session)

## Testing
1. Build, then smoke test handshake: `npx @modelcontextprotocol/inspector node dist/server.js`
2. Verify each tool against a running BFF (use `.env` BFF_TOKEN from a dev login)
3. Final acceptance: connect via Ollama/LM Studio with a small model (qwen2.5:7b or llama3.1:8b) and confirm it can complete: "สร้างงานชื่อ ทดสอบระบบ ครบกำหนดพรุ่งนี้ แล้วย้ายไปคอลัมน์กำลังทำ"
