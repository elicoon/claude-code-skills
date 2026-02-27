# Decisions

Lightweight decision log. Append-only — never edit existing entries, add new ones above old ones.

---

## Format

**[What was decided]**
- **Decided:** [YYYY-MM-DD]
- **Why:** [reason this was chosen]
- **Rejected:** [alternatives considered and why they lost]
- **Implications:** [what this means for how we build — what to always/never do as a result]

---

## Log

**Wrap upstream skills (code-review, write-plan) rather than forking them**
- **Decided:** 2026-01
- **Why:** Upstream skills get improvements over time. Wrapping lets us add project-specific behavior (conventional commits, security checks) on top without maintaining a fork.
- **Rejected:** Copying and modifying SKILL.md — forks diverge and lose upstream improvements silently.
- **Implications:** When wrapping, always invoke the upstream skill by name and add pre/post steps in the wrapper. Never copy upstream instruction content into the wrapper.

---

**Dispatch files use a frozen contract + mutable progress model**
- **Decided:** 2026-01
- **Why:** Workers need a stable contract to execute against. If the objective or acceptance criteria can change mid-execution, workers lose their ground truth. Progress must be append-only so the orchestrator can see the full history.
- **Rejected:** Fully mutable dispatch files — agents were overwriting progress history, making it impossible to diagnose where work went wrong.
- **Implications:** `validate-dispatch-edit.js` hook enforces this structurally. The `## Progress` section is append-only. Status field is frozen after dispatch. Never delete previous progress entries.

---

**Hooks for structural enforcement, not documentation**
- **Decided:** 2026-01
- **Why:** Instructions in SKILL.md can be ignored by a determined agent. Structural enforcement via hooks makes bad behavior impossible, not just discouraged.
- **Rejected:** Adding more strongly-worded instructions to skill files — agents still skipped them under pressure.
- **Implications:** When you find agents repeatedly breaking a rule, build a hook to enforce it. Don't add another paragraph to SKILL.md.

---

**Flat skill structure — subdirectories not synced to cache**
- **Decided:** 2026-01
- **Why:** `sync-skills.sh` intentionally only copies flat files from `skills/skill-name/`. This keeps the cache simple and avoids partial-sync edge cases with nested directories.
- **Rejected:** Recursive sync — would require handling delete propagation, directory creation, and version conflicts more carefully.
- **Implications:** Never put content that a skill needs at runtime inside a subdirectory of `skills/skill-name/`. Use `templates/` for boilerplate that skills reference. Keep `SKILL.md` self-contained or reference `templates/` at known paths.

---

**Filesystem as source of truth, not conversation history**
- **Decided:** 2026-01
- **Why:** Conversation history is lost on context compaction. The filesystem survives indefinitely. Encoding workflow state in files (living documents) means any new agent session can pick up exactly where the previous one left off.
- **Rejected:** Encoding state in conversation messages or agent memory — both are wiped on compaction or session restart.
- **Implications:** Complex workflows must write their state to files. Skills must read files at the start of each session, not assume memory of previous steps. The `compaction-reread.js` hook enforces this for handler, worker, and loop sessions.

---

**Living documents over static handoffs**
- **Decided:** 2026-01
- **Why:** Static handoff documents describe work to be done but can't track iteration. Living documents have a `[CURRENT]` step marker, `Discoveries` and `What Failed` sections — they accumulate knowledge across multiple agent passes.
- **Rejected:** Single-pass static plans — when a step fails and needs rework, there's nowhere to record what was learned and the next agent has no context.
- **Implications:** Multi-step skills (`loop`, `debug-loop`, `handler`) create living documents. The document is the orchestration primitive, not the prompt. When continuing interrupted work, always read the living document first.

---

**Session type detection via /tmp markers, not global flags**
- **Decided:** 2026-01
- **Why:** A global flag (e.g., `/tmp/claude-handler-active`) is never cleaned up and causes regular sessions to be misidentified as handler sessions — producing spurious re-read enforcement.
- **Rejected:** Global active flags — they accumulate and cause false positives indefinitely.
- **Implications:** Session markers are keyed by `session_id`: `/tmp/claude-handler-{session_id}`. They are naturally scoped to one session. The global `claude-handler-active` file is explicitly not checked in the current hook implementation.
