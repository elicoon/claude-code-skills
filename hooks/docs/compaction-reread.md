# Compaction Re-read Hooks

Post-compaction state preservation for handler, worker, and loop sessions.

## Architecture

Two layers prevent context drift after compaction:

1. **Continuous discipline** (skill-level) — handler checkpoints after Phase 1/2; workers update `## Progress` in their dispatch file after each milestone
2. **Structural enforcement** (hooks) — forces re-reading critical files after compaction completes

> **Data model (2026-02-15):** Under the dispatch-as-ticket model, workers update their dispatch file in-place (Status, Progress, Result fields) instead of writing to separate checkpoint or result files. The `## Progress` section in the dispatch file replaces the old `handler-results/{slug}-checkpoint.md` pattern. See `docs/plans/2026-02-15-dispatch-as-ticket.md`.

### Session Types

| Type | Detection | Re-read targets |
|------|-----------|----------------|
| Handler | `/tmp/claude-handler-{session_id}` marker exists | handler-state.md, active dispatch files |
| Worker | `HOME=/tmp/claude-worker-config` | dispatch file only (contains contract + `## Progress` section) |
| Loop | `/tmp/claude-loop-{session_id}` marker exists | active loop document in `docs/loops/*.loop.md` (most recently modified, non-archived) |
| Regular | None of the above | No action (silent pass-through) |

## Hook Flow

```
SESSION REGISTRATION
────────────────────
Handler: /handler skill invoked
  → PostToolUse (Skill) fires → register-handler-session.js
  → Writes /tmp/claude-handler-{session_id}

Worker: launch-worker.sh "<name>" "<repo>" "<prompt>" "<dispatch-file>"
  → Writes dispatch file path to /tmp/claude-worker-config/.claude/worker-dispatch-path

Loop: /loop skill invoked
  → PostToolUse (Skill) fires → register-loop-session.js
  → Writes /tmp/claude-loop-{session_id} (includes cwd for loop doc discovery)

COMPACTION
──────────
Context grows → compaction triggered
  → PreCompact fires → compaction-reread.js precompact
  → Detects session type, writes /tmp/claude-compaction-{session_id}
    - Handler marker: {type:"handler"}
    - Worker marker:  {type:"worker", dispatch_file:"..."}
    - Loop marker:    {type:"loop", loop_file:"..."}
    - Regular:        no marker written

POST-COMPACTION RE-READ (PreToolUse primary + Stop failsafe)
─────────────────────────────────────────────────────────────
Claude attempts first tool call after compaction
  → PreToolUse fires → compaction-reread.js pretooluse
  → No compaction marker? → exit (allow tool)
  → Marker found → delete marker (one-shot) → return decision:"block" with reason
  → Claude re-reads state files (Read calls pass — marker already consumed)

If Claude's post-compaction response uses NO tool calls:
  → Stop fires → compaction-reread.js stop (failsafe)
  → stop_hook_active=true? → exit (loop breaker)
  → No compaction marker?  → exit (PreToolUse already consumed it, or no compaction)
  → Marker found → delete marker → return decision:"block" with reason

  Handler reason: re-read handler-state.md, active dispatch files
  Worker reason:  re-read dispatch file (contains contract + ## Progress with incremental updates)
  Loop reason:    re-read active loop document, find [CURRENT] step, continue without pausing
```

## Files

| File | Purpose |
|------|---------|
| `register-handler-session.js` | PostToolUse hook — registers handler sessions |
| `register-loop-session.js` | PostToolUse hook — registers loop sessions (includes cwd for doc discovery) |
| `compaction-reread.js` | PreCompact + PreToolUse + Stop hook — manages compaction markers and re-read injection |
| `launch-worker.sh` | Worker launcher — writes dispatch path for worker detection |

## Marker Files

All markers live in `/tmp/`:

