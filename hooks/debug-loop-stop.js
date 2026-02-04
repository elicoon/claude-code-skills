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
 * Parses a YAML value (handles scalars, quoted strings, null, booleans, numbers).
 * @param {string} value - The raw value string
 * @returns {*} - Parsed value
 */
function parseYamlValue(value) {
  if (value === '' || value === 'null' || value === '~') {
    return null;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  // Inline array: [item1, item2]
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(v => parseYamlValue(v.trim()));
  }
  return value;
}

/**
 * Gets the indentation level of a line (number of leading spaces).
 * @param {string} line - The line to check
 * @returns {number} - Number of leading spaces
 */
function getIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Parses YAML content with support for nested structures.
 * Handles objects, arrays (both inline and block), and scalars.
 * @param {string[]} lines - Array of lines to parse
 * @param {number} startIdx - Starting line index
 * @param {number} baseIndent - Base indentation level
 * @returns {{result: object, endIdx: number}}
 */
function parseYamlBlock(lines, startIdx, baseIndent) {
  const result = {};
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const rawLine = line;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const currentIndent = getIndent(rawLine);

    // If we've dedented past our base, we're done with this block
    if (currentIndent < baseIndent) {
      break;
    }

    // If this is at our expected indent level (or the first line)
    if (currentIndent === baseIndent || (i === startIdx && currentIndent >= baseIndent)) {
      // Check for array item (starts with -)
      if (trimmed.startsWith('- ')) {
        // This is a block array item at root level - unusual for our use case
        // but handle it for completeness
        i++;
        continue;
      }

      // Parse key: value
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) {
        i++;
        continue;
      }

      const key = trimmed.slice(0, colonIdx).trim();
      const afterColon = trimmed.slice(colonIdx + 1).trim();

      // Check if there's a value on the same line
      if (afterColon && !afterColon.startsWith('#')) {
        result[key] = parseYamlValue(afterColon);
        i++;
      } else {
        // Value is on subsequent lines (nested object or block array)
        i++;

        // Find the next non-empty, non-comment line to determine structure
        let nextIdx = i;
        while (nextIdx < lines.length) {
          const nextTrimmed = lines[nextIdx].trim();
          if (nextTrimmed && !nextTrimmed.startsWith('#')) break;
          nextIdx++;
        }

        if (nextIdx >= lines.length) {
          result[key] = null;
          break;
        }

        const nextLine = lines[nextIdx];
        const nextTrimmed = nextLine.trim();
        const nextIndent = getIndent(nextLine);

        // Check if it's more indented than current
        if (nextIndent > currentIndent) {
          if (nextTrimmed.startsWith('- ')) {
            // Block array
            const arr = [];
            let arrIdx = nextIdx;
            while (arrIdx < lines.length) {
              const arrLine = lines[arrIdx];
              const arrTrimmed = arrLine.trim();
              const arrIndent = getIndent(arrLine);

              if (!arrTrimmed || arrTrimmed.startsWith('#')) {
                arrIdx++;
                continue;
              }

              if (arrIndent < nextIndent) break;

              if (arrTrimmed.startsWith('- ')) {
                arr.push(parseYamlValue(arrTrimmed.slice(2).trim()));
                arrIdx++;
              } else {
                break;
              }
            }
            result[key] = arr;
            i = arrIdx;
          } else {
            // Nested object
            const nested = parseYamlBlock(lines, nextIdx, nextIndent);
            result[key] = nested.result;
            i = nested.endIdx;
          }
        } else {
          result[key] = null;
        }
      }
    } else {
      // Line is more indented than expected - skip
      i++;
    }
  }

  return { result, endIdx: i };
}

/**
 * Parses a living doc file, extracting YAML frontmatter.
 * Supports nested structures like exit_criteria and paths.
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
    const lines = yamlContent.split(/\r?\n/);

    const { result } = parseYamlBlock(lines, 0, 0);
    return result;
  } catch {
    return null;
  }
}

/**
 * Checks if a file contains a non-empty section with the given heading.
 * @param {string} filePath - Path to the file
 * @param {string} sectionHeading - Heading to look for (e.g., "Root Cause")
 * @returns {boolean} - True if section exists and has content
 */
function hasNonEmptySection(filePath, sectionHeading) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Look for markdown heading patterns: ## Root Cause, ### Root Cause, etc.
    const headingPattern = new RegExp(`^#+\\s*${sectionHeading}`, 'im');
    const match = content.match(headingPattern);
    if (!match) return false;

    // Get content after the heading until next heading or end
    const startIdx = match.index + match[0].length;
    const restContent = content.slice(startIdx);
    const nextHeadingMatch = restContent.match(/^#+\s/m);
    const sectionContent = nextHeadingMatch
      ? restContent.slice(0, nextHeadingMatch.index)
      : restContent;

    // Check if section has meaningful content (not just whitespace/placeholders)
    const trimmed = sectionContent.trim();
    return trimmed.length > 0 &&
           !trimmed.match(/^(TBD|TODO|N\/A|\.\.\.|-)$/i);
  } catch {
    return false;
  }
}

