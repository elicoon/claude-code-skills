# Remove Global Handler Marker Check Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the stale-prone global `claude-handler-active` existence check from `isHandlerSession()`, relying solely on the session-scoped `claude-handler-{session_id}` marker.

**Architecture:** `compaction-reread.js` identifies handler sessions using two checks: a global file (`/tmp/claude-handler-active`) and a session-specific file (`/tmp/claude-handler-{session_id}`). The global file is never cleaned up, causing regular sessions to be incorrectly treated as handler sessions after any handler session runs. The session-specific marker — written by `register-handler-session.js` via PostToolUse before Claude even processes the skill — is sufficient on its own. We remove the global check. The global file being written by the handler skill becomes a harmless no-op.

**Tech Stack:** Node.js, filesystem markers in `/tmp`

---

### Task 1: Write a test script that verifies current (broken) and expected (fixed) behavior

**Files:**
- Create: `/home/eli/projects/claude-code-skills/hooks/test-is-handler-session.js`

**Step 1: Write the test script**

```js
#!/usr/bin/env node
/**
 * Manual test for isHandlerSession() behavior.
 * Run before and after the fix to verify the change.
 *
 * Usage: node hooks/test-is-handler-session.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MARKER_DIR = os.tmpdir();
const FAKE_SESSION = 'test-session-aabbcc';
const GLOBAL_MARKER = path.join(MARKER_DIR, 'claude-handler-active');
const SESSION_MARKER = path.join(MARKER_DIR, `claude-handler-${FAKE_SESSION}`);

function cleanup() {
  [GLOBAL_MARKER, SESSION_MARKER].forEach(p => { try { fs.unlinkSync(p); } catch {} });
}

// --- Inline isHandlerSession (copy from compaction-reread.js after your edit) ---
function isHandlerSession(sessionId) {
  // AFTER THE FIX: only session-specific marker
  try {
    fs.accessSync(path.join(MARKER_DIR, `claude-handler-${sessionId}`));
    return true;
  } catch {}
  return false;
}
// --------------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label} — got ${actual}, expected ${expected}`);
    failed++;
  }
}

cleanup();

console.log('\nTest 1: No markers → not a handler session');
assert('no markers', isHandlerSession(FAKE_SESSION), false);

console.log('\nTest 2: Only stale global marker → NOT a handler session (the fix)');
fs.writeFileSync(GLOBAL_MARKER, JSON.stringify({ stale: true }));
assert('stale global marker ignored', isHandlerSession(FAKE_SESSION), false);
cleanup();

console.log('\nTest 3: Session-specific marker → IS a handler session');
fs.writeFileSync(SESSION_MARKER, JSON.stringify({ session_id: FAKE_SESSION }));
assert('session marker recognized', isHandlerSession(FAKE_SESSION), true);
cleanup();

console.log('\nTest 4: Both markers present → IS a handler session');
fs.writeFileSync(GLOBAL_MARKER, JSON.stringify({ stale: true }));
fs.writeFileSync(SESSION_MARKER, JSON.stringify({ session_id: FAKE_SESSION }));
assert('both markers, session wins', isHandlerSession(FAKE_SESSION), true);
cleanup();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

**Step 2: Run test to verify Test 2 currently FAILS (i.e. the bug is real)**

```bash
node /home/eli/projects/claude-code-skills/hooks/test-is-handler-session.js
```

Expected output: `Test 2` fails because the current code returns `true` for a stale global marker.

---

### Task 2: Apply the fix — remove the global marker check

**Files:**
- Modify: `/home/eli/projects/claude-code-skills/hooks/compaction-reread.js:33-45`

**Step 1: Remove the global marker check from `isHandlerSession()`**

Find and replace this block:

```js
function isHandlerSession(sessionId) {
  // Check generic marker (written by handler skill itself)
  try {
    fs.accessSync(path.join(MARKER_DIR, 'claude-handler-active'));
    return true;
  } catch {}
  // Check session-specific marker (written by PostToolUse hook, if it fired)
  try {
    fs.accessSync(getHandlerMarkerPath(sessionId));
    return true;
  } catch {}
  return false;
}
```

With:

```js
function isHandlerSession(sessionId) {
  // Session-specific marker written by register-handler-session.js (PostToolUse hook).
  // The global claude-handler-active file is no longer checked — it was never cleaned up
  // and caused regular sessions to be misidentified as handler sessions.
  try {
    fs.accessSync(getHandlerMarkerPath(sessionId));
    return true;
  } catch {}
  return false;
}
```

**Step 2: Run the test suite — all tests should pass**

```bash
node /home/eli/projects/claude-code-skills/hooks/test-is-handler-session.js
```

Expected: `4 passed, 0 failed`

**Step 3: Commit**

```bash
cd /home/eli/projects/claude-code-skills
git add hooks/compaction-reread.js hooks/test-is-handler-session.js
git commit -m "fix: stop treating stale global marker as active handler session

isHandlerSession() was checking for /tmp/claude-handler-active which is
never deleted, causing every session after any handler session to receive
unwanted compaction re-read prompts.

Now relies solely on the session-scoped claude-handler-{session_id} marker
written by register-handler-session.js, which is inherently self-expiring."
```

---

### Task 3: Delete the stale global marker and verify normal sessions are unaffected

**Step 1: Delete the stale marker**

```bash
rm -f /tmp/claude-handler-active
```

**Step 2: Verify it's gone**

```bash
ls /tmp/claude-handler-active 2>&1
```

Expected: `No such file or directory`

**Step 3: Manual smoke test — trigger a compaction in this session**

Use `/compact` in a regular (non-handler) Claude Code session. Confirm the compaction-reread hook does NOT fire a re-read prompt afterward.

---

### Task 4: Clean up accumulated stale session markers (optional housekeeping)

These don't cause any bugs but there are 100+ of them accumulating in `/tmp`.

**Step 1: Count them**

```bash
ls /tmp/claude-handler-* 2>/dev/null | wc -l
```

**Step 2: Delete markers older than 2 days**

```bash
find /tmp -maxdepth 1 -name 'claude-handler-*' -mtime +2 -delete
```

**Step 3: Verify reasonable count remains**

```bash
ls /tmp/claude-handler-* 2>/dev/null | wc -l
```

Expected: Only markers from the last 2 days remain.
