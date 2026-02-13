---
name: monitor
description: Show status table of all running handler worker sessions in tmux
---

# Monitor: Worker Status Dashboard

## When to Use

- Checking on overnight/background workers
- Quick status check during phone check-ins
- Before running `/handler` to see what completed

## Step 0: Gather Data

Run ALL of the following bash commands in parallel to collect worker state. Do not output anything to the user yet — gather silently, then present.

### 0a: List tmux windows

```bash
tmux list-windows -F "#{window_index}|#{window_name}|#{pane_current_command}|#{pane_activity}|#{pane_pid}"
```

Parse each line. Worker windows are any window running `claude` as the pane command (exclude the window you're currently in).

### 0b: Check for result files

```bash
ls -1t ~/projects/dev-org/docs/handler-results/*.md 2>/dev/null
```

Each file means a worker completed and wrote its report.

### 0c: Check for blocker files

```bash
ls -1t ~/projects/dev-org/docs/handler-blockers/*.md 2>/dev/null
```

Each file means a worker hit a blocker.

### 0d: Capture recent output from each worker window

For EACH worker window found in 0a, run:

```bash
tmux capture-pane -t <window_name> -p -S -30 2>/dev/null
```

This captures the last 30 lines of visible output. Parse for:

- **Token counts**: Look for patterns like `total_tokens:`, `tokens:`, or the Claude Code cost/token display
- **Tool calls**: Look for patterns like `tool_uses:`, or count lines containing tool call indicators
- **Current activity**: The last non-empty line that describes what the worker is doing
- **Waiting for input**: Look for `?`, `[Y/n]`, `(y/N)`, `approve`, `permission` — these mean the worker is stuck waiting

### 0e: Calculate timing

For each worker, calculate minutes since last activity:

```bash
echo $(( ($(date +%s) - <pane_activity_timestamp>) / 60 ))
```

If minutes > 10 for a still-running worker, flag as potentially stalled.

## Step 1: Determine Status

For each worker window, determine status using this priority:

| Check | Status | Icon |
|-------|--------|------|
| Result file exists for this dispatch | `completed` | ✅ |
| Blocker file exists for this dispatch | `blocked` | 🔴 |
| Claude process not running (pane command != claude) | `exited` | ⚫ |
| Output contains input prompt (Y/n, permission, etc.) | `waiting` | 🟡 |
| Last activity > 10 min ago AND process still running | `stalled?` | 🟠 |
| Process running, recent activity | `running` | 🔄 |

## Step 2: Match Windows to Dispatches

Read the Active Dispatches table from `~/projects/dev-org/docs/handler-state.md` to match tmux window names to dispatch IDs and task descriptions.

## Step 3: Present Table

Output a single markdown table with these columns:

```
| Window | Project | Task | Status | Activity | Tools | Tokens | Idle | Action? |
```

Where:
- **Window**: tmux window name
- **Project**: from dispatch metadata
- **Task**: short description from dispatch
- **Status**: icon + label from Step 1
- **Activity**: last meaningful line from output (truncated to ~40 chars)
- **Tools**: number of tool calls if parseable, else `—`
- **Tokens**: token count if parseable, else `—`
- **Idle**: minutes since last activity
- **Action?**: `none` / `input needed` / `review result` / `investigate stall` / `read blocker`

### Compact Format

If the user appears to be on phone (short messages) or asks for compact output:

```
9 workers: 3✅ 5🔄 1🟡

✅ gc-groom — done (result ready)
✅ mosh — done (result ready)
✅ scope-fin — done (result ready)
🔄 gc-feat — implementing task 6/10 (12min)
🔄 devorg — collapsing backlog tasks (8min)
🔄 tc-clean — running npm test (5min)
🟡 gc-tests — waiting for permission (2min) ← needs you
```

## Step 4: Recommendations

After the table, add a brief section:

**If any workers completed:** "N workers finished — run `/handler` to process results and dispatch next wave."

**If any workers are waiting:** "N workers need input — check tmux windows: `tmux select-window -t <name>`"

**If any workers stalled:** "N workers may be stalled (>10min idle). Investigate: `tmux select-window -t <name>`"

**If all workers completed:** "All workers done! Run `/handler` for full briefing and next dispatches."

---

## Error Handling

| Issue | Response |
|-------|----------|
| tmux not running | "No tmux session found. Workers may have exited." |
| No worker windows | "No active workers found. Run `/handler` to dispatch work." |
| Can't capture pane | Skip that window, note as "unknown" status |
| handler-state.md missing | Show windows without dispatch matching |
