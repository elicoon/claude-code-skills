# Loop Compaction Re-read Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After context compaction during a loop session, force the agent to re-read the active loop document and continue autonomously (no user acknowledgment pause).

**Architecture:** Extend the existing `compaction-reread.js` hook with a new `loop` session type. Add a `register-loop-session.js` PostToolUse hook (mirroring `register-handler-session.js`) that writes a `/tmp/claude-loop-{session_id}` marker when the loop skill is invoked. On compaction, the hook detects the marker, finds the active loop document, and blocks the first post-compaction tool call with instructions to re-read the loop doc and continue.

**Tech Stack:** Node.js (hooks), Claude Code hook protocol (stdin JSON, stdout JSON `{decision, reason}`)

---

### Task 1: Create `register-loop-session.js` hook

**Files:**
- Create: `hooks/register-loop-session.js`

**Step 1: Write the hook**

This mirrors `hooks/register-handler-session.js` exactly, but matches the `loop` skill name and writes a loop-specific marker that includes the working directory (needed to find `docs/loops/*.loop.md`).

```js
#!/usr/bin/env node
/**
 * Register Loop Session Hook (PostToolUse — Skill matcher)
 *
 * When the loop skill is invoked, writes a session marker to /tmp/claude-loop-{session_id}.
 * This marker is used by compaction-reread.js to detect loop sessions.
 *
 * Receives hook JSON via stdin with session_id, tool_input, tool_name.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch (err) {
    process.stderr.write(`register-loop-session: Failed to parse stdin JSON: ${err.message}\n`);
    process.exit(0);
  }

  const sessionId = hookData.session_id;
  if (!sessionId) {
    process.exit(0);
  }

  const skillName = hookData.tool_input && hookData.tool_input.skill;
  if (!skillName || !skillName.includes('loop')) {
    process.exit(0);
  }

  // Write loop session marker with cwd for loop doc discovery
  const markerPath = path.join(os.tmpdir(), `claude-loop-${sessionId}`);
  fs.writeFileSync(markerPath, JSON.stringify({
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    skill: skillName,
    cwd: hookData.cwd || process.cwd(),
  }));

  process.stderr.write(`register-loop-session: Registered loop session ${sessionId}\n`);
  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`register-loop-session: ${err.message}\n`);
  process.exit(0);
});
```

**Step 2: Verify the file was created**

Run: `node -c hooks/register-loop-session.js`
Expected: No output (syntax OK)

**Step 3: Commit**

```bash
git add hooks/register-loop-session.js
git commit -m "feat: add register-loop-session hook for compaction detection"
```

---

### Task 2: Add loop detection to `compaction-reread.js`

**Files:**
- Modify: `hooks/compaction-reread.js`

**Step 1: Add `isLoopSession()` and `getLoopMarkerPath()` functions**

Add after the existing `isWorkerSession()` function (around line 46):

```js
function getLoopMarkerPath(sessionId) {
  return path.join(MARKER_DIR, `claude-loop-${sessionId}`);
}

function isLoopSession(sessionId) {
  try {
    fs.accessSync(getLoopMarkerPath(sessionId));
    return true;
  } catch {}
  return false;
}

function readLoopMarkerData(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(getLoopMarkerPath(sessionId), 'utf-8'));
  } catch {
    return null;
  }
}

function findActiveLoopDoc(cwd) {
  // Look for non-archived loop docs in docs/loops/
  const loopsDir = path.join(cwd, 'docs', 'loops');
  try {
    const files = fs.readdirSync(loopsDir);
    const activeLoops = files.filter(f => f.endsWith('.loop.md') && !f.includes('-archived'));
    if (activeLoops.length === 0) return null;
    // Return the most recently modified one
    let latest = null;
    let latestMtime = 0;
    for (const f of activeLoops) {
      const fullPath = path.join(loopsDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latest = fullPath;
      }
    }
    return latest;
  } catch {
    return null;
  }
}
```

**Step 2: Add `buildLoopReason()` function**

Add after `buildWorkerReason()` (around line 98):

```js
function buildLoopReason(loopFile) {
  return [
    'Context was just compacted. You are in an active loop session. Before continuing:',
    `1. Re-read the loop document at ${loopFile}`,
    '2. Find the step marked [CURRENT] and review Discoveries and What Failed sections.',
    '3. Continue executing the current step. Do NOT pause for user acknowledgment.',
  ].join('\n');
}
```

**Step 3: Update the `precompact` branch to detect loop sessions**

In the `precompact` handler (around line 125-144), add loop detection after the worker check and before the "Regular session" comment. The check order becomes: handler → worker → loop → regular.

Replace:
```js
    // Regular session — exit silently
    process.exit(0);
```

