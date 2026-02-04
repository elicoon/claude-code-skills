## Phase 6: Address Review Feedback

You are addressing code review feedback for bug: `{bug_slug}`

### Instructions

1. Read the review feedback from the Phase 5 history entry
2. Address each blocking issue identified
3. Continue from the Phase 4 implementation context
4. After fixes, the workflow will loop back to Phase 5 for re-review

### Context

This phase exists to handle the review -> fix -> re-review loop.

**Previous phase:** Code Review (Phase 5) identified blocking issues
**Next phase:** Returns to Code Review (Phase 5) for validation

### Exit Criteria

{exit_criteria.fix-feedback.description}

**Verification:** {exit_criteria.fix-feedback.verification}

**Required evidence:**
{exit_criteria.fix-feedback.evidence_required}

### Fix Guidelines

1. **Address blocking issues first** - Non-blocking can wait
2. **Understand the concern** - Don't just "fix" without understanding why
3. **Minimal changes** - Fix the issue, don't refactor unrelated code
4. **Re-run tests** - Ensure fixes don't break anything
5. **Update tracking** - Add any new modified files to living doc

### Blocking Issues to Address

Review the code-review phase history entry for the list of blocking issues.

Each fix should:
- Directly address the reviewer's concern
- Not introduce new issues
- Maintain test coverage

### Output

No new artifact created. Instead:
- Source files modified to address feedback
- All newly modified file paths added to `files_modified`
- Tests still pass after changes

### Completion Signal

This phase is complete when:
1. All blocking issues have been addressed
2. Tests still pass
3. Ready for re-review in Phase 5

**Note:** This phase loops back to Phase 5 (Code Review). The loop continues until review passes with no blocking issues.
