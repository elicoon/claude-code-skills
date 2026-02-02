---
name: user-test
description: Hands-free user testing. User tests and narrates, Claude captures everything, creates bug tasks, proposes fixes.
---

# /claude-code-skills:user-test

Hands-free user testing with automatic capture.

## Configuration

This skill reads `.dev-org.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables:**
| Variable | Default | Purpose |
|----------|---------|---------|
| `{BACKLOG_PATH}` | `backlog/tasks/` | Where bug tasks are created |
| `{USER_NAME}` | "the user" | Name used in descriptions and quotes |
| `{LOGS_PATH}` | `logs/transcripts/` | Where audio transcripts are stored |
| `{RECORDINGS_PATH}` | `logs/recordings/` | Where screen recordings are saved |

**You just:**
1. Start the session
2. Use the product while talking
3. Stop the session

**Claude automatically:**
- Records screen via OBS (falls back to ScreenPipe if unavailable)
- Records audio via OBS + LocalVocal (transcription)
- Captures console errors + network failures (Chrome DevTools MCP)
- Creates bug tasks tagged as bugs
- Proposes fixes based on technical context

## Prerequisites

The skill will **automatically check and start** these prerequisites:

| Component | Required | Auto-Start | Purpose |
|-----------|----------|------------|---------|
| OBS + WebSocket | Primary | ✅ Yes | Screen recording (high quality) |
| ScreenPipe | Fallback | ✅ Yes | Screen capture (OCR + fallback recording) |
| Chrome DevTools MCP | Recommended | ❌ No (MCP config) | Console + network capture |
| OBS + LocalVocal | Recommended | ✅ Yes | Audio transcription |

If a component can't be auto-started, the skill will provide specific instructions.

## Commands

| Command | What Happens |
|---------|--------------|
| `/claude-code-skills:user-test start [url]` | Opens URL in Chrome, starts capture layers |
| `/claude-code-skills:user-test stop` | Stops recording, analyzes session, creates bugs, proposes fixes |

---

## Instructions for Claude

### Step 0: Load Configuration

Before starting, check for `.dev-org.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{USER_NAME}` → "the user"
  - `{LOGS_PATH}` → `logs/transcripts/`
  - `{RECORDINGS_PATH}` → `logs/recordings/`

---

### Mode: start

When `/claude-code-skills:user-test start [url]`:

#### Step 1: Pre-Flight Check - OBS + WebSocket (Primary Screen Recording)

**Check if OBS MCP tools are available:**
Use ToolSearch to find OBS tools:
```
ToolSearch query: "+obs record"
```

**If OBS MCP tools found, check OBS connection:**
Try calling `mcp__obs__get_version` to verify OBS is running and WebSocket is connected.

**If OBS not running, auto-start:**
```powershell
Start-Process -FilePath "C:\Program Files\obs-studio\bin\64bit\obs64.exe" -ArgumentList "--minimize-to-tray"
```

Wait 5 seconds for OBS to initialize and WebSocket to become available.

**If OBS WebSocket fails after start:**
> **⚠️ OBS WebSocket not connected.**
> To enable (one-time setup):
> 1. Open OBS Studio
> 2. Go to Tools → WebSocket Server Settings
> 3. Enable WebSocket server
> 4. Note the port (default: 4455) and password (if set)
> 5. Update `~/.claude.json` with password if required
>
> Falling back to ScreenPipe for screen recording.

Set `recording_method = "screenpipe"` if OBS unavailable, otherwise `recording_method = "obs"`.

#### Step 1b: Pre-Flight Check - ScreenPipe (Fallback + OCR)

ScreenPipe is always needed for OCR capture, and serves as fallback for recording.

**Check if running:**
```bash
curl -s http://localhost:3030/health
```

**If not running, auto-start:**
```powershell
Start-Process -FilePath "screenpipe" -WindowStyle Minimized
```

Wait 5 seconds, then re-check health endpoint. If still not running after 3 attempts:
> **❌ ScreenPipe failed to start.**
> Manual fix: Open a terminal and run `screenpipe`
> Then retry `/claude-code-skills:user-test start [url]`

#### Step 2: Pre-Flight Check - OBS + LocalVocal (Audio Transcription)

**Check if OBS is running** (may already be running from Step 1):
```powershell
Get-Process -Name "obs64" -ErrorAction SilentlyContinue
```

**If not running, auto-start:**
```powershell
Start-Process -FilePath "C:\Program Files\obs-studio\bin\64bit\obs64.exe" -ArgumentList "--minimize-to-tray"
```

Wait 3 seconds for OBS to initialize.

**Check if LocalVocal is producing output:**
Check for recent files in `{LOGS_PATH}`:
```powershell
Get-ChildItem "{LOGS_PATH}" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) }
```

If no recent transcript files:
> **⚠️ OBS is running but LocalVocal may not be active.**
> Please verify in OBS:
> 1. Audio source has LocalVocal filter enabled
> 2. LocalVocal is outputting to `{LOGS_PATH}`
> 3. Speak a test phrase and check for file updates
>
> Continue anyway? (Audio capture may not work)

#### Step 3: Pre-Flight Check - Chrome DevTools MCP

**Check if MCP tools are available:**
Verify `mcp__chrome-devtools__` tools are accessible by attempting:
```
mcp__chrome-devtools__list_pages
```

**If MCP connected but fails to list pages:**
Chrome may not have the debugging port enabled. Check:
```powershell
netstat -ano | findstr ":9222"
```

If port 9222 is not listening:
1. Close all Chrome windows
2. Relaunch Chrome (shortcut should have `--remote-debugging-port=9222`)
3. Restart Claude Code session

**If MCP tools not available at all:**
> **⚠️ Chrome DevTools MCP not connected.**
>
> Setup required (one-time):
> 1. Run: `powershell -ExecutionPolicy Bypass -File "scripts\modify-chrome-shortcut.ps1" -Elevate`
> 2. Approve the UAC prompt
> 3. Close and reopen Chrome
> 4. Restart Claude Code
>
> **Continue without Chrome DevTools?**
> - Screen + audio capture will still work
> - Console errors and network failures won't be captured
> - Bug reports will rely on verbal descriptions only

If user chooses to continue without Chrome DevTools, set flag `degraded_mode = true`.

#### Step 4: Pre-Flight Summary

Display status before proceeding:

> **Pre-Flight Check Complete**
>
> | Component | Status |
> |-----------|--------|
> | Screen Recording | ✅ OBS / ⚠️ ScreenPipe fallback |
> | ScreenPipe OCR | ✅ Running |
> | OBS + LocalVocal | ✅ Running / ⚠️ Check manually / ❌ Not available |
> | Chrome DevTools MCP | ✅ Connected / ⚠️ Degraded mode |
>
> Ready to start test session?

#### Step 5: Record Start Time
Note timestamp (ISO 8601) for later query.

#### Step 5b: Start Screen Recording

**If recording_method = "obs":**
Use OBS MCP to start recording:
```
mcp__obs__start_record
```

Store the recording state for later.

**If recording_method = "screenpipe":**
ScreenPipe records continuously - no action needed. Will use `mcp__screenpipe__export-video` at stop time.

#### Step 6: Open URL in Chrome

If Chrome DevTools MCP is connected:
```
mcp__chrome-devtools__navigate_page with url
```

If degraded mode (no Chrome DevTools), instruct user:
> Open Chrome and navigate to: [url]

#### Step 7: Inject Coordinate Overlay
Inject a floating tooltip that follows the cursor showing X,Y coordinates. This helps {USER_NAME} verbally reference positions on the page during testing.

Use `mcp__plugin_playwright_playwright__browser_evaluate` with this function:

```javascript
() => {
  // Remove existing overlay if present
  const existing = document.getElementById('coord-overlay');
  if (existing) existing.remove();

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'coord-overlay';
  overlay.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    pointer-events: none;
    z-index: 2147483647;
    white-space: nowrap;
    transform: translate(10px, 10px);
  `;
  overlay.textContent = '(0, 0)';
  document.body.appendChild(overlay);

  // Track mouse movement
  document.addEventListener('mousemove', (e) => {
    overlay.style.left = e.clientX + 'px';
    overlay.style.top = e.clientY + 'px';
    overlay.textContent = `(${e.clientX}, ${e.clientY})`;
  });

  return 'Coordinate overlay injected';
}
```

If Playwright MCP is not available, fall back to Chrome DevTools MCP:
```javascript
mcp__chrome-devtools__evaluate_script with the same function
```

#### Step 8: Enable CDP Event Capture (if Chrome DevTools connected)
Tell Chrome DevTools MCP to start capturing:
- Console messages (Log.enable)
- Network requests (Network.enable)

#### Step 9: Confirm Started

> **✅ Test session started**
>
> **URL:** [url]
> **Started:** [timestamp]
>
> **Capturing:**
> | Layer | Status |
> |-------|--------|
> | Screen Recording | ✅ OBS / ⚠️ ScreenPipe |
> | Screen OCR | ✅ Active (ScreenPipe) |
> | Audio (OBS + LocalVocal) | ✅ Active / ⚠️ Verify manually |
> | Console + Network | ✅ Active / ⚠️ Degraded mode |
>
> **Tools:**
> - Coordinate overlay active (shows X,Y at cursor)
>
> **Instructions:**
> - Use the product normally
> - Talk out loud about what you're doing and any issues
> - Reference positions by coordinates shown in the overlay
> - When done: `/claude-code-skills:user-test stop`

---

### Mode: stop

When `/claude-code-skills:user-test stop`:

#### Step 1: Record End Time
Note timestamp, calculate duration.

#### Step 1b: Stop Screen Recording

**If recording_method = "obs":**
Use OBS MCP to stop recording:
```
mcp__obs__stop_record
```

The recording file will be saved to OBS's configured output directory (typically `~/Videos`).
Note the output file path for the bug report.

**If recording_method = "screenpipe":**
Export the recording for the session time range:
```
mcp__screenpipe__export-video with:
  - start_time: session start (ISO 8601 UTC)
  - end_time: session end (ISO 8601 UTC)
  - fps: 5 (smooth playback)
```

Save the exported video path for the bug report.

#### Step 2: Query Audio Transcripts

**Primary: LocalVocal transcript file**
1. Read the transcript file at `{LOGS_PATH}recording` (SRT format)
2. Parse SRT format: each entry has index, timestamp range, and text
3. Filter entries by session time window (compare SRT timestamps to session start/end)
4. Search for bug keywords: "broken", "doesn't work", "error", "bug", "expected", "should", "wrong", "fail"
5. Extract relevant quotes with their SRT timestamps

**Fallback: ScreenPipe audio (if LocalVocal unavailable)**
Search ScreenPipe for session content:
- content_type: "audio"
- start_time: session start
- end_time: session end

Extract:
- Verbal bug reports (same keywords as above)
- What was being done when issues occurred
- Timestamps of issues

#### Step 2b: Query ScreenPipe (Screen Layer)
Search for screen content:
- content_type: "ocr"
- start_time: session start
- end_time: session end

Extract:
- What was visible on screen when issues occurred
- App/window context

#### Step 3: Query Chrome DevTools (Debugging Layer)
Get captured data:
- Console errors and warnings
- Failed network requests (4xx, 5xx)
- Slow requests (> 3 seconds)

For each failed network request, use `get_network_request` to extract the timestamp from the `date` response header (ISO 8601 UTC).

#### Step 4: Correlate Layers
All timestamps are in UTC. To correlate:
1. ScreenPipe timestamps: `2026-01-29T22:01:45.xxxZ` (from query results)
2. Network timestamps: Extract `date` header from response (e.g., `Thu, 29 Jan 2026 22:01:45 GMT`)
3. Video file: Filename contains start time (e.g., `monitor_..._22-00-20.mp4`), calculate offset

For each verbal issue:
1. Find corresponding console errors (by timestamp, within ~5 second window)
2. Find related network failures
3. Identify root cause from technical data

#### Step 5: Create Bug Tasks
For each bug found, create file in `{BACKLOG_PATH}`:

Filename: `bug-[short-description].md`

Content:
```markdown
### [Bug Title]

- **Project:** [project from URL/context]
- **Status:** draft
- **Priority:** 2
- **Type:** bug
- **Added:** [date]
- **Updated:** [date]
- **Session:** user-test-[start-timestamp]

#### What {USER_NAME} Said
> "[Quote from audio transcription]"

#### Technical Context
- **Console:** [errors captured]
- **Network:** [failed requests with status codes]
- **Timestamp:** [UTC timestamp from response header]
- **Video:** [recording file path]
- **Video offset:** [seconds into recording, e.g., "1:25"]

#### Proposed Fix
[Analysis of what went wrong and suggested code change]
```

#### Step 6: Present Summary

> **Test session complete**
>
> **Duration:** [X minutes]
> **Recording:** [video file path]
> **Bugs found:** [N]
>
> ## Bugs Created
>
> 1. **[Bug Title]** → `backlog/tasks/bug-xxx.md`
>    - Console: [error summary]
>    - Proposed fix: [brief]
>
> 2. ...
>
> ## What's Next?
> - Review bug tasks in backlog
> - Start fixing (I can help)
> - Run another test session

---

## Error Handling

### ScreenPipe Auto-Start Failed
> **❌ ScreenPipe failed to auto-start after 3 attempts.**
>
> Manual steps:
> 1. Open a new terminal
> 2. Run: `screenpipe`
> 3. Wait for "Server started" message
> 4. Retry: `/claude-code-skills:user-test start [url]`
>
> Common issues:
> - ScreenPipe not installed: `pip install screenpipe` or download from GitHub
> - Port 3030 already in use: Kill existing process or change port

### OBS Auto-Start Failed
> **⚠️ OBS failed to start or LocalVocal not detected.**
>
> Manual steps:
> 1. Launch OBS Studio from Start Menu
> 2. Verify LocalVocal filter is on your audio source
> 3. Check LocalVocal output path: `{LOGS_PATH}`
> 4. Speak a test phrase and verify `.srt` file appears
>
> Can continue without OBS - will use ScreenPipe audio (less reliable).

### Chrome DevTools MCP Not Connected
> **⚠️ Chrome DevTools MCP not connected.**
>
> To enable (optional but recommended):
> 1. Launch Chrome with debugging: `chrome.exe --remote-debugging-port=9222`
> 2. Ensure MCP is configured in Claude Code
> 3. Restart Claude Code session
> 4. Verify with `/mcp`
>
> Can continue in degraded mode - screen + audio capture still work.

### Degraded Mode Summary
> **Running in degraded mode.** Capture status:
>
> | Layer | Available |
> |-------|-----------|
> | Screen (ScreenPipe) | ✅ Yes |
> | Audio (OBS/LocalVocal) | ✅/⚠️ Depends |
> | Console logs | ❌ No |
> | Network requests | ❌ No |
>
> Bug reports will be based on verbal descriptions and screen content only.

### No Issues Found
> **No bugs detected.** Either:
> - Everything worked correctly
> - Issues weren't verbalized clearly
> - Try describing problems more explicitly

---

## Files Written

- `backlog/tasks/bug-*.md` - One per bug found

## Integrations

| Tool | Required | Purpose |
|------|----------|---------|
| OBS MCP | Primary | Screen recording (high quality via WebSocket) |
| OBS + LocalVocal | Recommended | Audio transcription to `{LOGS_PATH}` |
| ScreenPipe | Fallback | Screen recording fallback + OCR capture |
| ScreenPipe MCP | Yes | Query screen content and export fallback recordings |
| Chrome DevTools MCP | Recommended | Console + network capture |
| Chrome | Yes | Test browser |

## OBS Setup

### OBS WebSocket (for screen recording)
1. OBS Studio 31.0+ (WebSocket server built-in)
2. Enable WebSocket server: Tools → WebSocket Server Settings
3. Note the port (default: 4455) and password
4. If password is set, update `~/.claude.json`:
   ```json
   "obs": {
     "env": {
       "OBS_WEBSOCKET_PASSWORD": "your-password-here"
     }
   }
   ```

### OBS + LocalVocal (for audio transcription)
1. OBS Studio 32.0+ with LocalVocal plugin installed
2. Audio Input Capture source configured for microphone
3. LocalVocal filter on the audio source with:
   - Model: Whisper Tiny English (or larger)
   - Output to file enabled
   - Output path: `{LOGS_PATH}recording`
4. OBS must be running during test sessions

### Recording Priority
1. **OBS MCP** (primary) - High quality, configurable, includes audio
2. **ScreenPipe** (fallback) - Lower quality, but always available
