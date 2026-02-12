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

// Phase order by depth
const PHASE_ORDER = {
  'minimal': ['systematic-debug', 'write-tests', 'write-plan', 'implement', 'code-review', 'verify'],
  'standard': ['systematic-debug', 'write-tests', 'write-plan', 'uat', 'implement', 'code-review', 'update-docs', 'verify'],
  'full': ['systematic-debug', 'write-tests', 'architecture', 'write-plan', 'uat', 'implement', 'code-review', 'update-docs', 'verify']
};

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
 *
 * SUPPORTED YAML SUBSET:
 * - Key: value pairs (string, number, boolean, null)
 * - Nested objects (indentation-based)
 * - Block arrays (- item) including arrays of objects
 * - Inline arrays ([item1, item2])
 * - Quoted strings (single and double)
 * - Comments (#)
 *
 * NOT SUPPORTED (will silently fail or produce incorrect results):
 * - Multi-line strings (|, >, |-, >-)
 * - Flow mappings ({key: value})
 * - Anchors and aliases (&anchor, *alias)
 * - Tags (!!type)
 * - Complex keys (? key)
 * - Merge keys (<<)
 *
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
                // Check if this is "- key: value" (object item) or "- value" (scalar)
                const afterDash = arrTrimmed.slice(2).trim();
                const colonMatch = afterDash.match(/^(\w+):\s*(.*)/);

                if (colonMatch) {
                  // Object item - parse inline key:value and any following indented lines
                  const objItem = {};
                  const firstKey = colonMatch[1];
                  const firstValue = colonMatch[2].trim();
                  objItem[firstKey] = firstValue ? parseYamlValue(firstValue) : null;

                  arrIdx++;

                  // Parse any continuation lines (more indented than the dash)
                  const dashIndent = arrIndent + 2; // After "- "
                  while (arrIdx < lines.length) {
                    const contLine = lines[arrIdx];
                    const contTrimmed = contLine.trim();
                    const contIndent = getIndent(contLine);

                    if (!contTrimmed || contTrimmed.startsWith('#')) {
                      arrIdx++;
                      continue;
                    }

                    // If dedented to array level or less, we're done with this object
                    if (contIndent <= arrIndent) break;

                    // If it's another key:value at object level
                    const contColonMatch = contTrimmed.match(/^(\w+):\s*(.*)/);
                    if (contColonMatch) {
                      const contKey = contColonMatch[1];
                      const contValue = contColonMatch[2].trim();
                      objItem[contKey] = contValue ? parseYamlValue(contValue) : null;
                      arrIdx++;
                    } else {
                      arrIdx++;
                    }
                  }

                  arr.push(objItem);
                } else {
                  // Simple scalar value
                  arr.push(parseYamlValue(afterDash));
                  arrIdx++;
                }
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
 * Serializes a value to YAML format.
 * @param {*} value - Value to serialize
 * @param {number} indent - Current indentation level
 * @returns {string} - YAML string
 */
function serializeYamlValue(value, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    // Check if string needs quoting
    if (value === '' ||
        value.includes(':') ||
        value.includes('#') ||
        value.includes('\n') ||
        value.startsWith(' ') ||
        value.endsWith(' ') ||
        /^[{}\[\],&*#?|\-<>=!%@`]/.test(value) ||
        value === 'true' || value === 'false' ||
        value === 'null' || value === '~' ||
        /^-?\d+(\.\d+)?$/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    // Check if all elements are simple (scalars)
    const allSimple = value.every(v =>
      v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    );

    // Use inline format for short simple arrays
    if (allSimple && value.length <= 3) {
      const items = value.map(v => serializeYamlValue(v, 0));
      const inline = `[${items.join(', ')}]`;
      if (inline.length <= 60) {
        return inline;
      }
    }

    // Use block format for arrays
    const lines = [];
    for (const item of value) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Object in array - use inline-ish format for first key, indented for rest
        const keys = Object.keys(item);
        if (keys.length === 0) {
          lines.push(`${spaces}- {}`);
        } else {
          const firstKey = keys[0];
          const firstValue = serializeYamlValue(item[firstKey], 0);
          lines.push(`${spaces}- ${firstKey}: ${firstValue}`);
          for (let i = 1; i < keys.length; i++) {
            const key = keys[i];
            const val = serializeYamlValue(item[key], 0);
            lines.push(`${spaces}  ${key}: ${val}`);
          }
        }
      } else {
        lines.push(`${spaces}- ${serializeYamlValue(item, 0)}`);
      }
    }
    return '\n' + lines.join('\n');
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }

    const lines = [];
    for (const key of keys) {
      const val = value[key];
      const serialized = serializeYamlValue(val, indent + 1);

      if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length > 0) {
        // Nested object - put on next line
        lines.push(`${spaces}${key}:`);
        lines.push(serialized);
      } else if (Array.isArray(val) && val.length > 0 && serialized.startsWith('\n')) {
        // Block array - header then items
        lines.push(`${spaces}${key}:${serialized}`);
      } else {
        lines.push(`${spaces}${key}: ${serialized}`);
      }
    }
    return lines.join('\n');
  }

  return String(value);
}

