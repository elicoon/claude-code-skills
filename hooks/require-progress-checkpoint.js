#!/usr/bin/env node
/**
 * Progress Checkpoint Enforcement Hook (Hook B)
 *
 * Forces workers to update the ## Progress section of their dispatch file
 * after meaningful events. This is the core enforcement loop of the
 * dispatch-as-ticket model.
 *
 * Invocation modes (via CLI argument):
 *   node require-progress-checkpoint.js posttooluse-edit   — after Edit tool
 *   node require-progress-checkpoint.js posttooluse-write  — after Write tool
 *   node require-progress-checkpoint.js posttooluse-skill  — after Skill tool
 *   node require-progress-checkpoint.js posttooluse-bash   — after Bash tool
 *   node require-progress-checkpoint.js pretooluse         — before any tool
 *
 * Worker-only: exits silently for non-worker sessions.
 * Fails open: any error allows the action rather than blocking work.
 *
 * State: /tmp/worker-checkpoint-{session_id}.json tracks whether a
 * progress update is needed and what triggered the requirement.
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

function markerPath(sessionId) {
  return `/tmp/worker-checkpoint-${sessionId}.json`;
}

function readMarker(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(markerPath(sessionId), 'utf-8'));
  } catch {
    return null;
  }
}

function writeMarker(sessionId, data) {
  try {
    fs.writeFileSync(markerPath(sessionId), JSON.stringify(data));
  } catch {
    // Best effort — fail open
  }
}

function defaultMarker(dispatchFile) {
  return {
    needed: false,
    bash_count: 0,
    trigger: null,
    dispatch_file: dispatchFile,
  };
}

/**
 * Find the 0-indexed line number where "## Progress" starts in the file.
 * Returns -1 if not found.
 */
function findProgressLine(fileContent) {
  const lines = fileContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^## Progress\b/.test(lines[i])) return i;
  }
  return -1;
}

/**
 * Check whether old_string appears at or after the ## Progress line.
 */
function isEditInProgressSection(fileContent, oldString) {
  const progressLine = findProgressLine(fileContent);
  if (progressLine === -1) return false;

  // Find where old_string appears
  const idx = fileContent.indexOf(oldString);
  if (idx === -1) return false;

  // Count newlines before the match to get its start line
  const beforeMatch = fileContent.substring(0, idx);
  const startLine = (beforeMatch.match(/\n/g) || []).length;

  return startLine >= progressLine;
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

// ---------------------------------------------------------------------------
// PostToolUse handlers — detect triggering events and update marker
// ---------------------------------------------------------------------------

function handlePostEdit(hookData, marker) {
  const filePath = hookData?.tool_input?.file_path || '';
  const oldString = hookData?.tool_input?.old_string || '';

  if (filePath === marker.dispatch_file) {
    // Editing the dispatch file — check if it's in the Progress section
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Can't read dispatch file — don't change state
      return marker;
    }

    if (oldString && isEditInProgressSection(content, oldString)) {
      // This IS the checkpoint write — clear the marker
      marker.needed = false;
      marker.bash_count = 0;
      marker.trigger = null;
    }
    // Edit to dispatch file but not Progress section — ignore (metadata updates etc.)
  } else {
    // Editing any other file — trigger checkpoint requirement
    marker.needed = true;
    marker.trigger = 'code-edit';
  }

  return marker;
}

function handlePostWrite(hookData, marker) {
  const filePath = hookData?.tool_input?.file_path || '';

  if (filePath === marker.dispatch_file) {
    // Writing the dispatch file — treat as checkpoint (Write replaces whole file)
    marker.needed = false;
    marker.bash_count = 0;
    marker.trigger = null;
  } else {
    // Creating/writing any other file
    marker.needed = true;
    marker.trigger = 'file-create';
  }

  return marker;
}

function handlePostSkill(hookData, marker) {
  marker.needed = true;
  marker.trigger = 'skill-complete';
  return marker;
}

function handlePostBash(hookData, marker) {
  const command = hookData?.tool_input?.command || '';

  // Only skip counting for bash commands that write to the dispatch file.
  // Read-only commands (cat, head) that reference it still count toward backstop.
  if (marker.dispatch_file) {
    const df = marker.dispatch_file;
    const writesDispatch = command.includes(`> ${df}`) || command.includes(`>> ${df}`) || command.includes(`tee ${df}`);
    if (writesDispatch) {
      return marker;
    }
  }

  // Check for git commit
  if (/git\s+commit/.test(command)) {
    marker.needed = true;
    marker.trigger = 'git-commit';
  }

  // Increment bash count
  marker.bash_count = (marker.bash_count || 0) + 1;

  // Backstop: too many bash calls without a checkpoint
  if (marker.bash_count >= 30) {
    marker.needed = true;
    marker.trigger = 'bash-backstop';
  }

  return marker;
}

// ---------------------------------------------------------------------------
// PreToolUse handler — enforce checkpoint before next action
// ---------------------------------------------------------------------------

function handlePreToolUse(hookData, marker) {
  if (!marker || !marker.needed) {
    // No checkpoint needed — allow
    return;
  }

  const toolName = hookData?.tool_name || '';
  const toolInput = hookData?.tool_input || {};

  // Allow edits/writes to the dispatch file (they're about to write the checkpoint)
  if (toolName === 'Edit' && toolInput.file_path === marker.dispatch_file) {
    return; // Allow
  }
  if (toolName === 'Write' && toolInput.file_path === marker.dispatch_file) {
    return; // Allow
  }
  // Also allow Read of the dispatch file (they may need to read it before editing)
  if (toolName === 'Read' && toolInput.file_path === marker.dispatch_file) {
    return; // Allow
  }

  // Block with helpful message
  const trigger = marker.trigger || 'recent activity';
  const dispatchPath = marker.dispatch_file || 'your dispatch file';
  process.stderr.write(`require-progress-checkpoint: Blocking — checkpoint needed (${trigger})\n`);
  block(
    `Progress checkpoint required. Update ## Progress in your dispatch file with what you just did (${trigger}). Then continue.\n\nDispatch file: ${dispatchPath}`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const mode = process.argv[2];
  if (!mode) return; // No mode specified — exit silently

  // Worker-only enforcement
  if (!isWorkerSession()) return;

  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    return; // Bad JSON — fail open
  }

  // Determine session ID
  const sessionId = hookData.session_id || String(process.ppid || 'default');

  // Determine dispatch file path
  const dispatchFile = readWorkerDispatchPath();
  if (!dispatchFile) {
    // Can't determine dispatch file — no enforcement possible
    return;
  }

  // --- PreToolUse mode ---
  if (mode === 'pretooluse') {
    const marker = readMarker(sessionId);
    handlePreToolUse(hookData, marker);
    return;
  }

  // --- PostToolUse modes ---
  // Load or create marker
  let marker = readMarker(sessionId) || defaultMarker(dispatchFile);
  // Always keep dispatch_file current
  marker.dispatch_file = dispatchFile;

  switch (mode) {
    case 'posttooluse-edit':
      marker = handlePostEdit(hookData, marker);
      break;
    case 'posttooluse-write':
      marker = handlePostWrite(hookData, marker);
      break;
    case 'posttooluse-skill':
      marker = handlePostSkill(hookData, marker);
      break;
    case 'posttooluse-bash':
      marker = handlePostBash(hookData, marker);
      break;
    default:
      // Unknown mode — exit silently
      return;
  }

  writeMarker(sessionId, marker);
}

main().catch(() => {
  // Fail open — never block work due to hook bugs
});