| Marker | Written by | Read by | Lifetime |
|--------|-----------|---------|----------|
| `claude-handler-active` | handler skill (SKILL.md) | compaction-reread.js precompact | Entire session (until reboot) |
| `claude-handler-{session_id}` | register-handler-session.js | compaction-reread.js precompact | Entire session |
| `claude-loop-{session_id}` | register-loop-session.js | compaction-reread.js precompact | Entire session |
| `claude-compaction-{session_id}` | compaction-reread.js precompact | compaction-reread.js pretooluse (primary) or stop (failsafe) | One-shot (deleted after consumption) |
| `worker-dispatch-path` | launch-worker.sh | compaction-reread.js precompact | Entire worker session |

## Testing

### Quick smoke test (handler chain)

```bash
cd ~/projects/claude-code-skills/hooks

# 1. Register handler session
echo '{"session_id":"test1","tool_input":{"skill":"handler"}}' | node register-handler-session.js
test -f /tmp/claude-handler-test1 && echo "PASS: handler registered"

# 2. PreCompact
echo '{"session_id":"test1"}' | node compaction-reread.js precompact
cat /tmp/claude-compaction-test1 | python3 -m json.tool

# 3. PreToolUse (should block — primary path)
echo '{"session_id":"test1"}' | node compaction-reread.js pretooluse
# Should output JSON with decision:"block", marker consumed

# 4. PreToolUse again (should be silent — marker consumed)
echo '{"session_id":"test1"}' | node compaction-reread.js pretooluse
# Should exit silently

# 5. Re-create marker and test Stop (failsafe path)
echo '{"session_id":"test1"}' | node compaction-reread.js precompact
echo '{"session_id":"test1","stop_hook_active":false}' | node compaction-reread.js stop
# Should output JSON with decision:"block"

# 6. Stop again (should be silent — marker consumed)
echo '{"session_id":"test1","stop_hook_active":false}' | node compaction-reread.js stop

# Cleanup
rm -f /tmp/claude-handler-test1 /tmp/claude-compaction-test1
```

### Quick smoke test (worker chain)

```bash
# 1. Setup worker env
mkdir -p /tmp/claude-worker-config/.claude
echo "~/projects/dev-org/docs/handler-dispatches/example-task.md" > /tmp/claude-worker-config/.claude/worker-dispatch-path

# 2. PreCompact as worker
HOME=/tmp/claude-worker-config node compaction-reread.js precompact <<< '{"session_id":"test2"}'
cat /tmp/claude-compaction-test2 | python3 -m json.tool

# 3. Stop (should block with dispatch file path — no checkpoint file reference)
node compaction-reread.js stop <<< '{"session_id":"test2","stop_hook_active":false}'
# Verify: reason references dispatch file only, not handler-results/ checkpoint

# Cleanup
rm -f /tmp/claude-compaction-test2 /tmp/claude-worker-config/.claude/worker-dispatch-path
```

### Quick smoke test (loop chain)

```bash
cd ~/projects/claude-code-skills/hooks

# 1. Register loop session (with cwd pointing to a project with active loop docs)
echo '{"session_id":"test3","tool_input":{"skill":"loop"},"cwd":"/path/to/your-project"}' | node register-loop-session.js
test -f /tmp/claude-loop-test3 && echo "PASS: loop registered"

# 2. PreCompact
echo '{"session_id":"test3"}' | node compaction-reread.js precompact
cat /tmp/claude-compaction-test3 | python3 -m json.tool
# Verify: type="loop", loop_file points to active .loop.md

# 3. PreToolUse (should block with loop doc path)
echo '{"session_id":"test3"}' | node compaction-reread.js pretooluse
# Should output JSON with decision:"block", reason includes loop doc path and "Do NOT pause"

# 4. PreToolUse again (should be silent — marker consumed)
echo '{"session_id":"test3"}' | node compaction-reread.js pretooluse

# Cleanup
rm -f /tmp/claude-loop-test3 /tmp/claude-compaction-test3
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
| Loop agent pauses after compaction | Loop marker missing — skill invocation didn't fire hook | Verify `register-loop-session.js` is in settings.json PostToolUse hooks |
| Loop re-read shows no loop file | No active `.loop.md` in project's `docs/loops/` | Ensure loop doc exists and isn't archived (`-archived` suffix) |
| Marker accumulates in /tmp | Compaction markers are one-shot; handler/loop markers persist | Markers cleaned on reboot (/tmp). No action needed. |
