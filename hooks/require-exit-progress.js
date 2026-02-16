#!/usr/bin/env node
/**
 * Exit Progress Enforcement Hook (Hook C)
 *
 * Stop hook — fires when a Claude session is ending.
 * Ensures workers can't exit without updating ## Progress and setting a
 * final Status in their dispatch file. Even if Hook B (progress checkpoints)
 * is circumvented, this guarantees at least one progress entry.
 *
 * Worker-only: exits silently for non-worker sessions.
 * Fails open: any error allows exit rather than blocking.
 *
 * Checks:
 *   1. ## Progress has meaningful content (not just the template placeholder)
 *   2. Status metadata field is no longer "active"
 *
 * Also cleans up the Hook B marker file on exit (best-effort).
 *
 * Hook input (JSON on stdin):
 *   { "hook_type": "Stop", "session_id": "...", "stop_hook_active": true/false }
 *
 * Hook output:
 *   Allow: exit 0, no stdout
 *   Block: stdout JSON {"decision":"block","reason":"..."}, exit 0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWorkerSession() {
  return process.env.HOME === '/tmp/claude-worker-config';
}

function getTmuxWindowName() {
  try {
    const pane = process.env.TMUX_PANE;
    if (!pane) return null;
    return execSync(`tmux display-message -t "${pane}" -p "#{window_name}"`, {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
  } catch {
    return null;
  }
}

function readWorkerDispatchPath() {
  // Try per-window file first (keyed by tmux window name)
  const windowName = getTmuxWindowName();
  if (windowName) {
    try {
      const p = path.join(process.env.HOME, '.claude', `worker-dispatch-path-${windowName}`);
      return fs.readFileSync(p, 'utf-8').trim();
    } catch {
      // Fall through to global singleton
    }
  }
  // Fall back to global singleton for backwards compatibility
  try {
    const p = path.join(process.env.HOME, '.claude', 'worker-dispatch-path');
    return fs.readFileSync(p, 'utf-8').trim();
  } catch {
    return null;
  }
}

/**
 * Extract the content of the ## Progress section from a dispatch file.
 * Returns the text between "## Progress" and the next heading (or EOF),
 * or null if the section doesn't exist.
 */
function extractProgressContent(fileContent) {
  const lines = fileContent.split('\n');
  let inProgress = false;
  let progressLines = [];

  for (const line of lines) {
    if (/^## Progress\b/.test(line)) {
      inProgress = true;
      continue;
    }
    if (inProgress && /^## /.test(line)) {
      // Hit the next section — stop
      break;
    }
    if (inProgress) {
      progressLines.push(line);
    }
  }

  if (!inProgress) return null;
  return progressLines.join('\n');
}

/**
 * Check whether the Progress section has meaningful content beyond just
 * the template placeholder text.
 */
function hasRealProgress(progressContent) {
  if (!progressContent) return false;

  // Strip the placeholder text and whitespace
  const cleaned = progressContent
    .replace(/\(Worker updates this section incrementally during execution\.\.\.\)/g, '')
    .trim();

  return cleaned.length > 0;
}

/**
 * Read the Status field from the metadata table in the dispatch file.
 * Returns the status string (lowercased, trimmed), or null if not found.
 */
function readStatus(fileContent) {
  const lines = fileContent.split('\n');
  for (const line of lines) {
    // Match table rows like: | **Status** | active |
    const match = line.match(/\|\s*\*?\*?Status\*?\*?\s*\|\s*(.+?)\s*\|/);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  return null;
}

/**
 * Clean up the Hook B checkpoint marker file (best-effort).
 */
function cleanupCheckpointMarker(sessionId) {
  try {
    const markerFile = `/tmp/worker-checkpoint-${sessionId}.json`;
    fs.unlinkSync(markerFile);
  } catch {
    // Best effort — don't block if cleanup fails
  }
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Worker-only enforcement
  if (!isWorkerSession()) {
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
    // Bad JSON — fail open
    process.exit(0);
  }

  const sessionId = hookData.session_id || 'unknown';

  // Loop prevention: if stop_hook_active, another stop hook already blocked.
  // Exit silently to prevent infinite loops.
  if (hookData.stop_hook_active === true) {
    process.exit(0);
  }

  // Clean up the Hook B marker file (best-effort, regardless of outcome)
  cleanupCheckpointMarker(sessionId);

  // Read dispatch file path
  const dispatchFile = readWorkerDispatchPath();
  if (!dispatchFile) {
    // Can't determine dispatch file — fail open
    process.exit(0);
  }

  // Read dispatch file content
  let content;
  try {
    content = fs.readFileSync(dispatchFile, 'utf-8');
  } catch {
    // Can't read dispatch file — fail open
    process.exit(0);
  }

  // Check 1: Progress section has meaningful content
  const progressContent = extractProgressContent(content);
  if (!hasRealProgress(progressContent)) {
    process.stderr.write('require-exit-progress: Blocking — Progress section is empty or only has placeholder\n');
    block(
      'You must update ## Progress in your dispatch file before exiting. ' +
      'Record what you accomplished, what\'s left, and any issues.\n\n' +
      `Dispatch file: ${dispatchFile}`
    );
    return;
  }

  // Check 2: Status has been updated from "active"
  const status = readStatus(content);
  if (status === 'active') {
    process.stderr.write('require-exit-progress: Blocking — Status is still "active"\n');
    block(
      'Update Status in your dispatch file metadata to \'completed\' or \'blocked\' before exiting.\n\n' +
      `Dispatch file: ${dispatchFile}`
    );
    return;
  }

  // Both checks pass — allow exit
  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`require-exit-progress: ${err.message}\n`);
  process.exit(0); // Fail open — never block on script errors
});
