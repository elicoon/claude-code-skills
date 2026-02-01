# /setup

## Purpose

First-run onboarding for the Personal OS / dev-org skills. Creates a `.dev-org.yaml` config file and optional folder structure through a minimal, friendly conversation.

## What It Does

1. Checks for existing `.dev-org.yaml` configuration
2. Gathers user context (name, constraints)
3. Configures paths (backlog, reference, plans, postmortems)
4. Sets up integrations (calendar, docs, other tools)
5. Creates directory structure
6. Optionally creates starter template files
7. Verifies the setup

## When to Use

- First installing the dev-org skills
- Setting up the Personal OS in a new workspace
- Reconfiguring or updating an existing setup

## Config Variables Created

| Variable | Description | Default |
|----------|-------------|---------|
| `paths.backlog` | Directory for task files | `./backlog/tasks` |
| `paths.reference` | Directory for reference layer | `./reference` |
| `paths.plans` | Directory for plans/handoffs | `./docs/plans` |
| `paths.postmortems` | Directory for postmortems | `./docs/postmortems` |
| `user.name` | Your name | (required) |
| `user.constraints` | Work constraints | (optional) |
| `integrations.calendar` | Calendar provider | `none` |
| `integrations.docs` | Docs provider | `local` |

## Supported Integrations

- **Calendar:** Google Calendar, Outlook, Apple Calendar, or none
- **Docs:** Google Drive, Notion, Obsidian, local markdown, or none
- **Other:** GitHub, Linear, Jira, etc.

## Conversation Principles

- Minimal questions with sensible defaults
- Batched prompts to reduce back-and-forth
- Quick setup (under 2 minutes)
- Idempotent (running again offers to update)

## Dependencies

- File system access for creating directories and files
