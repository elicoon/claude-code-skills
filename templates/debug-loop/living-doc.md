---
# Identity
bug_slug: "{slug}"
bug_file: "backlog/tasks/bug-{slug}.md"
project_root: "{project_root}"
started_at: "{timestamp}"
depth: "{depth}"  # minimal | standard | full
worktree: null  # Path to worktree if --worktree flag was used, otherwise null

# Loop Control
active: true
phase: "systematic-debug"
phase_iteration: 1
max_phase_iterations: 5
total_iterations: 1

# Exit Criteria (human-approved in Phase 0)
# These are BUG-SPECIFIC, not generic - generated during init based on bug description
exit_criteria:
  systematic-debug:
    description: ""
    verification: ""
    evidence_required: []
    artifact: "docs/plans/{date}-{slug}-debug.md"

  write-tests:
    description: ""
    verification: ""
    evidence_required: []
    artifact: "tests/{test_dir}/{slug}.test.{ext}"

  architecture:  # full only
    description: ""
    verification: ""
    evidence_required: []
    artifact: "docs/plans/{date}-{slug}-architecture.md"

  write-plan:
    description: ""
    verification: ""
    evidence_required: []
    artifact: "docs/plans/{date}-{slug}-plan.md"

  uat:  # standard/full only
    description: ""
    verification: ""
    evidence_required: []
    artifact: "docs/plans/{date}-{slug}-uat.md"

  implement:
    description: ""
    verification: ""
    evidence_required: []
    artifact: null  # No new doc, modifies source files

  code-review:
    description: ""
    verification: ""
    evidence_required: []
    artifact: null  # Review happens inline or in PR

  fix-feedback:  # Loop back from code-review
    description: ""
    verification: ""
    evidence_required: []
    artifact: null  # Fixes source files based on review

  update-docs:  # standard/full only
    description: ""
    verification: ""
    evidence_required: []
    artifact: null  # Modifies existing docs

  verify:
    description: ""
    verification: ""
    evidence_required: []
    artifact: "docs/plans/{date}-{slug}-results.md"

# Human Checkpoints
awaiting_human_review: false
human_checkpoints:
  - after: "phase-0-init"
    reason: "Approve exit criteria before loop begins"
  - after: "architecture"
    reason: "Approve architecture decisions"
    condition: "depth == full"
  - after: "verify"
    reason: "Confirm bug is actually fixed"

# Artifact Paths (ALL artifacts, resolved at init time)
paths:
  living_doc: ".claude/debug-loop-{slug}.md"
  bug_task: "backlog/tasks/bug-{slug}.md"
  debug_findings: "docs/plans/{date}-{slug}-debug.md"
  reproduction_test: "tests/{test_dir}/{slug}.test.{ext}"
  architecture: "docs/plans/{date}-{slug}-architecture.md"
  implementation_plan: "docs/plans/{date}-{slug}-plan.md"
  uat: "docs/plans/{date}-{slug}-uat.md"
  test_results: "docs/plans/{date}-{slug}-results.md"
  new_bugs: "backlog/tasks/"  # Where to create bugs found during verification

# Files Modified (paths only, for quick reference)
files_modified: []

# Decisions Made
decisions: []

# Phase History
history: []
---

## Current Phase Instructions

<!-- Dynamically loaded from templates/phases/{phase}.md -->

## Phase Log

<!-- Append-only log of what happened each iteration -->
