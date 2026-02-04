## Phase 2: Write Reproduction Test

You are creating a reproduction test for bug: `{bug_slug}`

### Instructions

1. Read the debug findings at `{paths.debug_findings}` to understand the root cause
2. Invoke `/test-driven-development --test-file {paths.reproduction_test}`
3. Write ONLY the failing test (do not implement the fix yet)
4. The test must:
   - Reproduce the exact bug behavior
   - FAIL with the current codebase
   - Pass once the fix is implemented

### Skill to Use

```
/test-driven-development --test-file {paths.reproduction_test}
```

**Note:** Only write the failing test in this phase. The implementation comes in Phase 4.

### Exit Criteria

{exit_criteria.write-tests.description}

**Verification:** {exit_criteria.write-tests.verification}

**Required evidence:**
{exit_criteria.write-tests.evidence_required}

### Output

Create test file at: `{paths.reproduction_test}`

The test must:
- Target the specific root cause identified in debug findings
- Use descriptive test name that references the bug
- Include clear assertions that will pass when fixed
- Currently FAIL (this verifies it reproduces the bug)

### Completion Signal

This phase is complete when:
1. Test file exists at `{paths.reproduction_test}`
2. Running the test results in FAILURE (reproducing the bug)
3. The failure matches the expected bug behavior
