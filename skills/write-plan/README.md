# /write-plan

## Purpose

Creates implementation plans with mandatory verification steps. Wraps `superpowers:writing-plans` and automatically appends code-review, test-feature, and final commit tasks to every plan.

## What It Does

1. Invokes `superpowers:writing-plans` for core planning
2. Follows that skill's full process to create the implementation plan
3. Appends mandatory verification tasks:
   - Code Review (`/code-review`)
   - Feature Testing (`/test-feature`)
   - Final Commit (git status verification)
4. Updates task count in plan header
5. Generates UAT documentation by invoking `/uat`
6. Presents execution options (subagent-driven or parallel session)

## When to Use

- When you have a spec or requirements for a multi-step task
- Before touching code
- After brainstorming, when ready to plan implementation

## When NOT to Use

- For pure research/documentation tasks (no code to verify)
- For trivial single-file changes

## Dependencies

- `superpowers:writing-plans` skill (core planning functionality)
- `superpowers:code-reviewer` skill (for code review task)
- `/test-feature` skill (for feature testing task)
- `/uat` skill (for UAT generation)
