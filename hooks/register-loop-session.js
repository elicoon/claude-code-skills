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
