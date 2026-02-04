## Phase 5: Code Review

You are reviewing the implementation for bug: `{bug_slug}`

### Instructions

1. Review all files in `files_modified` from the living doc
2. Invoke `/code-review` with depth-appropriate rigor:
   - **Minimal:** Self-review only (quick sanity check)
   - **Standard:** Single reviewer pass (thorough review)
   - **Full:** Adversarial two-reviewer (spec compliance + code quality)
3. Document any issues found
4. Categorize issues as blocking or non-blocking

### Skill to Use

```
/code-review
```

**Depth behavior:**
- Minimal: Focus on obvious bugs, security issues
- Standard: Full review including style, patterns, edge cases
- Full: Two-pass review - first for spec compliance, second for code quality

### Exit Criteria

{exit_criteria.code-review.description}

**Verification:** {exit_criteria.code-review.verification}

**Required evidence:**
{exit_criteria.code-review.evidence_required}

### Review Checklist

**Correctness:**
- [ ] Fix addresses the root cause (not just symptoms)
- [ ] Edge cases handled
- [ ] No new bugs introduced

**Quality:**
- [ ] Code follows project conventions
- [ ] No unnecessary complexity
- [ ] Appropriate error handling

**Testing:**
- [ ] Reproduction test is meaningful
- [ ] Test covers the actual fix

**Documentation:**
- [ ] Code comments where needed
- [ ] No outdated comments left behind

### Output

Review feedback documented. If issues found:
- Blocking issues must be fixed before proceeding
- Non-blocking issues can be noted for future improvement

### Completion Signal

This phase is complete when:
1. Review is conducted at appropriate depth
2. All blocking issues are identified
3. If blocking issues exist: transition to fix-feedback phase
4. If no blocking issues: transition to update-docs (standard/full) or verify (minimal)
