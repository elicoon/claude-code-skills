# User Scenarios

End-to-end stories grounded in real user goals.

## Coverage
| Scenario | Status |
|----------|--------|
| Daily standup and pipeline dispatch | ⚠️ Uncovered |
| Focused feature work from scratch | ⚠️ Uncovered |
| Debugging a regression | ⚠️ Uncovered |
| Session continuity across context window | ⚠️ Uncovered |
| End-of-day wrap-up | ⚠️ Uncovered |
| Onboarding a new machine | ⚠️ Uncovered |
| Adding a new skill | ⚠️ Uncovered |

---

## Scenarios

**Daily standup and pipeline dispatch**
- **User:** Developer starting their work day
- **Goal:** Know what to work on, get autonomous work dispatched to background workers so the pipeline moves while they focus
- **Steps:**
  1. Open Claude Code in dev-org or any project
  2. Invoke `/handler`
  3. Handler scans configured projects for stale dispatches, blocked work, and open PRs
  4. Handler creates dispatch files for autonomous work, launches tmux workers
  5. Handler presents top-3 priority items requiring human attention
  6. User reviews summary, adjusts priorities via `/dashboard` if needed
- **Expected outcome:** Background workers running, human has a clear list of what needs their attention today
- **Edge cases:** No tmux installed → handler reports items but cannot launch workers; gh not authenticated → CI/PR checks skipped
- **Tests:** ⚠️ UNCOVERED

---

**Focused feature work from scratch**
- **User:** Developer who knows what they want to build
- **Goal:** Plan, build, test, and review a feature in one coherent workflow
- **Steps:**
  1. Invoke `/orient` to confirm this is the right thing to work on now
  2. Invoke `/write-plan` to create an implementation plan with acceptance criteria
  3. Execute the plan (implement the feature)
  4. Invoke `/test-feature` to run structured end-to-end testing
  5. Invoke `/code-review` for deep review against conventions and security
  6. Address review findings, commit
- **Expected outcome:** Feature is implemented, tested, reviewed, and committed with a clean record
- **Edge cases:** Plan reveals unexpected complexity → `/write-plan` creates sub-tasks; tests fail → `/debug-loop` for systematic debugging
- **Tests:** ⚠️ UNCOVERED

---

**Debugging a regression**
- **User:** Developer facing a broken test or unexpected behavior
- **Goal:** Systematically find and fix the root cause without losing progress if context runs out
- **Steps:**
  1. Invoke `/debug-loop init` with a description of the failure
  2. Debug loop creates living document with phases: reproduce → isolate → fix → verify
  3. Approve acceptance criteria for what "fixed" means
  4. Loop runs phases autonomously, writing discoveries and failures to living document
  5. If context compacts, `compaction-reread.js` forces re-read of living document
  6. Human reviews each phase checkpoint and approves continuation
  7. Fix verified, living document archived
- **Expected outcome:** Root cause identified, fix implemented and verified, findings documented in living document
- **Edge cases:** Compaction mid-phase → hook forces re-read, loop continues without data loss; fix attempt fails → `What Failed` section captures it, next attempt starts informed
- **Tests:** ⚠️ UNCOVERED

---

**Session continuity across context window**
- **User:** Developer whose context window is filling mid-task
- **Goal:** Preserve all context and continue seamlessly in a new session
- **Steps:**
  1. Invoke `/handoff` when context is getting full
  2. Handoff skill packages current state: what was done, what's next, open questions, relevant files
  3. New Claude Code session started
  4. Invoke `/executing-handoffs`
  5. Skill reads handoff document, creates dispatch files for remaining work
  6. Workers pick up and execute dispatch files
- **Expected outcome:** No work lost, new session picks up exactly where the old one left off
- **Edge cases:** Handoff document is ambiguous → executing-handoffs asks for clarification before dispatching; multiple handoffs pending → executing-handoffs processes them in priority order
- **Tests:** ⚠️ UNCOVERED

---

**End-of-day wrap-up**
- **User:** Developer wrapping up for the day
- **Goal:** Capture learnings, close loose ends, leave tomorrow's session in a good state
- **Steps:**
  1. Invoke `/eod`
  2. EOD skill reviews the day: pending lessons, open tasks, unresolved questions
  3. Processes lessons — graduates worthy ones to CLAUDE.md or reference layer
  4. Creates a brief tomorrow-start note with top priority items
  5. Optionally runs `/retro` if anything went wrong today
- **Expected outcome:** Reference layer updated with learnings, clean backlog state, clear starting point for tomorrow
- **Edge cases:** Many pending lessons → EOD batches and prioritizes; nothing to capture → EOD confirms clean state
- **Tests:** ⚠️ UNCOVERED

---

**Onboarding a new machine**
- **User:** Developer setting up claude-code-skills on a fresh machine
- **Goal:** Get all skills installed and working with minimal friction
- **Steps:**
  1. Clone repo: `git clone https://github.com/elicoon/claude-code-skills.git`
  2. Register in `~/.claude/plugins/installed_plugins.json`
  3. Enable in `~/.claude/settings.json`
  4. Install git hook: `cp hooks/post-commit .git/hooks/post-commit && chmod +x .git/hooks/post-commit`
  5. Run `./sync-skills.sh` for initial cache population
  6. Register Claude Code hooks in `~/.claude/settings.json`
  7. Invoke `/setup` to configure project paths and integrations
  8. Invoke `/add test` to verify skill injection works
- **Expected outcome:** All 19 skills available in Claude Code, hooks enforcing structural rules
- **Edge cases:** `~/.claude/skills/` doesn't exist → `sync-skills.sh` errors; hooks not registered → compaction enforcement silently absent
- **Tests:** ⚠️ UNCOVERED

---

**Adding a new skill**
- **User:** Developer adding a new workflow to the skill system
- **Goal:** Create a new skill that is available in Claude Code and follows project conventions
- **Steps:**
  1. Create `skills/new-skill-name/` directory
  2. Write `SKILL.md` with YAML frontmatter (`name`, `description`) and numbered instruction steps
  3. Write `README.md` with human-readable documentation
  4. Commit the new skill files
  5. Post-commit hook fires and syncs to `~/.claude/skills/`
  6. Invoke `/new-skill-name` in Claude Code to verify injection
- **Expected outcome:** New skill appears as `/new-skill-name`, responds with SKILL.md behavior
- **Edge cases:** Subdirectory created inside skill dir → not synced to cache, Claude can't find it; SKILL.md missing frontmatter → skill may not be recognized; skill committed but hook not installed → must run `./sync-skills.sh` manually
- **Tests:** ⚠️ UNCOVERED
