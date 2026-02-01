# /code-review

## Purpose

Deep code review with consistent criteria. Invokes the superpowers code-reviewer and applies additional standards like conventional commits, security checks, and documentation verification.

## What It Does

1. Identifies review scope from specified files/directory or recent git changes
2. Invokes `superpowers:code-reviewer` for deep analysis
3. Applies additional review criteria:
   - Conventional commits (feat/fix/docs/chore prefixes)
   - Documentation updates for significant changes
   - Verification culture (actual results, not just claims)
   - No over-engineering beyond requirements
   - Security review (OWASP top 10)
4. Reports findings with file:line references and suggestions

## When to Use

- After completing a new feature or component
- After bug fixes with substantial code changes
- Before creating a pull request
- After refactors that touch multiple files

## When NOT to Use

- For single-line fixes
- For documentation-only changes
- Before any code exists (use brainstorming instead)

## Dependencies

- Git repository (for checking recent changes)
- `superpowers:code-reviewer` skill (underlying review engine)
