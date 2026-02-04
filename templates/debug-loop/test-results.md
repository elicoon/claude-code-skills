# E2E Verification Results: {bug_slug}

## Test Environment
- Date: {date}
- Commit: {commit_hash}
- Branch: {branch}
- Browser: Chrome {version} / Firefox {version}
- Local URL: http://localhost:{port}

## Bug Reproduction Attempt

### Original Bug Steps (from bug task)
1. {step_1}
2. {step_2}
3. {step_3}

### Execution
| Step | Action | Expected | Actual | Screenshot |
|------|--------|----------|--------|------------|
| 1 | {action} | {expected} | {actual} | [screenshot_1.png] |
| 2 | {action} | {expected} | {actual} | [screenshot_2.png] |
| 3 | {action} | {expected} | {actual} | [screenshot_3.png] |

### Result
- [ ] **Bug is fixed** — Original issue no longer occurs
- [ ] **Evidence captured** — Screenshots/video show correct behavior

## Regression Check

### Related Flows Tested
| Flow | Status | Notes |
|------|--------|-------|
| {related_flow_1} | PASS/FAIL | |
| {related_flow_2} | PASS/FAIL | |

## Automated Test Verification

### Reproduction Test
- **File:** `{paths.reproduction_test}`
- **Command:** `{test_command}`
- **Result:** PASS / FAIL
- **Output:**
```
{output}
```

## Evidence
<!-- Browser screenshots, video recordings, console logs -->

### Screenshots
- [Before fix attempt](screenshots/before.png)
- [After fix - step 1](screenshots/step1.png)
- [After fix - step 2](screenshots/step2.png)
- [Final state](screenshots/final.png)

### Console Output
```
{console_logs_if_relevant}
```

## Conclusion
- [ ] Bug is fixed (verified in browser)
- [ ] No regressions in related flows
- [ ] Automated reproduction test passes
- [ ] Ready for merge
