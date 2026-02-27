# UI Flow

## Surfaces
| Surface | Location | Description |
|---------|----------|-------------|
| Claude Code CLI | Terminal — any project directory | Primary interaction point. User types `/skill-name` to invoke a skill. Claude responds following SKILL.md instructions. |
| Dashboard web UI | `localhost:3491` (started by `/dashboard`) | Kanban board + Command Center views. Shows backlog tasks, pipeline status, worker states, and top-3 priority items. |
| Living documents | `project/docs/loops/*.loop.md`, `project/docs/handler-dispatches/*.md` | File artifacts created by skills. Read and written by agents as orchestration state. Viewable in any editor. |
| Git repository | Project's git history | All living documents and skill artifacts are version controlled. Diffs show work history. |

## Navigation Map
```
/skill-name invoked in Claude Code CLI
  ├── Simple skill (single session)
  │     ├── Claude reads SKILL.md instructions
  │     ├── Claude gathers context (reads files, runs commands)
  │     └── Claude outputs result → done
  │
  └── Complex skill (multi-session living document)
        ├── Claude reads SKILL.md instructions
        ├── Claude creates living document in project/docs/
        ├── Claude marks [CURRENT] step, reports progress
        ├── Session ends (or user ends session)
        │
        ├─── Next session: /executing-handoffs or /loop
        │         ├── Reads living document
        │         ├── Finds [CURRENT] step
        │         ├── Executes one step
        │         └── Updates [CURRENT], exits
        │
        └─── /dashboard (port 3491)
                  ├── Kanban view → shows all tasks with status columns
                  ├── Command Center → shows top-3 priority + pipeline state
                  └── Workers view → shows active tmux workers (via /monitor)
```

## Key States
- **Empty backlog:** `/orient` shows no tasks — recommends running `/add` or `/scope`
- **No living document:** `/executing-handoffs` finds nothing — reports no active handoffs
- **Cache out of sync:** Skills show old behavior or are missing — `./sync-skills.sh` to fix
- **Worker running:** `/monitor` shows active tmux panes with worker names and status
- **Compaction occurred:** `compaction-reread.js` blocks first tool call and forces re-read of living document before continuing

## Transitions
- `/handler` scan → creates dispatch files in `project/docs/handler-dispatches/` → workers execute → progress appended to dispatch file
- `/loop init` → creates `project/docs/loops/name.loop.md` → each subsequent `/loop` call advances `[CURRENT]` one step → loop doc archived when complete
- `/handoff` → creates handoff document → `/executing-handoffs` in new session reads it → creates dispatch files for workers
- `/debug-loop init` → creates debug living document with phases → each phase runs autonomously → human checkpoint after each phase
- Commit to `skills/` → post-commit hook fires → `sync-skills.sh` runs → `~/.claude/skills/` updated → Claude Code rescans cache

## Dispatch File Lifecycle
```
Handler creates dispatch file (Status: queued)
  → validate-dispatch.js validates structure on Write
  → Worker picks up file, updates Status: in-progress
  → Worker appends progress entries to ## Progress
  → validate-dispatch-edit.js prevents deletion of past entries
  → Worker completes, sets Status: done
  → Handler reviews result
```
