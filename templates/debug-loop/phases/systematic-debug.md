## Phase 1: Systematic Debug

You are investigating bug: `{bug_slug}`

### Instructions

1. Read the bug task at `{paths.bug_task}`
2. Invoke `/systematic-debugging --output {paths.debug_findings}`
3. Follow the systematic debugging process:
   - Document observed vs expected behavior
   - Create reproduction steps
   - Form hypotheses and test them systematically
   - Log each investigation attempt
4. Identify root cause with evidence

### Skill to Use

```
/systematic-debugging --output {paths.debug_findings}
```

### Exit Criteria

{exit_criteria.systematic-debug.description}

**Verification:** {exit_criteria.systematic-debug.verification}

**Required evidence:**
{exit_criteria.systematic-debug.evidence_required}

### Output

Write debug findings to: `{paths.debug_findings}`

When complete, the document MUST contain:
- Observed vs Expected behavior
- Reproduction steps (numbered, specific)
- Environment details (OS, versions)
- Hypotheses table with status
- Investigation log with attempts and conclusions
- Root cause with file:line location
- Evidence supporting the root cause

### Completion Signal

This phase is complete when:
1. Debug findings doc exists at `{paths.debug_findings}`
2. "Root Cause" section is populated with specific file:line location
3. Evidence supports the identified root cause
