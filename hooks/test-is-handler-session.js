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
