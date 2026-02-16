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

Parse each line. Worker windows are any window running `claude` as the pane command (exclude the window you're currently in — check your own PID or window name).

### 0b: Check dispatch file statuses

```bash
grep -l 'Status.*completed' ~/projects/dev-org/docs/handler-dispatches/*.md 2>/dev/null
```

Each match means a worker completed and updated its dispatch file. Match filenames to dispatch IDs (e.g., `2026-02-12-golf-clip-fix-tests.md` matches the `gc-tests` window).

### 0c: Check for blocked dispatches

```bash
grep -l 'Status.*blocked' ~/projects/dev-org/docs/handler-dispatches/*.md 2>/dev/null
```

Each match means a worker hit a blocker and updated the dispatch file's Status and Blocker fields.

### 0d: Check process activity signals

**IMPORTANT:** Claude Code uses a TUI with an alternate screen buffer. `tmux capture-pane` returns empty output for Claude Code sessions. Do NOT rely on pane capture for activity data.

Instead, use these reliable signals:

**CPU time** (shows accumulated work — increasing = active):
```bash
for win in <worker_windows>; do
  pid=$(tmux list-panes -t "$win" -F '#{pane_pid}' 2>/dev/null)
  cputime=$(ps -p "$pid" -o cputime= 2>/dev/null)
  echo "$win|$pid|$cputime"
done
```

**Git activity** (shows commits made by workers):
```bash
# Check recent commits in target repos
for repo in golf-clip dev-org traffic-control mosh-ssh-tmux coon-family-app household-automations financial-analysis; do
  last=$(git -C ~/projects/$repo log --oneline -1 --format="%ar|%s" 2>/dev/null)
  echo "$repo|$last"
done
```

**New branches** (feature workers create branches):
```bash
for repo in golf-clip mosh-ssh-tmux; do
  branches=$(git -C ~/projects/$repo branch --list --format='%(refname:short)' 2>/dev/null | grep -v '^main$\|^master$')
  echo "$repo|$branches"
done
```

### 0e: Calculate timing

For each worker, calculate minutes since last pane activity:

```bash
for win in <worker_windows>; do
  activity=$(tmux list-panes -t "$win" -F '#{pane_activity}' 2>/dev/null)
  idle=$(( ($(date +%s) - activity) / 60 ))
  echo "$win|${idle}min"
done
```

If idle > 15 minutes for a still-running worker, flag as potentially stalled.

**Also check CPU time delta** — if CPU time hasn't changed between two checks ~30s apart, the worker may be idle/waiting:
```bash
# First reading
for win in <worker_windows>; do ps -p $(tmux list-panes -t "$win" -F '#{pane_pid}') -o cputime= 2>/dev/null; done
# Wait 10 seconds, take second reading, compare
```

## Step 1: Determine Status

For each worker window, determine status using this priority:

| Check | Status | Icon |
|-------|--------|------|
| Dispatch file has Status=completed | `completed` | ✅ |
| Dispatch file has Status=blocked | `blocked` | 🔴 |
| Claude process not running (pane command != claude) | `exited` | ⚫ |
| Pane command is `bash` or shell (claude exited to shell) | `exited` | ⚫ |
| Idle > 15 min AND no CPU accumulation | `stalled?` | 🟠 |
| Process running, CPU accumulating | `running` | 🔄 |

**Note:** Without pane capture, we cannot detect `waiting` (input prompts). If a worker appears stalled, recommend the user check it manually: `tmux select-window -t <name>`.

## Step 2: Match Windows to Dispatches

Read the Active Dispatches table from `~/projects/dev-org/docs/handler-state.md` to match tmux window names to dispatch IDs, projects, and task descriptions.

Window name mapping (convention):
- `gc-tests` → golf-clip test fix
- `gc-feat` → golf-clip feature work
- `gc-groom` → golf-clip grooming
- `devorg` → dev-org cleanup
- `tc-clean` → traffic-control cleanup
- `mosh` → mosh-ssh-tmux
- `scope-*` → scoping agents
- `gh-audit` → GitHub security audit

## Step 3: Present Table

Output a single markdown table:

```
| Window | Project | Task | Status | CPU | Idle | Git Activity | Action? |
```

Where:
- **Window**: tmux window name
- **Project**: from dispatch metadata
- **Task**: short task description (from handler-state.md)
- **Status**: icon + label from Step 1
- **CPU**: accumulated CPU time (proxy for work done)
- **Idle**: minutes since last pane activity
- **Git Activity**: last commit message if recent, or `—`
- **Action?**: `none` / `review result` / `investigate stall` / `read blocker` / `check manually`

### Compact Format

If the user appears to be on phone (short messages) or asks for compact output:

```
9 workers: 3✅ 5🔄 1🟠

✅ gc-groom — done (result ready)
✅ mosh — done (result ready)
✅ scope-fin — done (result ready)
🔄 gc-feat — running (cpu 2:34, idle 1min)
🔄 devorg — running (cpu 1:45, idle 3min)
🟠 tc-clean — stalled? (cpu 0:30, idle 18min) ← check it
```

## Step 4: Recommendations

After the table, add a brief section:

**If any workers completed:** "N workers finished — run `/handler` to process results and dispatch next wave."

**If any workers are waiting/stalled:** "N workers may need attention — switch to their window: `tmux select-window -t <name>`"

**If all workers completed:** "All workers done! Run `/handler` for full briefing and next dispatches."

**If all workers running normally:** "All N workers active. Check back in ~15 min or run `/monitor` again."

---

## Error Handling

| Issue | Response |
|-------|----------|
| tmux not running | "No tmux session found. Workers may have exited." |
| No worker windows | "No active workers found. Run `/handler` to dispatch work." |
| handler-state.md missing | Show windows without dispatch matching — use window names only |
| Process exited but dispatch Status still "running" | "Worker exited without updating dispatch Status — may have crashed. Check `tmux select-window -t <name>` for error output." |
