# /dashboard

## Purpose

Start the backlog dashboard HTTP server and open it in a browser. Provides visual Kanban and Command Center views of your backlog.

## What It Does

1. Checks if the dashboard server is already running on the configured port
2. Starts the Node.js server if not running (in background)
3. Opens the dashboard URL in the default browser
4. Reports status to user

## When to Use

- When you want to visualize your backlog
- For Kanban-style task management view
- For Command Center overview of all workstreams

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{SERVER_PORT}` | Port for the dashboard server | `3491` |
| `{SERVE_SCRIPT}` | Path to the serve script | `serve.js` |

## Prerequisites

This is a bonus feature requiring setup:
- `serve.js` - Node.js server script
- `dashboard.html` - Dashboard frontend
- Node.js installed on the system

## Dependencies

- Node.js runtime
- `serve.js` and `dashboard.html` in project root