/**
 * Serializes a living doc object to YAML frontmatter format.
 * @param {object} livingDoc - The living doc object
 * @returns {string} - YAML string (without --- delimiters)
 */
function serializeToYaml(livingDoc) {
  const lines = [];

  // Define the order and grouping of keys for readability
  const keyGroups = [
    { comment: '# Identity', keys: ['bug_slug', 'bug_file', 'project_root', 'started_at', 'depth', 'worktree'] },
    { comment: '# Loop Control', keys: ['active', 'phase', 'phase_iteration', 'max_phase_iterations', 'total_iterations'] },
    { comment: '# Exit Criteria', keys: ['exit_criteria'] },
    { comment: '# Human Checkpoints', keys: ['awaiting_human_review', 'human_checkpoints'] },
    { comment: '# Artifact Paths', keys: ['paths'] },
    { comment: '# Files Modified', keys: ['files_modified'] },
    { comment: '# Decisions Made', keys: ['decisions'] },
    { comment: '# Phase History', keys: ['history'] }
  ];

  const usedKeys = new Set();

  for (const group of keyGroups) {
    let groupHasContent = false;
    const groupLines = [];

    for (const key of group.keys) {
      if (key in livingDoc) {
        usedKeys.add(key);
        const value = livingDoc[key];
        const serialized = serializeYamlValue(value, 0);

        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
          // Nested object — re-serialize at indent 1 for proper nesting
          groupLines.push(`${key}:`);
          groupLines.push(serializeYamlValue(value, 1));
        } else if (Array.isArray(value) && value.length > 0 && serialized.startsWith('\n')) {
          // Block array — re-serialize at indent 1 so items are indented under the key
          groupLines.push(`${key}:${serializeYamlValue(value, 1)}`);
        } else {
          groupLines.push(`${key}: ${serialized}`);
        }
        groupHasContent = true;
      }
    }

    if (groupHasContent) {
      if (lines.length > 0) {
        lines.push('');
      }
      lines.push(group.comment);
      lines.push(...groupLines);
    }
  }

  // Add any remaining keys not in the groups
  const remainingKeys = Object.keys(livingDoc).filter(k => !usedKeys.has(k));
  if (remainingKeys.length > 0) {
    lines.push('');
    lines.push('# Other');
    for (const key of remainingKeys) {
      const value = livingDoc[key];
      const serialized = serializeYamlValue(value, 0);
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
        lines.push(`${key}:`);
        lines.push(serializeYamlValue(value, 1));
      } else if (Array.isArray(value) && value.length > 0 && serialized.startsWith('\n')) {
        lines.push(`${key}:${serializeYamlValue(value, 1)}`);
      } else {
        lines.push(`${key}: ${serialized}`);
      }
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Writes the living doc back to file, preserving content after frontmatter.
 * @param {string} filePath - Path to the living doc
 * @param {object} livingDoc - Updated living doc object
 */
function writeLivingDoc(filePath, livingDoc) {
  // Read existing file to preserve content after frontmatter
  const content = fs.readFileSync(filePath, 'utf-8');

  // Split on frontmatter delimiters
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---/);
  const bodyAfterFrontmatter = frontmatterMatch
    ? content.slice(frontmatterMatch[0].length)
    : '\n\n## Current Phase Instructions\n\n## Phase Log\n';

  // Serialize livingDoc back to YAML
  const newFrontmatter = serializeToYaml(livingDoc);
  const newContent = `---\n${newFrontmatter}---${bodyAfterFrontmatter}`;

  fs.writeFileSync(filePath, newContent);
}

/**
 * Checks if a human checkpoint is required after the given phase.
 * @param {object} livingDoc - Parsed frontmatter from living doc
 * @param {string} phase - The phase that just completed
 * @returns {{required: boolean, reason: string}}
 */
function checkHumanCheckpoint(livingDoc, phase) {
  const checkpoints = livingDoc.human_checkpoints || [];

  for (const checkpoint of checkpoints) {
    if (checkpoint.after === phase) {
      // Check condition if present
      if (checkpoint.condition) {
        // Simple condition parser for "depth == value"
        const condMatch = checkpoint.condition.match(/depth\s*==\s*(\w+)/);
        if (condMatch) {
          const requiredDepth = condMatch[1];
          if (livingDoc.depth !== requiredDepth) {
            continue; // Condition not met, skip this checkpoint
          }
        }
      }
      return { required: true, reason: checkpoint.reason || 'Human review required' };
    }
  }

  return { required: false, reason: '' };
}

