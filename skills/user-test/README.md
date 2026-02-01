# /user-test

## Purpose

Hands-free user testing with automatic capture. Start a session, use the product while narrating issues, then stop to automatically analyze recordings and create bug tasks with proposed fixes.

## What It Does

### Start Mode (`/user-test start [url]`)

1. Pre-flight checks for all capture components:
   - ScreenPipe (auto-starts if not running)
   - OBS + LocalVocal (auto-starts OBS, verifies transcript output)
   - Chrome DevTools MCP (provides setup instructions if not connected)
2. Opens URL in Chrome
3. Injects coordinate overlay (shows X,Y at cursor for verbal references)
4. Enables console and network capture via Chrome DevTools
5. Records session start timestamp

### Stop Mode (`/user-test stop`)

1. Records end time and duration
2. Queries LocalVocal transcripts for bug keywords ("broken", "doesn't work", "error", etc.)
3. Queries ScreenPipe for screen content during session
4. Queries Chrome DevTools for console errors and failed network requests
5. Correlates timestamps across all layers
6. Creates bug tasks with:
   - What user said (quoted from transcript)
   - Technical context (console errors, network failures)
   - Video timestamp references
   - Proposed fix
   - UAT verification checklist
7. Generates verification tests for each bug

## When to Use

- When testing a web application hands-free
- When you want automatic bug capture from verbal descriptions
- When you want technical context (console, network) correlated with user observations

## When NOT to Use

- For automated test suites
- When ScreenPipe is unavailable

## Dependencies

- **Required:** ScreenPipe (screen recording with OCR)
- **Recommended:** OBS Studio + LocalVocal plugin (audio transcription)
- **Recommended:** Chrome DevTools MCP (console + network capture)
- **Required:** Chrome browser
