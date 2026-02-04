## Phase 8: E2E Browser Verification

You are performing final verification for bug: `{bug_slug}`

### Instructions

1. Invoke `/test-feature --results {paths.test_results}`
2. Execute verification in a REAL browser:
   - Start local dev server (if web app)
   - Open application in actual browser
   - Execute the EXACT reproduction steps from the bug task
   - Capture screenshot evidence at each step
3. Verify the bug no longer occurs
4. Check for regressions in related flows
5. Run the automated reproduction test

### Skill to Use

```
/test-feature --results {paths.test_results}
```

**Browser tools available:**
- **Playwright MCP** - For automated browser interactions
- **Chrome DevTools MCP** - For debugging, network inspection
- **Manual browser** - When guiding user through verification

### Exit Criteria

{exit_criteria.verify.description}

**Verification:** {exit_criteria.verify.verification}

**Required evidence:**
{exit_criteria.verify.evidence_required}

### Verification Principles (CRITICAL)

1. **Evidence before claims** - Never say "bug is fixed" without actual browser evidence
2. **Real browser execution** - Not just `npm test`, actual user-facing verification
3. **Exact reproduction steps** - From the original bug task, step by step
4. **Visual evidence** - Screenshots at each verification step
5. **No hedging language** - Don't use "should work," "probably fixed," "seems correct"

### Verification Checklist

**Browser Verification:**
- [ ] Dev server started and app accessible
- [ ] Browser opened to correct URL
- [ ] Original reproduction steps executed
- [ ] Bug no longer occurs (with screenshot)
- [ ] Related flows tested for regressions

**Automated Verification:**
- [ ] Reproduction test at `{paths.reproduction_test}` PASSES
- [ ] Full test suite passes

### Output

Write verification results to: `{paths.test_results}`

The results document MUST contain:
- Test Environment (date, commit, branch, browser, URL)
- Bug Reproduction Attempt (steps from bug task)
- Execution table (step, action, expected, actual, screenshot)
- Regression check results
- Automated test output
- Screenshots as evidence
- Final conclusion with checkboxes

### Human Checkpoint

After completing this phase, the workflow will pause for human review.

**Reason:** Human must confirm the bug is actually fixed based on evidence.

The human will review:
- Do screenshots show correct behavior?
- Were all reproduction steps tested?
- Are there any concerns about regressions?

### Completion Signal

This phase is complete when:
1. Results doc exists at `{paths.test_results}`
2. Browser verification completed with screenshots
3. Reproduction test passes
4. Human has confirmed fix (sets `awaiting_human_review: false`)

### On Failure

If verification fails:
1. Capture failure evidence (screenshot, console errors)
2. Create new bug task at `{paths.new_bugs}bug-{new-slug}.md`
3. Workflow loops back to Phase 1 with new bug

This ensures discovered issues are tracked and addressed systematically.
