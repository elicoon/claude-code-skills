# Compaction Re-read Hooks

Post-compaction state preservation for handler and worker sessions.

## Architecture

Two layers prevent context drift after compaction:

1. **Continuous discipline** (skill-level) — handler checkpoints after Phase 1/2; workers checkpoint after each skill transition
2. **Structural enforcement** (hooks) — forces re-reading critical files after compaction completes

### Session Types

| Type | Detection | Re-read targets |
|------|-----------|----------------|
| Handler | `/tmp/claude-handler-{session_id}` marker exists | handler-state.md, active dispatches, blockers |
| Worker | `HOME=/tmp/claude-worker-config` | dispatch contract, progress checkpoint |
| Regular | Neither | No action (silent pass-through) |

## Hook Flow

```
SESSION REGISTRATION
────────────────────
Handler: /handler skill invoked
  → PostToolUse (Skill) fires → register-handler-session.js
  → Writes /tmp/claude-handler-{session_id}

Worker: launch-worker.sh "<name>" "<repo>" "<prompt>" "<dispatch-file>"
  → Writes dispatch file path to /tmp/claude-worker-config/.claude/worker-dispatch-path

COMPACTION
──────────
Context grows → compaction triggered
  → PreCompact fires → compaction-reread.js precompact
  → Detects session type, writes /tmp/claude-compaction-{session_id}
    - Handler marker: {type:"handler"}
    - Worker marker:  {type:"worker", dispatch_file:"..."}
    - Regular:        no marker written

POST-COMPACTION RE-READ (via Stop hook)
───────────────────────────────────────
Claude finishes post-compaction response
  → Stop fires → compaction-reread.js stop
  → stop_hook_active=true? → exit (loop breaker)
  → No compaction marker?  → exit (no compaction happened)
  → Marker found → delete marker → return decision:"block" with reason

  Handler reason: re-read handler-state.md, dispatches, blockers
  Worker reason:  re-read dispatch contract + checkpoint (paths resolved from marker)
```

## Files

| File | Purpose |
|------|---------|
| `register-handler-session.js` | PostToolUse hook — registers handler sessions |
| `compaction-reread.js` | PreCompact + Stop hook — manages compaction markers and re-read injection |
| `launch-worker.sh` | Worker launcher — writes dispatch path for worker detection |

## Marker Files

All markers live in `/tmp/`:

| Marker | Written by | Read by | Lifetime |
|--------|-----------|---------|----------|
| `claude-handler-{session_id}` | register-handler-session.js | compaction-reread.js precompact | Entire session |
| `claude-compaction-{session_id}` | compaction-reread.js precompact | compaction-reread.js stop | One-shot (deleted after consumption) |
| `worker-dispatch-path` | launch-worker.sh | compaction-reread.js precompact | Entire worker session |

## Testing

### Quick smoke test (handler chain)

```bash
cd /home/eli/projects/claude-code-skills/hooks

# 1. Register handler session
echo '{"session_id":"test1","tool_input":{"skill":"handler"}}' | node register-handler-session.js
test -f /tmp/claude-handler-test1 && echo "PASS: handler registered"

# 2. PreCompact
echo '{"session_id":"test1"}' | node compaction-reread.js precompact
cat /tmp/claude-compaction-test1 | python3 -m json.tool

# 3. Stop (should block)
echo '{"session_id":"test1","stop_hook_active":false}' | node compaction-reread.js stop

# 4. Stop again (should be silent — marker consumed)
echo '{"session_id":"test1","stop_hook_active":false}' | node compaction-reread.js stop

# Cleanup
rm -f /tmp/claude-handler-test1 /tmp/claude-compaction-test1
```

### Quick smoke test (worker chain)

```bash
# 1. Setup worker env
mkdir -p /tmp/claude-worker-config/.claude
echo "/home/eli/projects/dev-org/docs/handler-dispatches/2026-02-13-test-task.md" > /tmp/claude-worker-config/.claude/worker-dispatch-path

# 2. PreCompact as worker
HOME=/tmp/claude-worker-config node compaction-reread.js precompact <<< '{"session_id":"test2"}'
cat /tmp/claude-compaction-test2 | python3 -m json.tool

# 3. Stop (should block with resolved paths)
node compaction-reread.js stop <<< '{"session_id":"test2","stop_hook_active":false}'

# Cleanup
rm -f /tmp/claude-compaction-test2 /tmp/claude-worker-config/.claude/worker-dispatch-path
```

### Regular session (should be silent)

```bash
echo '{"session_id":"test3"}' | node compaction-reread.js precompact
test ! -f /tmp/claude-compaction-test3 && echo "PASS: no marker for regular session"
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No re-read after compaction | Handler marker missing | Check PostToolUse hook fires for Skill calls |
| Worker gets handler re-read instructions | HOME not set to worker config | Verify launch-worker.sh sets HOME correctly |
| Re-read loops forever | stop_hook_active not breaking loop | Check Stop hook receives stop_hook_active=true on re-read response |
| Script crashes block Claude | Should never happen — all catches exit(0) | Check stderr for error messages |
| Marker accumulates in /tmp | Compaction markers are one-shot; handler markers persist | Handler markers cleaned on reboot (/tmp). No action needed. |
