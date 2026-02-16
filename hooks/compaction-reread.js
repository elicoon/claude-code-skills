#!/usr/bin/env node
/**
 * Compaction Re-read Hook
 *
 * Three modes:
 *   node compaction-reread.js precompact   — detects session type, writes typed marker
 *   node compaction-reread.js pretooluse   — blocks first tool call after compaction, consumes marker (primary)
 *   node compaction-reread.js stop         — failsafe: catches marker if pretooluse never fired (no tools used)
 *
 * Session types:
 *   - handler: /tmp/claude-handler-active exists (written by handler skill) OR /tmp/claude-handler-{session_id} exists
 *   - worker:  HOME === /tmp/claude-worker-config (worker env)
 *   - regular: neither — exits silently
 *
 * Receives hook JSON via stdin with session_id (and stop_hook_active for stop mode).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MARKER_DIR = os.tmpdir();

function getCompactionMarkerPath(sessionId) {
  return path.join(MARKER_DIR, `claude-compaction-${sessionId}`);
}

function getHandlerMarkerPath(sessionId) {
  return path.join(MARKER_DIR, `claude-handler-${sessionId}`);
}

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

function isWorkerSession() {
  return process.env.HOME === '/tmp/claude-worker-config';
}

function readWorkerDispatchPath() {
  const dispatchPathFile = path.join(process.env.HOME, '.claude', 'worker-dispatch-path');
  try {
    return fs.readFileSync(dispatchPathFile, 'utf-8').trim();
  } catch {
    return null;
  }
}

function buildHandlerReason() {
  return [
    'Context was just compacted. Before continuing:',
    '1. Re-read docs/handler-state.md for current orchestration state',
    '2. Re-read all files in docs/handler-dispatches/ that are active',
    '3. Check active dispatch files for Status: blocked and Blocker fields',
    '4. Acknowledge what you\'ve re-read, then continue your work.',
  ].join('\n');
}

function buildWorkerReason(dispatchFile) {
  return [
    'Context was just compacted. Before continuing:',
    `1. Re-read your dispatch file at ${dispatchFile}`,
    '2. Review the ## Progress section for what you have already completed.',
    '3. Acknowledge what is done, what is next, then continue.',
  ].join('\n');
}

async function main() {
  const hookType = process.argv[2];

  if (!['precompact', 'pretooluse', 'stop'].includes(hookType)) {
    process.stderr.write(`compaction-reread: Unknown hook type: ${hookType}\n`);
    process.exit(0);
  }

  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.stderr.write('compaction-reread: Failed to parse stdin JSON\n');
    process.exit(0);
  }

  const sessionId = hookData.session_id || 'unknown';
  const markerPath = getCompactionMarkerPath(sessionId);

  if (hookType === 'precompact') {
    // Detect session type and write typed compaction marker
    if (isHandlerSession(sessionId)) {
      fs.writeFileSync(markerPath, JSON.stringify({
        type: 'handler',
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      }));
    } else if (isWorkerSession()) {
      const dispatchFile = readWorkerDispatchPath();
      fs.writeFileSync(markerPath, JSON.stringify({
        type: 'worker',
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        dispatch_file: dispatchFile,
      }));
    }
    // Regular session — exit silently
    process.exit(0);
  }

  if (hookType === 'pretooluse') {
    // Primary handler: blocks first tool call after compaction, consumes marker
    // so subsequent tool calls (including Read for re-reading) go through.
    let markerData;
    try {
      markerData = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
    } catch {
      // No marker — no compaction happened, allow tool
      process.exit(0);
    }

    // Consume marker (one-shot) so Read calls for re-reading aren't blocked
    try { fs.unlinkSync(markerPath); } catch {}

    // Build type-specific block reason
    let reason;
    if (markerData.type === 'handler') {
      reason = buildHandlerReason();
    } else if (markerData.type === 'worker' && markerData.dispatch_file) {
      reason = buildWorkerReason(markerData.dispatch_file);
    } else if (markerData.type === 'worker') {
      reason = 'Context was just compacted. Re-read your dispatch file and review the ## Progress section before continuing.';
    } else {
      process.exit(0);
    }

    process.stderr.write(`compaction-reread: PreToolUse blocking for ${markerData.type} re-read\n`);
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    process.exit(0);
  }

  if (hookType === 'stop') {
    // Loop breaker: if stop_hook_active, exit immediately
    if (hookData.stop_hook_active === true) {
      process.exit(0);
    }

    // Check for compaction marker (failsafe — PreToolUse should have consumed it)
    let markerData;
    try {
      markerData = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
    } catch {
      // No marker — no compaction happened or PreToolUse already consumed it
      process.exit(0);
    }

    // Delete marker (one-shot)
    try { fs.unlinkSync(markerPath); } catch {}

    // Build type-specific response
    let reason;
    if (markerData.type === 'handler') {
      reason = buildHandlerReason();
    } else if (markerData.type === 'worker' && markerData.dispatch_file) {
      reason = buildWorkerReason(markerData.dispatch_file);
    } else if (markerData.type === 'worker') {
      // Worker without dispatch path — generic re-read
      reason = 'Context was just compacted. Re-read your dispatch file and review the ## Progress section before continuing.';
    } else {
      // Unknown type — shouldn't happen but handle gracefully
      process.exit(0);
    }

    process.stderr.write(`compaction-reread: Blocking for ${markerData.type} re-read (marker from ${markerData.timestamp})\n`);

    const response = {
      decision: 'block',
      reason: reason,
    };

    process.stdout.write(JSON.stringify(response));
    process.exit(0);
  }
}

main().catch(err => {
  process.stderr.write(`compaction-reread: ${err.message}\n`);
  process.exit(0); // Never block Claude on script errors
});
