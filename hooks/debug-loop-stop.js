#!/usr/bin/env node
/**
 * Debug-Loop Stop Hook
 *
 * Fires on Stop event. Checks for active debug loop,
 * validates phase exit criteria, and either transitions
 * to next phase or re-injects current phase prompt.
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const LIVING_DOC_PATTERN = 'debug-loop-*.md';
const CLAUDE_DIR = '.claude';

// --- Helper Functions ---

/**
 * Finds the first living doc matching the pattern in the project's .claude directory.
 * @param {string} cwd - Project working directory
 * @returns {string|null} - Full path to living doc or null if not found
 */
function findLivingDoc(cwd) {
  const claudeDir = path.join(cwd, CLAUDE_DIR);

  try {
    if (!fs.existsSync(claudeDir)) {
      return null;
    }

    const files = fs.readdirSync(claudeDir);
    const pattern = /^debug-loop-.*\.md$/;

    for (const file of files) {
      if (pattern.test(file)) {
        return path.join(claudeDir, file);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a living doc file, extracting YAML frontmatter.
 * @param {string} filePath - Path to the living doc
 * @returns {object|null} - Parsed frontmatter object or null on error
 */
function parseLivingDoc(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract YAML frontmatter between first two ---
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const yamlContent = frontmatterMatch[1];
    const result = {};

    // Simple YAML parser for flat key-value pairs
    const lines = yamlContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      // Parse value types
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (/^\d+$/.test(value)) {
        value = parseInt(value, 10);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Validates whether the current phase's exit criteria are met.
 * PLACEHOLDER - will be implemented in Task 7
 * @param {object} livingDoc - Parsed frontmatter from living doc
 * @param {string} cwd - Project working directory
 * @returns {{passed: boolean, reason: string}}
 */
function validateExitCriteria(livingDoc, cwd) {
  // PLACEHOLDER - will be implemented in Task 7
  return { passed: true, reason: '' };
}

/**
 * Transitions the living doc to the next phase.
 * PLACEHOLDER - will be implemented in Task 8
 * @param {string} livingDocPath - Path to the living doc
 * @param {object} livingDoc - Parsed frontmatter from living doc
 */
function transitionPhase(livingDocPath, livingDoc) {
  // PLACEHOLDER - will be implemented in Task 8
}

/**
 * Increments the phase_iteration counter in the living doc.
 * PLACEHOLDER - will be implemented in Task 8
 * @param {string} livingDocPath - Path to the living doc
 * @param {object} livingDoc - Parsed frontmatter from living doc
 */
function incrementIteration(livingDocPath, livingDoc) {
  // PLACEHOLDER - will be implemented in Task 8
}

/**
 * Outputs a block response and exits.
 * @param {string} reason - Reason for blocking
 * @param {string} additionalContext - Context to inject into Claude
 */
function outputBlock(reason, additionalContext) {
  const response = {
    decision: 'block',
    reason: reason,
    hookSpecificOutput: { additionalContext }
  };
  process.stdout.write(JSON.stringify(response));
  process.exit(0);
}

// --- Main ---

async function main() {
  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0); // Don't block on parse errors
  }

  const cwd = hookData.cwd || process.cwd();

  // Check for active debug loop
  const livingDocPath = findLivingDoc(cwd);
  if (!livingDocPath) {
    process.exit(0); // No active loop
  }

  // Parse living doc
  const livingDoc = parseLivingDoc(livingDocPath);
  if (!livingDoc) {
    process.exit(0); // Couldn't parse, don't block
  }

  // Check if loop is still active
  if (!livingDoc.active) {
    process.exit(0); // Loop complete
  }

  // Check if awaiting human review
  if (livingDoc.awaiting_human_review) {
    outputBlock(
      `Awaiting human review for ${livingDoc.phase}`,
      `SYSTEM: Debug loop is paused at ${livingDoc.phase}. Human review required before continuing.`
    );
    return;
  }

  // Validate exit criteria (placeholder for now)
  const validation = validateExitCriteria(livingDoc, cwd);

  if (!validation.passed) {
    incrementIteration(livingDocPath, livingDoc);
    outputBlock(
      `Phase ${livingDoc.phase} criteria not met`,
      `SYSTEM: Continue working on ${livingDoc.phase}. ${validation.reason}`
    );
    return;
  }

  // Criteria met - transition
  transitionPhase(livingDocPath, livingDoc);
  outputBlock(
    'Phase complete, transitioning',
    `SYSTEM: Phase ${livingDoc.phase} complete. Continuing to next phase.`
  );
}

main().catch(err => {
  process.stderr.write(`debug-loop-stop: ${err.message}\n`);
  process.exit(0); // Never block on errors
});
