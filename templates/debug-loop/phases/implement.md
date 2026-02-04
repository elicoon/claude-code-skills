## Phase 4: Implement Fix

You are implementing the fix for bug: `{bug_slug}`

### Instructions

1. Read the implementation plan at `{paths.implementation_plan}`
2. Based on depth, invoke the appropriate skill:
   - **Minimal:** `/executing-plans {paths.implementation_plan}`
   - **Standard/Full:** `/subagent-driven-development {paths.implementation_plan}`
3. Follow the plan task by task
4. After each task, verify per the plan's verification steps
5. Track all modified files

### Skill to Use

**For minimal depth:**
```
/executing-plans {paths.implementation_plan}
```

**For standard/full depth:**
```
/subagent-driven-development {paths.implementation_plan}
```

### Exit Criteria

{exit_criteria.implement.description}

**Verification:** {exit_criteria.implement.verification}

**Required evidence:**
{exit_criteria.implement.evidence_required}

### Implementation Guidelines

1. **Follow the plan exactly** - Don't deviate without updating the plan first
2. **Small commits** - Commit after each logical change
3. **Run tests frequently** - Check for regressions after each change
4. **Track modifications** - Note every file changed in the living doc

### Output

No new artifact created. Instead:
- Source files modified per plan
- All modified file paths added to `files_modified` in living doc
- Reproduction test at `{paths.reproduction_test}` now PASSES
- Existing test suite has no regressions

### Completion Signal

This phase is complete when:
1. All plan tasks are implemented
2. Reproduction test PASSES (was failing, now passes)
3. Full test suite runs without regressions
4. All modified files are tracked in living doc
