## Phase 3c: UAT/Testing Plan

**Depth:** standard/full only (skipped for minimal)

You are creating a UAT specification for bug: `{bug_slug}`

### Instructions

1. Read the bug task at `{paths.bug_task}`
2. Read the implementation plan at `{paths.implementation_plan}`
3. Invoke `/uat --output-prefix {paths.uat}`
4. Generate:
   - UAT specification with test scenarios
   - Testing checklist for verification

### Skill to Use

```
/uat --output-prefix {paths.uat}
```

This will create:
- `{paths.uat}` (UAT specification)
- `{paths.uat}` with `-checklist.md` suffix (Testing checklist)

### Exit Criteria

{exit_criteria.uat.description}

**Verification:** {exit_criteria.uat.verification}

**Required evidence:**
{exit_criteria.uat.evidence_required}

### Output

The UAT documents should include:
- Test scenarios covering the bug fix
- Edge cases related to the root cause
- Regression scenarios for related functionality
- Clear pass/fail criteria for each test
- Expected outcomes documented

### Completion Signal

This phase is complete when:
1. UAT doc exists at the specified path
2. Test cases are documented with expected outcomes
3. Checklist is ready for Phase 8 verification
