# /uat

## Purpose

Generates comprehensive UAT (User Acceptance Testing) documentation and executable test checklists before implementation begins. Creates the verification contract that `/test-feature` runs against.

## What It Does

1. Identifies feature scope from argument or most recent plan file
2. Explores project context:
   - Implementation plan details
   - Spec files (if referenced)
   - Codebase architecture and patterns
   - Existing tests for verification patterns
   - API contracts and external dependencies
3. Proposes test data requirements (waits for user confirmation)
4. Generates test cases across 7 categories:
   - **Happy Path** - Core functionality working as intended
   - **Error Handling** - Invalid input, missing data, permissions, service failures
   - **Edge Cases** - Empty states, max limits, special characters, concurrency
   - **Boundary Conditions** - Off-by-one, date boundaries, numeric limits
   - **Integration Points** - Real API calls, database ops, external services
   - **Performance** - Load times, response times, resource usage
   - **Manual Verification** - Subjective UX judgments only
5. Writes UAT document (`docs/plans/YYYY-MM-DD-<feature>-uat.md`)
6. Writes executable checklist (`docs/plans/YYYY-MM-DD-<feature>-checklist.md`)
7. Verifies output files and reports summary

## When to Use

- Automatically after `superpowers:writing-plans` completes
- Before writing any implementation code
- When requirements change significantly (to update UAT)

## When NOT to Use

- For unit tests (those run during development)
- When there's no implementation plan yet (use brainstorming first)

## Dependencies

- Implementation plan or spec file to analyze
- Project source files (for context exploration)
