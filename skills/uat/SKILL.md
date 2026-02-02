---
name: uat
description: Generate comprehensive UAT documentation and executable test checklists before implementation
---

# /claude-code-skills:uat

Generate User Acceptance Testing documentation and executable test checklists. Creates the verification contract that `test-feature` runs against.

## When to Use

- Automatically invoked after `superpowers:writing-plans` completes
- Before writing any code
- When requirements change significantly (to update UAT)

## When NOT to Use

- For unit tests (those should run during development)
- When there's no implementation plan yet (use brainstorming first)

---

## Instructions for Claude

When this skill is invoked:

### Step 1: Identify Feature Scope

Check if the user specified a feature or plan file:

**With argument:** `/claude-code-skills:uat video-export`
- Look for matching plan file in `docs/plans/*video-export*.md`
- Look for matching spec in `backlog/specs/`

**Without argument:**
- Check for most recent plan file in `docs/plans/`
- Ask: "Which feature should I generate UAT for?"

### Step 2: Explore Project Context

Use Task agent with Explore subagent to understand:

1. **Implementation plan details** - Read the plan file to understand what's being built
2. **Spec file** - If referenced in plan, read the detailed requirements
3. **Existing codebase** - Architecture, patterns, integration points
4. **Existing tests** - Understand verification patterns already in use
5. **API contracts** - External service dependencies
6. **Configuration** - Environment variables, feature flags

Announce what you're exploring:
> Exploring project to understand test requirements...
> - Reading implementation plan
> - Analyzing codebase architecture
> - Identifying integration points
> - Reviewing existing test patterns

### Step 3: Propose Test Data Requirements

Based on exploration, propose the test data needed:

> **Proposed Test Data:**
>
> | Data | Description | Setup |
> |------|-------------|-------|
> | [item] | [what it is] | [how to create/obtain] |
>
> Does this test data look right, or should I adjust?

**Wait for user confirmation before proceeding.**

### Step 4: Generate Test Cases

Systematically generate test cases for each category:

#### Category Order:
1. **Happy Path** - Core functionality working as intended
2. **Error Handling** - Invalid input, missing data, permissions, service failures
3. **Edge Cases** - Empty states, max limits, special characters, concurrency
4. **Boundary Conditions** - Off-by-one, date boundaries, numeric limits
5. **Integration Points** - Real API calls, database ops, external services
6. **Performance** - Load times, response times, resource usage
7. **Manual Verification** - Subjective UX judgments only

For each test case, include:
- **ID**: Category prefix + number (HP-1, ERR-1, EDGE-1, etc.)
- **Criteria**: High-level what to verify
- **Detailed Steps**: Numbered step-by-step instructions
- **Expected Result**: Specific observable outcome
- **Complexity**: `[quick]`, `[moderate]`, or `[thorough]`

### Step 5: Write UAT Document

Write to `docs/plans/YYYY-MM-DD-<feature>-uat.md`:

```markdown
# UAT: <Feature Name>

## Overview

[Brief description of what's being tested and success criteria]

## Test Data Requirements

| Data | Description | Setup | Teardown |
|------|-------------|-------|----------|
| [item] | [description] | [setup steps] | [cleanup steps] |

## Test Cases

### Category: Happy Path

| ID | Criteria | Detailed Steps | Expected Result | Complexity |
|----|----------|----------------|-----------------|------------|
| HP-1 | [what] | 1. [step] 2. [step] | [result] | [quick/moderate/thorough] |

### Category: Error Handling

| ID | Criteria | Detailed Steps | Expected Result | Complexity |
|----|----------|----------------|-----------------|------------|
| ERR-1 | [what] | 1. [step] 2. [step] | [result] | [quick/moderate/thorough] |

### Category: Edge Cases

| ID | Criteria | Detailed Steps | Expected Result | Complexity |
|----|----------|----------------|-----------------|------------|
| EDGE-1 | [what] | 1. [step] 2. [step] | [result] | [quick/moderate/thorough] |

### Category: Boundary Conditions

| ID | Criteria | Detailed Steps | Expected Result | Complexity |
|----|----------|----------------|-----------------|------------|
| BOUND-1 | [what] | 1. [step] 2. [step] | [result] | [quick/moderate/thorough] |

### Category: Integration Points

| ID | Criteria | Detailed Steps | Expected Result | Complexity |
|----|----------|----------------|-----------------|------------|
| INT-1 | [what] | 1. [step] 2. [step] | [result] | [quick/moderate/thorough] |

### Category: Performance

| ID | Criteria | Detailed Steps | Expected Result | Complexity |
|----|----------|----------------|-----------------|------------|
| PERF-1 | [what] | 1. [step] 2. [step] | [result] | [quick/moderate/thorough] |

### Category: Manual Verification (Subjective)

| ID | Criteria | What to Evaluate | Complexity |
|----|----------|------------------|------------|
| MAN-1 | [what] | [subjective judgment needed] | [quick/moderate/thorough] |
```

