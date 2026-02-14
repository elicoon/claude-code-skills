#!/usr/bin/env node
/**
 * Register Handler Session Hook (PostToolUse — Skill matcher)
 *
 * When the handler skill is invoked, writes a session marker to /tmp/claude-handler-{session_id}.
 * This marker is used by compaction-reread.js to detect handler sessions.
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
    process.stderr.write(`register-handler-session: Failed to parse stdin JSON: ${err.message}\n`);
    process.exit(0);
  }

  const sessionId = hookData.session_id;
  if (!sessionId) {
    process.exit(0);
  }

  const skillName = hookData.tool_input && hookData.tool_input.skill;
  if (!skillName || !skillName.includes('handler')) {
    process.exit(0);
  }

  // Write handler session marker
  const markerPath = path.join(os.tmpdir(), `claude-handler-${sessionId}`);
  fs.writeFileSync(markerPath, JSON.stringify({
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    skill: skillName,
  }));

  process.stderr.write(`register-handler-session: Registered handler session ${sessionId}\n`);
  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`register-handler-session: ${err.message}\n`);
  process.exit(0);
});
