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
| *Coming soon* | Skills will be added here |

## Structure

```
claude-code-skills/
├── .claude-plugin/
│   └── plugin.json      # Plugin metadata
├── skills/              # Individual skill definitions
│   └── [skill-name]/
│       └── SKILL.md     # Skill instructions
└── README.md
```

## Creating a Skill

Each skill lives in its own directory under `skills/` with a `SKILL.md` file that defines the behavior.

## License

MIT
