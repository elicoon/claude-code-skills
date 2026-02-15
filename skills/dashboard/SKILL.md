---
name: dashboard
description: Open the backlog dashboard in a browser (starts the local server if needed)
---

# /claude-code-skills:dashboard

**Purpose:** Ensure the dashboard HTTP server is running and open the dashboard in a browser.

## When to Use

Use this skill when you want to view the backlog dashboard visually, monitor handler pipeline activity, or check on worker status. It handles the server lifecycle so you don't have to think about it.

## Configuration

This skill reads `.atlas.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables:**
- `{SERVER_PORT}` - Port for the dashboard server (default: `3491`)
- `{SERVE_SCRIPT}` - Path to the serve script, relative to project root (default: `serve.js`)

> **Note:** This is a bonus feature requiring `serve.js` and `dashboard.html` setup in the project.

---

## Instructions for Claude

When this skill is invoked, follow these steps exactly:

### Step 0: Load Configuration

Before starting, check for `.atlas.yaml` in the project root:
- If found, read `server.port` and `server.serve_script` values
- If not found, use defaults:
  - `{SERVER_PORT}` → `3491`
  - `{SERVE_SCRIPT}` → `serve.js` (relative to project root)

### Step 1: Check if the Server is Already Running

Run a command to check if port `{SERVER_PORT}` is already in use:

```bash
# Windows
netstat -ano | findstr :{SERVER_PORT} | findstr LISTENING
```

- If output shows a LISTENING process, the server is **already running**. Skip to Step 3.
- If no output, the server is **not running**. Proceed to Step 2.

### Step 2: Start the Server

Start the Node.js server which serves static files and provides the `/api/tasks` endpoint. Run this in the background:

```bash
node {SERVE_SCRIPT} {SERVER_PORT}
```

Run this as a **background process** so it doesn't block the session.

After starting, verify the server is listening:

```bash
netstat -ano | findstr :{SERVER_PORT} | findstr LISTENING
```

If the server fails to start (e.g., port conflict), report the error to the user.

### Step 3: Open the Dashboard

Open the dashboard URL in the default browser:

```bash
# Windows
start http://localhost:{SERVER_PORT}/dashboard.html
```

### Step 4: Confirm

Report to the user:
- Whether the server was already running or just started
- The URL: `http://localhost:{SERVER_PORT}/dashboard.html`
- Remind them the server will keep running in the background until the session ends or they stop it

---

## Important Constraints

1. **Configurable port** - uses `{SERVER_PORT}` from config (default: 3491). This avoids conflicts with common dev ports.
2. **Don't start a second server** if one is already running on the port.
3. **Background process** - the server must run in the background so it doesn't block the Claude session.
4. **No file modifications** - this skill only starts a server and opens a browser. It does not modify any files.
5. **No git commits** - nothing to commit.

## Error Handling

- **Port in use by another process:** Report the conflict. Suggest the user check what's running on port `{SERVER_PORT}`.
- **Node.js not available:** Report the issue and suggest the user install Node.js from https://nodejs.org/.
- **Browser fails to open:** Provide the URL for manual navigation.

## Files Read

None directly. The server serves `dashboard.html` which reads task files via API endpoints.

## Tabs

- **Backlog (B)** — Kanban board of backlog tasks from `backlog/tasks/*.md`
- **Pipeline (P)** — Handler dispatch overview: budget bar, pending decisions with approve/deny/rework, dispatch kanban (queued/active/blocked/completed), priority alignment table
- **Workers (W)** — Live 2x2 grid of tmux worker sessions with output logs, acceptance criteria, model info

Pipeline and Workers use SSE for live updates (file watches + tmux polling).

## Files Written

None.

## Integrations

- Handler data: `docs/handler-dispatches/`, `handler-results/`, `handler-blockers/`, `handler-state.md`
- Worker sessions: tmux sessions named `worker-*`