With:
```js
    } else if (isLoopSession(sessionId)) {
      const loopMarker = readLoopMarkerData(sessionId);
      const cwd = (loopMarker && loopMarker.cwd) || process.cwd();
      const loopDoc = findActiveLoopDoc(cwd);
      fs.writeFileSync(markerPath, JSON.stringify({
        type: 'loop',
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        loop_file: loopDoc,
      }));
    }
    // Regular session — exit silently
    process.exit(0);
```

**Step 4: Update the `pretooluse` branch to handle loop type**

In the `pretooluse` handler (around line 162-170), add a loop case after the worker cases:

```js
    } else if (markerData.type === 'loop' && markerData.loop_file) {
      reason = buildLoopReason(markerData.loop_file);
    } else if (markerData.type === 'loop') {
      reason = 'Context was just compacted. You are in an active loop session. Find and re-read the active loop document in docs/loops/ and continue executing the [CURRENT] step. Do NOT pause for user acknowledgment.';
    } else {
```

**Step 5: Update the `stop` branch to handle loop type**

In the `stop` handler (around line 197-207), add the same loop cases after the worker cases:

```js
    } else if (markerData.type === 'loop' && markerData.loop_file) {
      reason = buildLoopReason(markerData.loop_file);
    } else if (markerData.type === 'loop') {
      reason = 'Context was just compacted. You are in an active loop session. Find and re-read the active loop document in docs/loops/ and continue executing the [CURRENT] step. Do NOT pause for user acknowledgment.';
    } else {
```

**Step 6: Verify syntax**

Run: `node -c hooks/compaction-reread.js`
Expected: No output (syntax OK)

**Step 7: Commit**

```bash
git add hooks/compaction-reread.js
git commit -m "feat: add loop session type to compaction-reread hook"
```

---

### Task 3: Register the hook in `~/.claude/settings.json`

**Files:**
- Modify: `~/.claude/settings.json`

**Step 1: Add PostToolUse hook for register-loop-session.js**

Add a new entry to the `PostToolUse` array with `"matcher": "Skill"`:

```json
{
  "matcher": "Skill",
  "hooks": [
    {
      "type": "command",
      "command": "node /home/eli/projects/claude-code-skills/hooks/register-loop-session.js",
      "timeout": 5
    }
  ]
}
```

Place it after the existing `register-handler-session.js` entry (after the block ending around line 104).

**Step 2: Verify settings.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude/settings.json', 'utf-8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

No commit for settings.json — it's outside the repo. Just verify it parses.

---

### Task 4: Manual test with an active loop document

**Step 1: Verify loop detection works end-to-end**

Create a test script that simulates the hook pipeline:

```bash
# Simulate register-loop-session receiving a Skill invocation
echo '{"session_id":"test-loop-123","tool_input":{"skill":"loop"},"cwd":"/home/eli/projects/golf-clip"}' | node hooks/register-loop-session.js

# Verify marker was written
cat /tmp/claude-loop-test-loop-123

# Simulate precompact
echo '{"session_id":"test-loop-123"}' | node hooks/compaction-reread.js precompact

# Verify compaction marker was written with loop type
cat /tmp/claude-compaction-test-loop-123

# Simulate pretooluse — should output block decision
echo '{"session_id":"test-loop-123"}' | node hooks/compaction-reread.js pretooluse
```

Expected: The pretooluse call outputs JSON with `decision: "block"` and a reason mentioning the loop document path.

**Step 2: Verify marker cleanup**

```bash
# Marker should be consumed — second pretooluse should pass through silently
echo '{"session_id":"test-loop-123"}' | node hooks/compaction-reread.js pretooluse
```

Expected: No output (marker consumed, tool allowed).

**Step 3: Clean up test markers**

```bash
rm -f /tmp/claude-loop-test-loop-123 /tmp/claude-compaction-test-loop-123
```

**Step 4: Commit (if any test-driven fixes were needed)**

```bash
git add -A && git commit -m "fix: address issues found during loop compaction testing"
```

---

### Task 5: Add "Do not pause" directive to loop document template

**Files:**
- Modify: `templates/LIVING_PLAN.md`

**Step 1: Add visible autonomous execution directive as markdown**

Add a blockquote directive immediately after the `# LIVING_PLAN: [Title]` heading, **before** the HTML comment block — so it's the first visible content the agent reads:

```markdown
# LIVING_PLAN: [Title]

> **AUTONOMOUS EXECUTION:** Do not pause for user acknowledgment. After context compaction, re-read this document from the top, find the `[CURRENT]` step, and continue executing until all acceptance criteria are met or max iterations reached.
```

This must be visible markdown (not an HTML comment) so the agent sees it prominently when reading the loop doc. Defense-in-depth: even if the compaction-reread hook fails, this instruction survives.

**Step 2: Commit**

```bash
git add templates/LIVING_PLAN.md
git commit -m "feat: add autonomous execution directive to loop template header"
```
