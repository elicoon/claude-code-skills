## Phase 7: Update Documentation

**Depth:** standard/full only (skipped for minimal)

You are updating documentation for bug: `{bug_slug}`

### Instructions

1. Review what was changed in `files_modified`
2. Determine which documentation needs updates:
   - README (if API or usage changed)
   - CHANGELOG (add entry for the fix)
   - Inline code comments (if logic is non-obvious)
   - Lessons learned (if pattern should be remembered)
3. For lessons learned, optionally invoke `/add` to capture in dev-org

### Skills Available

**For lessons learned:**
```
/add
```

**For manual documentation:** Edit files directly

### Exit Criteria

{exit_criteria.update-docs.description}

**Verification:** {exit_criteria.update-docs.verification}

**Required evidence:**
{exit_criteria.update-docs.evidence_required}

### Documentation Checklist

**If API changed:**
- [ ] README updated with new usage
- [ ] JSDoc/docstrings updated
- [ ] Examples updated if applicable

**Always:**
- [ ] CHANGELOG entry added (under "Fixed" or appropriate section)
- [ ] Any misleading comments removed/updated

**If lesson learned:**
- [ ] Consider adding to lessons via `/add`
- [ ] Pattern documented if it could help future debugging

### CHANGELOG Entry Format

```markdown
## [Unreleased]

### Fixed
- Fix {brief description of bug} ({bug_slug})
```

### Output

No new artifact created. Instead:
- Existing documentation files updated as needed
- CHANGELOG entry added
- Optional: Lesson added to dev-org via `/add`

### Completion Signal

This phase is complete when:
1. Documentation reviewed for necessary updates
2. CHANGELOG entry added (if project uses CHANGELOG)
3. Any API documentation updated (if applicable)
