# Monitor

Quick status dashboard for handler worker sessions running in tmux.

## What it does

- Scans all tmux windows for running Claude Code workers
- Checks handler-results/ and handler-blockers/ for completed/blocked workers
- Captures recent output to determine activity and token usage
- Presents a single status table with actionable recommendations

## When to use

- `/monitor` — anytime you want to check on background workers
- Before `/handler` — see what completed before running full check-in
- From phone — returns compact format for mobile viewing

## Output

| Window | Project | Task | Status | Activity | Tools | Tokens | Idle | Action? |
|--------|---------|------|--------|----------|-------|--------|------|---------|
| gc-feat | golf-clip | Impact time feature | 🔄 running | Implementing task 6 | 45 | 12K | 2min | none |
| mosh | mosh-ssh-tmux | Setup script | ✅ completed | Result written | 23 | 8K | 0min | review |
