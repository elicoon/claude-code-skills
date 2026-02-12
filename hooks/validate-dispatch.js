#!/usr/bin/env node
/**
 * PostToolUse hook for Write tool — validates handler dispatch files.
 * Rejects malformed dispatches before they enter the pipeline.
 *
 * Reads the tool input from stdin (Claude Code hook protocol).
 * Only activates when the written file path matches handler-dispatches/*.md
 */

const fs = require("fs");
const path = require("path");

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    // Not JSON — skip silently
    return;
  }

  const filePath = payload?.tool_input?.file_path || "";

  // Only validate dispatch files
  if (!filePath.includes("handler-dispatches") || !filePath.endsWith(".md")) {
    return;
  }

  // Read the file that was just written
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    console.error(`DISPATCH VALIDATION FAILED: Could not read ${filePath}`);
    process.exit(1);
  }

  const errors = [];

  // Check 1: Required sections exist
  const requiredSections = [
    "## Metadata",
    "## Objective",
    "### Acceptance Criteria",
    "### Scope Boundaries",
    "## Context",
    "## On Completion",
    "## On Blocker",
  ];

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`Missing section: ${section}`);
    }
  }

  // Check 2: No unresolved path variables
  const unresolvedVars = content.match(/\{[A-Z_]+\}/g);
  if (unresolvedVars) {
    const unique = [...new Set(unresolvedVars)];
    errors.push(`Unresolved path variables: ${unique.join(", ")}`);
  }

  // Check 3: Acceptance criteria have checkboxes
  const acMatch = content.match(
    /### Acceptance Criteria\s*\n([\s\S]*?)(?=\n###|\n##|$)/
  );
  if (acMatch) {
    const checkboxes = acMatch[1].match(/- \[ \]/g);
    if (!checkboxes || checkboxes.length < 1) {
      errors.push(
        "Acceptance criteria must have at least 1 checkbox (- [ ] ...)"
      );
    }
  }

  // Check 4: Metadata table has required fields
  const requiredMeta = ["Project", "Repo", "Priority", "Dispatched"];
  for (const field of requiredMeta) {
    if (!content.includes(`**${field}**`)) {
      errors.push(`Metadata missing required field: ${field}`);
    }
  }

  // Check 5: Repo path is absolute
  const repoMatch = content.match(/\*\*Repo\*\*\s*\|\s*(.+)/);
  if (repoMatch) {
    const repoPath = repoMatch[1].trim();
    if (
      repoPath.startsWith("./") ||
      repoPath.startsWith("../") ||
      repoPath.startsWith("~")
    ) {
      errors.push(`Repo path is not absolute: ${repoPath}`);
    }
  }

  // Check 6: On Completion has absolute path
  const completionSection = content.match(
    /## On Completion\s*\n([\s\S]*?)(?=\n## |$)/
  );
  if (completionSection) {
    const hasAbsPath =
      /[A-Z]:\\|\/home\/|\/Users\//.test(completionSection[1]);
    if (!hasAbsPath) {
      errors.push("On Completion section must contain an absolute path to the results file");
    }
  }

  if (errors.length > 0) {
    const msg = [
      "DISPATCH VALIDATION FAILED",
      `File: ${path.basename(filePath)}`,
      "",
      ...errors.map((e, i) => `  ${i + 1}. ${e}`),
      "",
      "Fix these issues before proceeding. Malformed dispatches waste worker time.",
    ].join("\n");
    console.error(msg);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Dispatch validator error:", err.message);
  process.exit(1);
});