### Step 6: Write Executable Checklist

Write to `docs/plans/YYYY-MM-DD-<feature>-checklist.md`:

```markdown
# Test Checklist: <Feature Name>

Source: [<feature>-uat.md](./<date>-<feature>-uat.md)

## Automatable (Claude executes)

### Happy Path
- [ ] HP-1: [criteria]
- [ ] HP-2: [criteria]

### Error Handling
- [ ] ERR-1: [criteria]

### Edge Cases
- [ ] EDGE-1: [criteria]

### Boundary Conditions
- [ ] BOUND-1: [criteria]

### Integration Points
- [ ] INT-1: [criteria]

### Performance
- [ ] PERF-1: [criteria]

## Manual (Human verifies)

- [ ] MAN-1: [criteria]
- [ ] MAN-2: [criteria]
```

### Step 7: Verify Output Files

Read back both files and confirm they were written correctly.

### Step 8: Report and Prompt Next Steps

> **UAT generated:**
>
> - [<feature>-uat.md](docs/plans/<date>-<feature>-uat.md) - X test cases
> - [<feature>-checklist.md](docs/plans/<date>-<feature>-checklist.md) - executable checklist
>
> | Category | Count |
> |----------|-------|
> | Happy Path | X |
> | Error Handling | X |
> | Edge Cases | X |
> | Boundary Conditions | X |
> | Integration Points | X |
> | Performance | X |
> | Manual Verification | X |
>
> Ready to run `test-feature` against this plan?

---

## Files Read

- `docs/plans/*-plan.md` - Implementation plans
- `backlog/specs/*.md` - Detailed specifications
- Project source files (via exploration)
- Existing tests (via exploration)

## Files Written

- `docs/plans/YYYY-MM-DD-<feature>-uat.md` - Detailed UAT document
- `docs/plans/YYYY-MM-DD-<feature>-checklist.md` - Executable checklist

---

## Examples

### Example 1: UAT for video export feature

User: `/claude-code-skills:uat video-export`

> Exploring project to understand test requirements...
> - Reading `docs/plans/2026-01-30-video-export-plan.md`
> - Analyzing video processing code in `src/video/`
> - Identifying FFmpeg integration points
> - Reviewing existing video tests
>
> **Proposed Test Data:**
>
> | Data | Description | Setup |
> |------|-------------|-------|
> | Sample video | 30-second 1080p MP4 | Use `test-data/sample.mp4` |
> | Large video | 500MB file for size limits | Generate with FFmpeg |
> | Corrupted video | Invalid MP4 for error handling | Use `test-data/corrupted.mp4` |
>
> Does this test data look right, or should I adjust?

User: "yes"

> Generating test cases...
>
> [writes UAT doc and checklist]
>
> **UAT generated:**
>
> - [video-export-uat.md](docs/plans/2026-01-30-video-export-uat.md) - 18 test cases
> - [video-export-checklist.md](docs/plans/2026-01-30-video-export-checklist.md) - executable checklist
>
> | Category | Count |
> |----------|-------|
> | Happy Path | 4 |
> | Error Handling | 5 |
> | Edge Cases | 3 |
> | Boundary Conditions | 2 |
> | Integration Points | 2 |
> | Performance | 1 |
> | Manual Verification | 1 |
>
> Ready to run `test-feature` against this plan?

---

## Key Principles

1. **Comprehensive coverage** - Systematically cover all categories
2. **Concrete steps** - Every test case has exact steps, not vague descriptions
3. **Real integrations** - Test against actual external systems, no mocks
4. **User confirmation** - Always confirm test data before generating
5. **Machine-readable checklist** - Checklist format parseable by test-feature
