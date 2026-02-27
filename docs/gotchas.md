# Gotchas

Living document. Add entries when something burns time or causes confusion. Never delete entries — they accumulate as institutional memory.

---

## Format

**[Short title]** — [What happens, why it's confusing, how to handle it]
*Discovered: YYYY-MM-DD*

---

## Entries

**Skills only available after committing** — Changes to `SKILL.md` are invisible to Claude Code until committed. The post-commit hook must fire to sync the updated file to `~/.claude/skills/`. If you edit a skill and test it immediately, you're testing the old cached version. Always commit first, then test.
*Discovered: 2026-01*

---

**Subdirectories under `skills/skill-name/` are NOT synced** — `sync-skills.sh` explicitly only copies flat files. Any file inside a subdirectory of a skill directory (e.g., `skills/loop/templates/`) will never reach the cache. Claude cannot read it at runtime. Put all content that Claude needs in flat files at `skills/skill-name/*.md`, or use the top-level `templates/` directory with hardcoded paths.
*Discovered: 2026-01*

---

**Compaction markers live in `/tmp` — lost on reboot** — Session type markers (`/tmp/claude-handler-{id}`, `/tmp/claude-loop-{id}`) are ephemeral. If the machine reboots mid-session, the markers are gone. Compaction enforcement will not fire after reboot even if the session resumes. This is accepted behavior — the living document itself still has the correct state.
*Discovered: 2026-01*

---

**Progress section is append-only — hooks prevent deletion** — `validate-dispatch-edit.js` actively rejects edits that remove previous progress entries from dispatch files. If you need to correct a progress entry, append a correction note rather than editing the previous entry. Attempting to clean up or reformat progress history will trigger a hook error.
*Discovered: 2026-01*

---

**Dispatch Status field is frozen after dispatch** — Once a dispatch file is created with `Status: queued`, the `Status` field is governed by hook validation. Workers can update it to `in-progress` or `done`, but cannot set arbitrary values. The initial creation must always use `Status: queued` — any other value on creation is rejected by `validate-dispatch.js`.
*Discovered: 2026-01*

---

**Handler state can diverge from dispatch files** — The handler maintains a `handler-state.md` summary of pipeline state. If a dispatch file is manually edited outside of Claude Code (e.g., in a text editor), `handler-state.md` will not automatically update. The dispatch file is the single source of truth — if they conflict, the dispatch file wins.
*Discovered: 2026-01*

---

**Session type detection is fragile if hooks not installed** — `compaction-reread.js` relies on session markers written by `register-handler-session.js` and `register-loop-session.js`. If those hooks are not registered in `~/.claude/settings.json`, sessions will never be typed and compaction enforcement will never fire — silently. Verify hook registration after install.
*Discovered: 2026-01*

---

**Global `claude-handler-active` file causes false positives** — An older version of the session detection used a global `/tmp/claude-handler-active` file. This file accumulates and is never cleaned up, causing regular sessions to be misidentified as handler sessions long after the handler has exited. Current code explicitly does NOT check this file. If you find it causing problems, delete it manually: `rm /tmp/claude-handler-active`.
*Discovered: 2026-01*

---

**No native rollback for destructive skills** — Skills like `handler` that create, modify, or delete files have no undo mechanism. If a worker does the wrong thing, recovery requires manual `git revert`. Always review dispatch files before worker execution, especially for skills with `Needs Approval: yes`.
*Discovered: 2026-01*

---

**Calendar integration requires separate MCP configuration** — The `orient` skill checks Google Calendar for time-aware prioritization, but the Google Calendar MCP server must be configured separately at `~/.claude` global level. Installing this plugin does not configure the MCP. If you don't see calendar events in `/orient` output, the MCP is not configured. The skill degrades gracefully — it just omits calendar context.
*Discovered: 2026-01*

---

**`sync-skills.sh` does not delete removed skills from cache** — If you delete a skill directory from `skills/`, the corresponding directory in `~/.claude/skills/` remains until manually removed. Claude Code will continue offering the deleted skill. After removing a skill, manually delete it from cache: `rm -rf ~/.claude/skills/deleted-skill-name/`.
*Discovered: 2026-01*

---

**`sync-skills.sh` errors if `~/.claude/skills/` doesn't exist** — On a fresh machine, if Claude Code hasn't been run yet (or the skills cache dir hasn't been created), `sync-skills.sh` will fail with "Skills cache not found." Create the directory manually first: `mkdir -p ~/.claude/skills/`.
*Discovered: 2026-01*
