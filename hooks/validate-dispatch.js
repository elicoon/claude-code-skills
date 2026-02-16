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
    "## Background",
    "## Related Files",
    "### Source Files",
    "### Files Modified",
    "## Technical Context",
    "## Tasks",
    "## Verification Gate",
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

  // Check 8: Source Files format — at least 1 entry, each matching format
  const sourceFilesMatch = content.match(
    /### Source Files\s*\n([\s\S]*?)(?=\n### |\n## |$)/
  );
  if (sourceFilesMatch) {
    const sfContent = sourceFilesMatch[1].trim();
    const sfLines = sfContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("("));
    if (sfLines.length === 0) {
      errors.push("Source Files must have at least 1 file entry");
    }
    for (const line of sfLines) {
      if (!line.match(/^-\s*`[^`]+`\s*[—–-]\s*.+/)) {
        errors.push(
          `Source Files format error: "${line.substring(0, 60)}". Must be: - \`/path\` — description`
        );
      }
      const pathMatch = line.match(/^-\s*`([^`]+)`/);
      if (pathMatch) {
        const fp = pathMatch[1];
        if (fp.startsWith("./") || fp.startsWith("../") || fp.startsWith("~")) {
          errors.push(`Source Files path must be absolute: ${fp}`);
        }
      }
    }
  }

  // Check 9: Tasks must have at least 1 numbered step
  const tasksMatch = content.match(/## Tasks\s*\n([\s\S]*?)(?=\n## |$)/);
  if (tasksMatch) {
    const numberedSteps = tasksMatch[1].match(/^\d+\.\s+/gm);
    if (!numberedSteps || numberedSteps.length < 1) {
      errors.push("Tasks must have at least 1 numbered step (1. ...)");
    }
  }

  // Check 10: Verification Gate must have meaningful content
  const vgMatch = content.match(
    /## Verification Gate\s*\n([\s\S]*?)(?=\n## |$)/
  );
  if (vgMatch) {
    const vgContent = vgMatch[1].trim();
    if (vgContent.length < 10) {
      errors.push(
        "Verification Gate must have meaningful content (at least 10 characters)"
      );
    }
  }

  // Check 11: Background must not be empty
  const bgMatch = content.match(/## Background\s*\n([\s\S]*?)(?=\n## |$)/);
  if (bgMatch) {
    const bgContent = bgMatch[1].trim();
    if (bgContent.length < 10) {
      errors.push("Background section must have meaningful content");
    }
  }

  // Check 12: Technical Context must not be empty
  const tcMatch = content.match(
    /## Technical Context\s*\n([\s\S]*?)(?=\n## |$)/
  );
  if (tcMatch) {
    const tcContent = tcMatch[1].trim();
    if (tcContent.length < 10) {
      errors.push("Technical Context section must have meaningful content");
    }
  }

  // Check 13: Decision Needed required when Needs Approval = yes
  if (approvalMatch) {
    const approval = approvalMatch[1].trim().toLowerCase();
    if (approval === "yes") {
      const decisionMatch = content.match(
        /\*\*Decision Needed\*\*\s*\|\s*([^|]+)/
      );
      if (!decisionMatch || decisionMatch[1].trim().length < 10) {
        errors.push(
          'When Needs Approval = yes, metadata must include **Decision Needed** with a clear question (≥10 chars)'
        );
      }
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
