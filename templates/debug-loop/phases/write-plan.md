## Phase 3b: Implementation Plan

You are creating an implementation plan for bug: `{bug_slug}`

### Instructions

1. Read the debug findings at `{paths.debug_findings}`
2. Read the reproduction test at `{paths.reproduction_test}`
3. If full depth, read the architecture doc at `{paths.architecture}`
4. Invoke `/write-plan --output {paths.implementation_plan}`
5. Create a detailed, step-by-step implementation plan

### Skill to Use

```
/write-plan --output {paths.implementation_plan}
```

### Exit Criteria

{exit_criteria.write-plan.description}

**Verification:** {exit_criteria.write-plan.verification}

**Required evidence:**
{exit_criteria.write-plan.evidence_required}

### Output

Write implementation plan to: `{paths.implementation_plan}`

The plan MUST contain:
- Overview: Brief summary of the fix
- Prerequisites checklist:
  - [ ] Debug findings reviewed
  - [ ] Reproduction test exists and fails
- Tasks: Numbered list with:
  - Files to modify for each task
  - Specific changes to make
  - Verification steps per task
- Files to Modify: Table with file, change type, description
- Verification Steps: How to confirm the fix works
- Rollback Plan: How to revert if needed

### Completion Signal

This phase is complete when:
1. Plan doc exists at `{paths.implementation_plan}`
2. Tasks section has at least one numbered task
3. Each task has verification steps
