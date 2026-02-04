# Claude Code Skills

Portable skills for Claude Code that enhance testing, code review, planning, and personal productivity workflows.

## Installation

### Option 1: Clone and register locally

```bash
# Clone the repository
git clone https://github.com/elicoon/claude-code-skills.git

# Register as a local plugin (run from Claude Code)
# The plugin will be available at user scope across all projects
```

After cloning, add to your `~/.claude/plugins/installed_plugins.json`:

```json
{
  "claude-code-skills@local": [
    {
      "scope": "user",
      "installPath": "/path/to/claude-code-skills",
      "version": "1.0.0",
      "installedAt": "2026-01-31T00:00:00.000Z"
    }
  ]
}
```

And enable in `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "claude-code-skills@local": true
  }
}
```

### Option 2: From GitHub (when published to marketplace)

```bash
claude plugin add elicoon/claude-code-skills
```

## Skills

### Development & Testing

| Skill | Description |
|-------|-------------|
| [/code-review](skills/code-review/) | Deep code review with consistent criteria. Applies conventional commits, security checks, and documentation verification standards. |
| [/write-plan](skills/write-plan/) | Create implementation plans with mandatory verification steps. Automatically appends code-review, test-feature, and commit tasks. |
| [/test-feature](skills/test-feature/) | Structured end-to-end feature testing. Executes tests with actual output, reports results, creates bug tasks for failures. |
| [/user-test](skills/user-test/) | Hands-free testing with auto-capture. Records screen + audio, captures console errors, creates bug tasks from verbal descriptions. |
| [/uat](skills/uat/) | Generate UAT documentation and test checklists before implementation. Creates verification contracts across 7 test categories. |
| [/debug-loop](skills/debug-loop/) | Deterministic debugging workflow with living document orchestration. Serial bug fixing through phases with human checkpoints. |

### Personal OS / Workflow Management

These skills implement a "Personal OS" for managing tasks, learnings, and session continuity across Claude Code sessions. Run `/setup` first to configure paths and integrations.

| Skill | Description |
|-------|-------------|
| [/setup](skills/setup/) | First-run onboarding. Creates `.dev-org.yaml` config file and folder structure for tasks and reference layer. |
| [/orient](skills/orient/) | Start-of-session prioritization. Reviews backlog, calendar, and context to help decide what to work on next. |
| [/add](skills/add/) | Capture new tasks/ideas or update existing task status. Handles full backlog item lifecycle with git commits. |
| [/review](skills/review/) | End-of-session reflection. Captures learnings, memories, and preferences to the reference layer. |
| [/eod](skills/eod/) | End-of-day wrap-up. Processes pending lessons, checks for loose ends, optionally graduates lessons to CLAUDE.md. |
| [/retro](skills/retro/) | Failure analysis with 5-Whys. When something goes wrong, investigates root cause and creates lessons/postmortems. |
| [/handoff](skills/handoff/) | Session continuity. Packages context for continuation in a fresh Claude Code session when context window fills. |
| [/executing-handoffs](skills/executing-handoffs/) | Execute handoff documents. Orchestrates work from handoff files with subagent delegation to preserve context. |
| [/dashboard](skills/dashboard/) | Visual backlog view. Starts local server and opens Kanban/Command Center dashboard in browser. |

## Structure

```
claude-code-skills/
├── .claude-plugin/
│   └── plugin.json      # Plugin metadata
├── skills/              # Individual skill definitions
│   ├── code-review/
│   │   ├── SKILL.md     # Skill instructions
│   │   └── README.md    # Documentation
│   ├── write-plan/
│   ├── test-feature/
│   ├── user-test/
│   ├── uat/
│   ├── setup/           # First-run onboarding
│   ├── orient/          # Session start prioritization
│   ├── add/             # Task capture/update
│   ├── review/          # Session reflection
│   ├── eod/             # End-of-day wrap-up
│   ├── retro/           # Failure analysis
│   ├── handoff/         # Session continuity
│   ├── executing-handoffs/
│   ├── dashboard/       # Visual backlog
│   └── debug-loop/      # Deterministic debugging
└── README.md
```

## Personal OS Quick Start

1. Run `/setup` to create your configuration
2. Use `/add` to capture tasks and ideas
3. Use `/orient` at the start of sessions to prioritize
4. Use `/review` at the end of sessions to capture learnings
5. Use `/handoff` when context window fills to continue in a new session

## Creating a Skill

Each skill lives in its own directory under `skills/` with a `SKILL.md` file that defines the behavior.

## License

MIT
