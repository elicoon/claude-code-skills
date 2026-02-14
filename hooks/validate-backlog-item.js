#!/usr/bin/env node
/**
 * PostToolUse hook for Write tool — validates backlog item files.
 * Ensures items created by product-strategist (and other skills) have
 * all required fields before entering the pipeline.
 *
 * Reads the tool input from stdin (Claude Code hook protocol).
 * Only activates when the written file path matches backlog/tasks/*.md
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
    return;
  }

  const filePath = payload?.tool_input?.file_path || "";

  // Only validate backlog task files
  if (!filePath.includes("backlog/tasks/") || !filePath.endsWith(".md")) {
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    console.error(`BACKLOG VALIDATION FAILED: Could not read ${filePath}`);
    process.exit(1);
  }

  const errors = [];

  // Check 1: Has a title (### heading)
  if (!content.match(/^### .+/m)) {
    errors.push("Missing title (### heading)");
  }

  // Check 2: Has Status field
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  if (!statusMatch) {
    errors.push("Missing Status field");
  }

  // Check 3: Has Priority field
  const priorityMatch = content.match(/\*\*Priority:\*\*\s*(.+)/);
  if (!priorityMatch) {
    errors.push("Missing Priority field");
  } else {
    const priority = priorityMatch[1].trim().toLowerCase();
    if (!["high", "medium", "low"].includes(priority)) {
      errors.push(`Invalid Priority value: "${priorityMatch[1].trim()}" (must be high, medium, or low)`);
    }
  }

  // Check 4: Has Type field (required for workforce pipeline)
  const typeMatch = content.match(/\*\*Type:\*\*\s*(.+)/);
  if (!typeMatch) {
    errors.push("Missing Type field (required: bug-fix | feature | refactor | research | documentation | grooming)");
  } else {
    const validTypes = ["bug-fix", "feature", "refactor", "research", "documentation", "grooming"];
    const type = typeMatch[1].trim().toLowerCase();
    if (!validTypes.includes(type)) {
      errors.push(`Invalid Type value: "${typeMatch[1].trim()}" (must be one of: ${validTypes.join(", ")})`);
    }
  }

  // Check 5: Has Acceptance Criteria with at least 2 checkboxes
  const acSection = content.match(/#### Acceptance Criteria\s*\n([\s\S]*?)(?=\n####|\n###|$)/);
  if (!acSection) {
    errors.push("Missing #### Acceptance Criteria section");
  } else {
    const checkboxes = acSection[1].match(/- \[ \]/g);
    if (!checkboxes || checkboxes.length < 2) {
      errors.push(`Acceptance Criteria must have at least 2 checkboxes (found ${checkboxes ? checkboxes.length : 0})`);
    }
  }

  // Check 6: Has Next steps with at least 1 numbered item
  const stepsSection = content.match(/#### Next steps\s*\n([\s\S]*?)(?=\n####|\n###|$)/);
  if (!stepsSection) {
    errors.push("Missing #### Next steps section");
  } else {
    const numbered = stepsSection[1].match(/^\d+\./gm);
    if (!numbered || numbered.length < 1) {
      errors.push("Next steps must have at least 1 numbered item");
    }
  }

  if (errors.length > 0) {
    const msg = [
      "BACKLOG ITEM VALIDATION FAILED",
      `File: ${path.basename(filePath)}`,
      "",
      ...errors.map((e, i) => `  ${i + 1}. ${e}`),
      "",
      "Fix these issues. Incomplete backlog items cannot be dispatched by the workforce pipeline.",
    ].join("\n");
    console.error(msg);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Backlog validator error:", err.message);
  process.exit(1);
});
