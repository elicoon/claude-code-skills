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
    "## Progress",
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
  const requiredMeta = ["Project", "Repo", "Priority", "Dispatched", "Status", "Needs Approval"];
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

  // Check 6: Status must be "queued" on creation
  const statusMatch = content.match(/\*\*Status\*\*\s*\|\s*([^|]+)/);
  if (statusMatch) {
    const status = statusMatch[1].trim().toLowerCase();
    if (status !== "queued") {
      errors.push(`Status must be "queued" on creation, got: "${statusMatch[1].trim()}"`);
    }
  }

  // Check 7: Needs Approval must be "yes" or "no"
  const approvalMatch = content.match(/\*\*Needs Approval\*\*\s*\|\s*([^|]+)/);
  if (approvalMatch) {
    const approval = approvalMatch[1].trim().toLowerCase();
    if (approval !== "yes" && approval !== "no") {
      errors.push(`Needs Approval must be "yes" or "no", got: "${approvalMatch[1].trim()}"`);
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
