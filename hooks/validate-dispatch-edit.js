#!/usr/bin/env node
/**
 * PostToolUse hook for Edit tool — protects frozen contract sections in dispatch files.
 *
 * Workers can only edit:
 *   - Lifecycle metadata fields (Status, Worker, Started, Completed, Commit, PR, Result, Blocker, Needs Approval)
 *   - The ## Progress section (everything from ## Progress to end of file)
 *
 * All other sections are frozen (the "contract" the handler wrote).
 * Non-worker sessions and non-dispatch files are always allowed.
 *
 * Reads tool input from stdin (Claude Code hook protocol).
 * Output: stdout JSON {"decision":"block","reason":"..."} to block, or exit 0 silently to allow.
 * Fails open: any error allows the edit rather than blocking work.
 */

const fs = require("fs");

// Sections whose content is frozen for workers
const FROZEN_HEADERS = [
  "## Metadata",
  "## Objective",
  "### Acceptance Criteria",
  "### Scope Boundaries",
  "## Context",
  "## Tasks",
  "## Verification Gate",
];

// Metadata table fields that workers ARE allowed to edit (even inside ## Metadata)
const MUTABLE_META_FIELDS = [
  "Status",
  "Worker",
  "Started",
  "Completed",
  "Commit",
  "PR",
  "Result",
  "Blocker",
  "Needs Approval",
];

/**
 * Parse the file into a list of section ranges.
 * Returns array of { header, startLine, endLine } where lines are 0-indexed.
 * endLine is exclusive (one past the last line of the section).
 */
function parseSections(lines) {
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match markdown headers (## or ###)
    if (/^#{2,3}\s+/.test(line)) {
      if (current) {
        current.endLine = i;
        sections.push(current);
      }
      current = { header: line.trim(), startLine: i, endLine: lines.length };
    }
  }
  if (current) {
    current.endLine = lines.length;
    sections.push(current);
  }

  return sections;
}

/**
 * Find which lines in the file the old_string spans.
 * Returns { startLine, endLine } (0-indexed, endLine exclusive) or null if not found.
 */
function findStringLines(lines, oldString) {
  const fullText = lines.join("\n");
  const idx = fullText.indexOf(oldString);
  if (idx === -1) return null;

  // Count newlines before the match to find start line
  const beforeMatch = fullText.substring(0, idx);
  const startLine = (beforeMatch.match(/\n/g) || []).length;

  // Count newlines within the match to find end line
  const matchNewlines = (oldString.match(/\n/g) || []).length;
  const endLine = startLine + matchNewlines + 1; // exclusive

  return { startLine, endLine };
}

/**
 * Check if old_string is a metadata table row containing only mutable fields.
 * Mutable rows look like: | **Status** | Running |
 */
function isMutableMetaRow(oldString) {
  // The old_string might span multiple lines; check each line
  const editLines = oldString.split("\n");
  for (const line of editLines) {
    const trimmed = line.trim();
    // Skip empty lines and table separator lines (|---|---|)
    if (!trimmed || /^\|[-\s|]+\|$/.test(trimmed)) continue;

    // If this line is a table row, check if it contains a mutable field
    if (trimmed.startsWith("|")) {
      const hasMutableField = MUTABLE_META_FIELDS.some(
        (field) => trimmed.includes(`**${field}**`) || trimmed.includes(`| ${field} |`)
      );
      if (!hasMutableField) {
        // This is a table row but NOT a mutable field — it's frozen
        return false;
      }
    }
    // Non-table lines within the metadata section (like the header itself) are frozen
    // But we only get here if old_string is within ## Metadata range,
    // so non-table, non-empty lines are part of the frozen structure
    else if (trimmed.length > 0) {
      return false;
    }
  }
  return true;
}

/**
 * Check if old_string overlaps with the HTML comment block containing WORKER CONTRACT.
 * The comment format is: <!-- ... WORKER CONTRACT ... -->
 * We find the <!-- that precedes WORKER CONTRACT and protect the entire block.
 */
function overlapsWorkerContract(fileContent, oldString) {
  const contractIdx = fileContent.indexOf("WORKER CONTRACT");
  if (contractIdx === -1) return false;

  // Find the opening <!-- that precedes WORKER CONTRACT
  const contractStart = fileContent.lastIndexOf("<!--", contractIdx);
  if (contractStart === -1) return false;

  // Find the closing --> after WORKER CONTRACT
  const contractEnd = fileContent.indexOf("-->", contractIdx);
  if (contractEnd === -1) return false;

  const editStart = fileContent.indexOf(oldString);
  if (editStart === -1) return false;
  const editEnd = editStart + oldString.length;

  // Check overlap: edit range intersects contract comment range
  const contractEndFull = contractEnd + 3; // include the -->
  return editStart < contractEndFull && editEnd > contractStart;
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    // Not JSON — allow
    return;
  }

  const filePath = payload?.tool_input?.file_path || "";
  const oldString = payload?.tool_input?.old_string;

  // Only act on dispatch files
  if (!filePath.includes("handler-dispatches") || !filePath.endsWith(".md")) {
    return;
  }

  // Only restrict worker sessions
  if (process.env.HOME !== "/tmp/claude-worker-config") {
    return;
  }

  // Need old_string to analyze the edit
  if (!oldString) {
    return;
  }

  // Read the dispatch file
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    // File not readable — fail open
    return;
  }

  // Check if old_string overlaps with the WORKER CONTRACT HTML comment
  if (overlapsWorkerContract(content, oldString)) {
    console.log(
      JSON.stringify({
        decision: "block",
        reason:
          "Workers cannot edit the WORKER CONTRACT comment. This is part of the dispatch contract set by the handler.",
      })
    );
    return;
  }

  const lines = content.split("\n");
  const sections = parseSections(lines);

  // Find where old_string appears in the file
  const editRange = findStringLines(lines, oldString);
  if (!editRange) {
    // old_string not found in file — the Edit tool will handle this error itself
    return;
  }

  // Check if the edit falls within the ## Progress section (or after it)
  const progressSection = sections.find((s) => s.header === "## Progress");
  if (progressSection && editRange.startLine >= progressSection.startLine) {
    // Edit is in ## Progress or after — always allowed for workers
    return;
  }

  // Check each frozen section
  for (const section of sections) {
    const isFrozenHeader = FROZEN_HEADERS.includes(section.header);
    if (!isFrozenHeader) continue;

    // Check if edit overlaps with this frozen section
    const overlaps =
      editRange.startLine < section.endLine &&
      editRange.endLine > section.startLine;

    if (!overlaps) continue;

    // Special case: edits to mutable metadata fields within ## Metadata are allowed
    if (section.header === "## Metadata" && isMutableMetaRow(oldString)) {
      return; // Allowed
    }

    // Determine a human-friendly section name for the error message
    const sectionName = section.header.replace(/^#+\s*/, "");

    console.log(
      JSON.stringify({
        decision: "block",
        reason: `Workers cannot edit the "${sectionName}" section. This is part of the dispatch contract set by the handler. Workers may only edit lifecycle metadata fields (Status, Worker, Started, etc.) and the ## Progress section.`,
      })
    );
    return;
  }

  // Edit is not in any frozen section — allow
}

main().catch(() => {
  // Fail open — don't block work due to hook bugs
});
