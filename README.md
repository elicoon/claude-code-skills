# Claude Code Skills

Portable skills for Claude Code that enhance testing, code review, and planning workflows.

## Installation

Add this repository as a Claude Code plugin:

```bash
claude plugin add elicoon/claude-code-skills
```

## Skills

| Skill | Description |
|-------|-------------|
| [/code-review](skills/code-review/) | Deep code review with consistent criteria. Applies conventional commits, security checks, and documentation verification standards. |
| [/write-plan](skills/write-plan/) | Create implementation plans with mandatory verification steps. Automatically appends code-review, test-feature, and commit tasks. |
| [/test-feature](skills/test-feature/) | Structured end-to-end feature testing. Executes tests with actual output, reports results, creates bug tasks for failures. |
| [/user-test](skills/user-test/) | Hands-free testing with auto-capture. Records screen + audio, captures console errors, creates bug tasks from verbal descriptions. |
| [/uat](skills/uat/) | Generate UAT documentation and test checklists before implementation. Creates verification contracts across 7 test categories. |

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
│   │   ├── SKILL.md
│   │   └── README.md
│   ├── test-feature/
│   │   ├── SKILL.md
│   │   └── README.md
│   ├── user-test/
│   │   ├── SKILL.md
│   │   └── README.md
│   └── uat/
│       ├── SKILL.md
│       └── README.md
└── README.md
```

## Creating a Skill

Each skill lives in its own directory under `skills/` with a `SKILL.md` file that defines the behavior.

## License

MIT
