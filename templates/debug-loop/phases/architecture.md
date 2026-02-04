## Phase 3a: Architecture Design

**Depth:** full only (skipped for minimal/standard)

You are designing the architectural approach for fixing bug: `{bug_slug}`

### Instructions

1. Read the debug findings at `{paths.debug_findings}`
2. Read the reproduction test at `{paths.reproduction_test}`
3. Invoke `/brainstorming --mode architecture --output {paths.architecture}`
4. Document:
   - Current state of relevant architecture
   - Proposed changes
   - Alternative approaches considered
   - Trade-offs of each option
   - Final decision with rationale

### Skill to Use

```
/brainstorming --mode architecture --output {paths.architecture}
```

### Exit Criteria

{exit_criteria.architecture.description}

**Verification:** {exit_criteria.architecture.verification}

**Required evidence:**
{exit_criteria.architecture.evidence_required}

### Output

Write architecture document to: `{paths.architecture}`

The document MUST contain:
- Current State: Relevant parts of existing architecture
- Proposed Change: What modifications are needed
- Alternatives Considered: At least 2 options with pros/cons
- Decision: Which option selected and why
- Trade-offs Accepted: What compromises are being made

### Human Checkpoint

After completing this phase, the workflow will pause for human review.

**Reason:** Architecture decisions should be approved before implementation begins.

The human will review:
- Is the proposed approach appropriate?
- Are trade-offs acceptable?
- Are there concerns not addressed?

### Completion Signal

This phase is complete when:
1. Architecture doc exists at `{paths.architecture}`
2. Decision section is populated
3. Human has approved the architecture (sets `awaiting_human_review: false`)