/**
 * Transitions the living doc to the next phase.
 * Updates phase, resets iteration, records history, and checks for human checkpoints.
 * @param {string} livingDocPath - Path to the living doc
 * @param {object} livingDoc - Parsed frontmatter from living doc
 */
function transitionPhase(livingDocPath, livingDoc) {
  const currentPhase = livingDoc.phase;
  const depth = livingDoc.depth || 'standard';
  const phaseOrder = PHASE_ORDER[depth] || PHASE_ORDER['standard'];

  // Find current phase index
  const currentIndex = phaseOrder.indexOf(currentPhase);

  // Record history entry for completed phase
  const historyEntry = {
    phase: currentPhase,
    started: livingDoc.phase_started || livingDoc.started_at,
    completed: new Date().toISOString(),
    iterations: livingDoc.phase_iteration || 1,
    outcome: 'completed'
  };

  if (!livingDoc.history) {
    livingDoc.history = [];
  }
  livingDoc.history.push(historyEntry);

  // Check for human checkpoint after current phase
  const checkpoint = checkHumanCheckpoint(livingDoc, currentPhase);
  if (checkpoint.required) {
    livingDoc.awaiting_human_review = true;
    livingDoc.human_review_reason = checkpoint.reason;
    writeLivingDoc(livingDocPath, livingDoc);
    return;
  }

  // Determine next phase
  if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
    // Last phase or unknown phase - mark as complete
    livingDoc.active = false;
    livingDoc.phase = 'complete';
    livingDoc.completed_at = new Date().toISOString();
  } else {
    // Move to next phase
    livingDoc.phase = phaseOrder[currentIndex + 1];
    livingDoc.phase_iteration = 1;
    livingDoc.phase_started = new Date().toISOString();
  }

  // Increment total iterations
  livingDoc.total_iterations = (livingDoc.total_iterations || 0) + 1;

  writeLivingDoc(livingDocPath, livingDoc);
}

/**
 * Increments the phase_iteration counter in the living doc.
 * Checks for max iterations and sets stalled flag if exceeded.
 * @param {string} livingDocPath - Path to the living doc
 * @param {object} livingDoc - Parsed frontmatter from living doc
 * @returns {{stalled: boolean, reason: string}}
 */
function incrementIteration(livingDocPath, livingDoc) {
  const maxIterations = livingDoc.max_phase_iterations || 5;

  livingDoc.phase_iteration = (livingDoc.phase_iteration || 1) + 1;
  livingDoc.total_iterations = (livingDoc.total_iterations || 1) + 1;

  // Check if we've exceeded max iterations for this phase
  if (livingDoc.phase_iteration > maxIterations) {
    livingDoc.stalled = true;
    livingDoc.stalled_reason = `Phase ${livingDoc.phase} exceeded max iterations (${maxIterations})`;
    livingDoc.awaiting_human_review = true;
    livingDoc.human_review_reason = `Stalled: ${livingDoc.stalled_reason}`;
    writeLivingDoc(livingDocPath, livingDoc);
    return {
      stalled: true,
      reason: livingDoc.stalled_reason
    };
  }

  writeLivingDoc(livingDocPath, livingDoc);
  return { stalled: false, reason: '' };
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
    const iterResult = incrementIteration(livingDocPath, livingDoc);
    if (iterResult.stalled) {
      outputBlock(
        `Phase ${livingDoc.phase} stalled`,
        `SYSTEM: Debug loop STALLED. ${iterResult.reason}. Human intervention required to either adjust approach or reset iteration count.`
      );
      return;
    }
    outputBlock(
      `Phase ${livingDoc.phase} criteria not met`,
      `SYSTEM: Continue working on ${livingDoc.phase}. ${validation.reason}`
    );
    return;
  }

  // Criteria met - transition
  const completedPhase = livingDoc.phase;
  transitionPhase(livingDocPath, livingDoc);

  if (livingDoc.awaiting_human_review) {
    outputBlock(
      'Phase complete, awaiting review',
      `SYSTEM: Phase ${completedPhase} complete. Human checkpoint reached: ${livingDoc.human_review_reason || 'review required'}. Waiting for user approval before proceeding.`
    );
  } else {
    outputBlock(
      'Phase complete, transitioning',
      `SYSTEM: Phase ${completedPhase} complete. Continuing to ${livingDoc.phase}.`
    );
  }
}

main().catch(err => {
  process.stderr.write(`debug-loop-stop: ${err.message}\n`);
  process.exit(0); // Never block on errors
});
