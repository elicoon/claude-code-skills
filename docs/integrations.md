# Integrations

## Claude Code Plugin System
- **Purpose:** Hosts the skills — injects `SKILL.md` content into Claude's context when a skill is invoked via `/skill-name`
- **Credentials:** None — local plugin, no auth required
- **Version:** Claude Code CLI (current installed version)
- **Required config:** Entry in `~/.claude/plugins/installed_plugins.json`, `enabledPlugins` in `~/.claude/settings.json`
- **Failure modes:**
  - Plugin not listed in `installed_plugins.json` → Skills not available, `/skill-name` not recognized
  - Plugin disabled in `enabledPlugins` → Same as above
  - Cache not synced → Old skill behavior or missing skills; run `./sync-skills.sh`
- **How to verify it's working:** Invoke `/add` in Claude Code — it should respond with task capture behavior, not a "skill not found" error
- **Notes:** The `lastUpdated` timestamp in `installed_plugins.json` must change for Claude Code to rescan. `sync-skills.sh` handles this automatically.

---

## GitHub CLI (`gh`)
- **Purpose:** Used by the `handler` skill to check PR status and CI results when scanning projects
- **Credentials:** `gh auth login` — token stored by gh CLI, not by this project
- **Required scopes:** `repo` (read PRs and CI), `read:org` (if org repos are in scope)
- **Failure modes:**
  - `gh` not installed → handler skill skips GitHub checks and notes it in output
  - Not authenticated → `gh` commands fail silently or with auth error; handler degrades gracefully
- **How to verify it's working:** `gh auth status`
- **Docs:** https://cli.github.com/
- **Notes:** Optional. Handler skill degrades gracefully when gh is unavailable.

---

## Google Calendar MCP
- **Purpose:** Used by the `orient` skill for time-aware session prioritization — reads today's calendar to factor in meetings and deadlines
- **Credentials:** Configured via MCP server at `~/.claude` level — not in this project
- **Required config:** MCP server must be registered in `~/.claude/settings.json` under `mcpServers`
- **Failure modes:**
  - MCP not configured → orient skill omits calendar context and continues with backlog-only prioritization
  - Auth expired → MCP server returns error; orient skill notes missing calendar data and proceeds
- **How to verify it's working:** Invoke `/orient` and check whether calendar events appear in the output
- **Notes:** Optional. Must be configured separately at the `~/.claude` global level, not in this project's config.

---

## tmux
- **Purpose:** Used by `handler` and `monitor` skills to spawn and track background worker sessions
- **Credentials:** None — local process management
- **Failure modes:**
  - tmux not installed → handler cannot launch background workers; falls back to inline execution
  - No active tmux session → worker launch fails with error message
- **How to verify it's working:** `tmux -V`
- **Notes:** Optional for single-session use. Required for parallel background worker dispatch via handler.

---

## Playwright
- **Purpose:** Used by the `user-test` skill for hands-free browser automation — opens browser, navigates, captures screenshots and console errors
- **Credentials:** None
- **Required config:** Install Playwright separately: `npm install -g playwright && playwright install`
- **Failure modes:**
  - Playwright not installed → user-test skill cannot perform browser automation; error on invocation
  - Browser binary missing → Playwright installed but `playwright install` not run; same failure
- **How to verify it's working:** `npx playwright --version`
- **Notes:** Optional. Only needed if using `/user-test`. For HEVC video testing use `--browser chrome` to use system Chrome instead of bundled Chromium (bundled Chromium lacks HEVC hardware decoding).
