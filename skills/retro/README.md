# /retro

## Purpose

Failure analysis skill for in-session incidents. When something goes wrong, invoke retro while context is fresh to conduct a 5-Whys root cause investigation.

## What It Does

1. Identifies the failure from session context (proposes, doesn't interrogate)
2. Drives a 5-Whys chain to find root cause
3. Checks for pattern matches in previous lessons/postmortems
4. Evaluates escalation criteria (pattern, structural, impact)
5. Outputs: lesson entry, optional backlog task, optional full postmortem
6. Optionally promotes high-impact lessons to `CLAUDE.md`

## When to Use

- Claude made a mistake (wrong output, bad recommendation)
- A process failed (skill didn't work, automation broke)
- You caught an error that would have caused problems
- A pattern repeated (same type of failure again)

## When NOT to Use

- For general learnings (use `/review` instead)
- For post-session reflection (retro needs live context)
- For project retrospectives (this is incident-level)

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Base path for reference layer | `reference/` |
| `{BACKLOG_PATH}` | Path for task files | `backlog/tasks/` |
| `{POSTMORTEMS_PATH}` | Path for postmortem files | `docs/postmortems/` |

## Escalation Criteria

| Criterion | Question | If Yes |
|-----------|----------|--------|
| Pattern | Has this same failure happened before? | Escalate |
| Structural | Does the fix require changing a skill/workflow/CLAUDE.md? | Escalate |
| Impact | Was significant time wasted or wrong output delivered? | Escalate |

## Dependencies

- Session context (the failure being analyzed)
- Git repository for commit tracking