/**
 * Validates debug findings artifact.
 * Checks that the artifact exists and has a non-empty "Root Cause" section.
 * @param {string} cwd - Project working directory
 * @param {object} criteria - Exit criteria for the phase
 * @returns {{passed: boolean, reason: string}}
 */
function validateDebugFindings(cwd, criteria) {
  if (!criteria.artifact) {
    return { passed: true, reason: 'No artifact required' };
  }

  const artifactPath = path.join(cwd, criteria.artifact);
  if (!fs.existsSync(artifactPath)) {
    return { passed: false, reason: `Debug findings not found: ${criteria.artifact}` };
  }

  // Check for Root Cause section with content
  if (!hasNonEmptySection(artifactPath, 'Root Cause')) {
    return {
      passed: false,
      reason: 'Debug findings missing "Root Cause" section or section is empty'
    };
  }

  return { passed: true, reason: 'Debug findings validated' };
}

/**
 * Validates reproduction test artifact.
 * Checks that the test file exists.
 * @param {string} cwd - Project working directory
 * @param {object} criteria - Exit criteria for the phase
 * @param {string} testPath - Path to reproduction test from paths config
 * @returns {{passed: boolean, reason: string}}
 */
function validateReproductionTest(cwd, criteria, testPath) {
  // Use testPath from paths config if artifact not specified
  const targetPath = criteria.artifact || testPath;
  if (!targetPath) {
    return { passed: false, reason: 'No test path configured' };
  }

  const fullPath = path.join(cwd, targetPath);
  if (!fs.existsSync(fullPath)) {
    return { passed: false, reason: `Reproduction test not found: ${targetPath}` };
  }

  // Basic check: file should have meaningful content
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.trim().length < 50) {
      return { passed: false, reason: 'Test file appears to be empty or too short' };
    }
  } catch {
    return { passed: false, reason: `Could not read test file: ${targetPath}` };
  }

  return { passed: true, reason: 'Reproduction test exists' };
}

/**
 * Validates implementation phase.
 * Checks that the reproduction test still exists (implementation shouldn't break it).
 * Actual test execution is deferred (would require async shell execution).
 * @param {string} cwd - Project working directory
 * @param {string} testPath - Path to reproduction test
 * @returns {{passed: boolean, reason: string}}
 */
function validateImplementation(cwd, testPath) {
  if (!testPath) {
    return { passed: true, reason: 'No test path to validate' };
  }

  const fullPath = path.join(cwd, testPath);
  if (!fs.existsSync(fullPath)) {
    return { passed: false, reason: `Reproduction test was deleted: ${testPath}` };
  }

  return { passed: true, reason: 'Implementation checkpoint passed (test file exists)' };
}

/**
 * Validates generic artifact existence.
 * @param {string} cwd - Project working directory
 * @param {object} criteria - Exit criteria for the phase
 * @returns {{passed: boolean, reason: string}}
 */
function validateArtifactExists(cwd, criteria) {
  if (!criteria.artifact) {
    return { passed: true, reason: 'No artifact required' };
  }

  const artifactPath = path.join(cwd, criteria.artifact);
  if (!fs.existsSync(artifactPath)) {
    return { passed: false, reason: `Artifact not found: ${criteria.artifact}` };
  }

  return { passed: true, reason: 'Artifact exists' };
}

/**
 * Validates whether the current phase's exit criteria are met.
 * @param {object} livingDoc - Parsed frontmatter from living doc
 * @param {string} cwd - Project working directory
 * @returns {{passed: boolean, reason: string}}
 */
function validateExitCriteria(livingDoc, cwd) {
  const phase = livingDoc.phase;
  if (!phase) {
    return { passed: false, reason: 'No phase defined in living doc' };
  }

  // Get criteria for current phase
  const exitCriteria = livingDoc.exit_criteria;
  if (!exitCriteria) {
    return { passed: true, reason: 'No exit criteria defined' };
  }

  const criteria = exitCriteria[phase];
  if (!criteria) {
    return { passed: true, reason: `No criteria defined for phase: ${phase}` };
  }

  // Get paths config for test locations
  const paths = livingDoc.paths || {};

  // Phase-specific validation
  switch (phase) {
    case 'systematic-debug':
      return validateDebugFindings(cwd, criteria);

    case 'write-tests':
      return validateReproductionTest(cwd, criteria, paths.reproduction_test);

    case 'implement':
      return validateImplementation(cwd, paths.reproduction_test);

    case 'architecture':
    case 'write-plan':
    case 'uat':
    case 'verify':
      // These phases require artifact to exist
      return validateArtifactExists(cwd, criteria);

    case 'code-review':
    case 'fix-feedback':
    case 'update-docs':
      // These phases have no artifact requirement (artifact: null)
      return { passed: true, reason: 'No artifact validation needed' };

    default:
      // Unknown phase - just check artifact if specified
      return validateArtifactExists(cwd, criteria);
  }
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
