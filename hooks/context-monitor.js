#!/usr/bin/env node
/**
 * Context Window Monitor Hook for Claude Code
 *
 * Fires on Stop and PreCompact events. Estimates context window token usage
 * from the transcript file and triggers auto-handoff when usage crosses the
 * configured threshold.
 *
 * Usage: node context-monitor.js <stop|precompact>
 * Receives hook JSON via stdin.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// --- Configuration ---
const THRESHOLD_PERCENT = 60;
const MAX_TOKENS = 200000;
const CHARS_PER_TOKEN = 4;
const LOG_DIR = path.join(os.homedir(), '.claude', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'context-usage.jsonl');
const MARKER_DIR = os.tmpdir();

// --- Helpers ---

function getMarkerPath(sessionId) {
  return path.join(MARKER_DIR, `claude-handoff-${sessionId}`);
}

function markerExists(sessionId) {
  try {
    fs.accessSync(getMarkerPath(sessionId));
    return true;
  } catch {
    return false;
  }
}

function writeMarker(sessionId) {
  fs.writeFileSync(getMarkerPath(sessionId), new Date().toISOString());
}

function appendLog(entry) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const line = JSON.stringify(entry) + '\n';
  try {
    const fd = fs.openSync(LOG_FILE, 'a');
    try {
      fs.writeSync(fd, line);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // Log write failure is non-fatal — never block Claude
  }
}

/**
 * Estimates token usage by streaming through the transcript JSONL line-by-line.
 * Uses a character-count / 4 heuristic. Counts message content, tool inputs,
 * and tool outputs since all consume context window space.
 *
 * Fallback: if content extraction fails but we got a file size from stat,
 * uses file_bytes * 0.5 / CHARS_PER_TOKEN to discount JSON structural overhead.
 */
async function estimateTokens(transcriptPath) {
  let transcriptBytes = 0;
  let contentChars = 0;

  try {
    const stat = fs.statSync(transcriptPath);
    transcriptBytes = stat.size;
  } catch {
    return { estimatedTokens: 0, estimatedPercent: 0, transcriptBytes: 0 };
  }

  try {
    const fileStream = fs.createReadStream(transcriptPath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        // Extract text content from various message formats
        if (entry.content) {
          if (typeof entry.content === 'string') {
            contentChars += entry.content.length;
          } else if (Array.isArray(entry.content)) {
            for (const block of entry.content) {
              if (block.text) contentChars += block.text.length;
              if (block.content) contentChars += String(block.content).length;
              if (block.input) contentChars += JSON.stringify(block.input).length;
            }
          }
        }
        // Also count tool inputs/outputs which consume context
        if (entry.input) contentChars += JSON.stringify(entry.input).length;
        if (entry.output) contentChars += JSON.stringify(entry.output).length;
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Content extraction failed — fall back to discounted file size heuristic.
    // Apply 0.5x discount to account for JSON structural overhead in JSONL.
    if (transcriptBytes > 0) {
      contentChars = Math.round(transcriptBytes * 0.5);
    } else {
      return { estimatedTokens: 0, estimatedPercent: 0, transcriptBytes: 0 };
    }
  }

  const estimatedTokens = Math.round(contentChars / CHARS_PER_TOKEN);
  const estimatedPercent = Math.round((estimatedTokens / MAX_TOKENS) * 100);

  return { estimatedTokens, estimatedPercent, transcriptBytes };
}

// --- Main ---

async function main() {
  const hookType = process.argv[2]; // 'stop' or 'precompact'

  if (!['stop', 'precompact'].includes(hookType)) {
    process.stderr.write(`context-monitor: Unknown hook type: ${hookType}\n`);
    process.exit(0);
  }

  // Read stdin (hook JSON input)
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.stderr.write('context-monitor: Failed to parse stdin JSON\n');
    process.exit(0); // Don't block on parse errors
  }

  const sessionId = hookData.session_id || 'unknown';
  const transcriptPath = hookData.transcript_path || '';

  if (!transcriptPath) {
    process.stderr.write('context-monitor: No transcript_path in hook input\n');
    process.exit(0);
  }

  const { estimatedTokens, estimatedPercent, transcriptBytes } = await estimateTokens(transcriptPath);

  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    event: '', // set below
    estimated_tokens: estimatedTokens,
    estimated_percent: estimatedPercent,
    max_tokens: MAX_TOKENS,
    transcript_bytes: transcriptBytes
  };

  if (hookType === 'precompact') {
    // PreCompact: just log and allow compaction
    logEntry.event = 'COMPACTED';
    appendLog(logEntry);
    process.exit(0);
  }

  // Stop hook logic
  if (markerExists(sessionId)) {
    // Already triggered handoff for this session — log and allow stop
    logEntry.event = 'MONITORING';
    appendLog(logEntry);
    process.exit(0);
  }

  if (estimatedPercent < THRESHOLD_PERCENT) {
    // Under threshold — log and allow stop
    logEntry.event = 'CHECK';
    appendLog(logEntry);
    process.exit(0);
  }

  // Threshold crossed — trigger handoff
  writeMarker(sessionId);
  logEntry.event = 'HANDOFF_TRIGGERED';
  appendLog(logEntry);

  const response = {
    decision: 'block',
    reason: `Context at ~${estimatedPercent}%. Auto-running handoff.`,
    hookSpecificOutput: {
      additionalContext: `SYSTEM: Context window estimated at ${estimatedPercent}% (${estimatedTokens}/${MAX_TOKENS} tokens). Automatically running handoff. Execute /claude-code-skills:handoff now. After the handoff completes, inform the user that the auto-handoff was triggered and provide the starter prompt.`
    }
  };

  process.stdout.write(JSON.stringify(response));
  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`context-monitor: ${err.message}\n`);
  process.exit(0); // Never block Claude on script errors
});
