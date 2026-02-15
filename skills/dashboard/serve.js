// Minimal static file server for the backlog dashboard.
// Serves files from the repo root so dashboard.html can fetch backlog/tasks/*.md.
// Also provides handler pipeline APIs for dispatches, results, blockers, workers, and SSE.
//
// Usage:  node serve.js [port]
// Then open: http://localhost:3000/dashboard.html

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = parseInt(process.argv[2], 10) || 3000;
const ROOT = __dirname;

// Handler data directories
const HANDLER_BASE = '/home/eli/dev-org/docs';
const DISPATCHES_DIR = path.join(HANDLER_BASE, 'handler-dispatches');
const RESULTS_DIR = path.join(HANDLER_BASE, 'handler-results');
const BLOCKERS_DIR = path.join(HANDLER_BASE, 'handler-blockers');
const STATE_FILE = path.join(HANDLER_BASE, 'handler-state.md');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// ---------------------------------------------------------------------------
// Markdown Parsers (Task 1)
// ---------------------------------------------------------------------------

function parseDispatchFile(content, filename) {
  const id = filename.replace(/\.md$/, '');
  const result = { id, filename };

  // Title from first # heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  result.title = titleMatch ? titleMatch[1].replace(/^Dispatch:\s*/i, '') : id;

  // Parse metadata table: | **Field** | Value |
  const tableRows = content.matchAll(/\|\s*\*\*(\w[\w\s]*?)\*\*\s*\|\s*(.+?)\s*\|/g);
  result.metadata = {};
  for (const row of tableRows) {
    const key = row[1].trim().toLowerCase().replace(/\s+/g, '_');
    result.metadata[key] = row[2].trim();
  }

  // Objective section
  const objectiveMatch = content.match(/## Objective\s*\n([\s\S]*?)(?=\n###|\n## |$)/);
  result.objective = objectiveMatch ? objectiveMatch[1].trim() : '';

  // Acceptance criteria checkboxes
  const acSection = content.match(/### Acceptance Criteria\s*\n([\s\S]*?)(?=\n### |\n## |$)/);
  if (acSection) {
    const checks = acSection[1].matchAll(/- \[([ xX])\]\s*(.+)/g);
    result.acceptanceCriteria = [];
    for (const c of checks) {
      result.acceptanceCriteria.push({
        done: c[1].toLowerCase() === 'x',
        text: c[2].trim(),
      });
    }
  } else {
    result.acceptanceCriteria = [];
  }

  return result;
}

function parseResultFile(content, filename) {
  const id = filename.replace(/\.md$/, '');
  const result = { id, filename };

  // Title
  const titleMatch = content.match(/^#\s+(.+)/m);
  result.title = titleMatch ? titleMatch[1].replace(/^Result:\s*/i, '') : id;

  // Metadata table
  const tableRows = content.matchAll(/\|\s*\*\*(\w[\w\s]*?)\*\*\s*\|\s*(.+?)\s*\|/g);
  result.metadata = {};
  for (const row of tableRows) {
    const key = row[1].trim().toLowerCase().replace(/\s+/g, '_');
    result.metadata[key] = row[2].trim();
  }

  // Legacy format: **Date:** and **Verdict:** lines
  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
  if (dateMatch) result.date = dateMatch[1].trim();

  const verdictMatch = content.match(/\*\*Verdict:\*\*\s*(.+)/);
  if (verdictMatch) result.verdict = verdictMatch[1].trim();

  // Acceptance criteria if present
  const acSection = content.match(/## Acceptance Criteria\s*\n([\s\S]*?)(?=\n## |$)/);
  if (acSection) {
    const checks = acSection[1].matchAll(/- \[([ xX])\]\s*(.+)/g);
    result.acceptanceCriteria = [];
    for (const c of checks) {
      result.acceptanceCriteria.push({
        done: c[1].toLowerCase() === 'x',
        text: c[2].trim(),
      });
    }
  }

  return result;
}

function parseBlockerFile(content, filename) {
  const id = filename.replace(/\.md$/, '');
  const result = { id, filename };

  // Title
  const titleMatch = content.match(/^#\s+(.+)/m);
  result.title = titleMatch ? titleMatch[1].replace(/^Blocker:\s*/i, '') : id;

  // **Date:** and **Status:** lines
  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
  if (dateMatch) result.date = dateMatch[1].trim();

  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  if (statusMatch) result.status = statusMatch[1].trim();

  const dispatchMatch = content.match(/\*\*Dispatch:\*\*\s*(.+)/);
  if (dispatchMatch) result.dispatch = dispatchMatch[1].trim();

  // ## Blocker section
  const blockerSection = content.match(/## Blocker\s*\n([\s\S]*?)(?=\n## |$)/);
  result.blocker = blockerSection ? blockerSection[1].trim() : '';

  // ## To Unblock section
  const unblockSection = content.match(/## To Unblock\s*\n([\s\S]*?)(?=\n## |$)/);
  result.toUnblock = unblockSection ? unblockSection[1].trim() : '';

  return result;
}

function readAndParseDir(dirPath, parser) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        // Directory might not exist yet
        if (err.code === 'ENOENT') return resolve([]);
        return reject(err);
      }
      const mdFiles = files.filter(f => f.endsWith('.md'));
      const promises = mdFiles.map(f =>
        new Promise((res, rej) => {
          fs.readFile(path.join(dirPath, f), 'utf8', (err2, content) => {
            if (err2) return rej(err2);
            try {
              res(parser(content, f));
            } catch (e) {
              res({ id: f.replace(/\.md$/, ''), filename: f, error: e.message });
            }
          });
        })
      );
      Promise.all(promises).then(results => {
        // Sort newest first by filename (date-prefixed)
        results.sort((a, b) => b.filename.localeCompare(a.filename));
        resolve(results);
      }).catch(reject);
    });
  });
}

// ---------------------------------------------------------------------------
// Worker Status via tmux (Task 2)
// ---------------------------------------------------------------------------

function getWorkerStatus() {
  try {
    const sessionsRaw = execSync(
      'tmux list-sessions -F "#{session_name}:#{session_created}:#{session_activity}" 2>/dev/null',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();

    if (!sessionsRaw) return [];

    const lines = sessionsRaw.split('\n');
    const workers = [];

    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length < 3) continue;
      const name = parts[0];
      if (!name.startsWith('worker-')) continue;

      const created = parseInt(parts[1], 10);
      const activity = parseInt(parts[2], 10);
      const now = Math.floor(Date.now() / 1000);
      const elapsedSec = now - created;

      // Format elapsed time
      const hours = Math.floor(elapsedSec / 3600);
      const mins = Math.floor((elapsedSec % 3600) / 60);
      const elapsed = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      // Last activity
      const activityAge = now - activity;
      const active = activityAge < 30; // active if activity within 30s

      // Capture last 30 lines of pane output
      let output = '';
      try {
        output = execSync(`tmux capture-pane -t "${name}" -p -S -30 2>/dev/null`, {
          encoding: 'utf8',
          timeout: 5000,
        }).trim();
      } catch (_) {}

      // Try to extract model info from output
      let model = '';
      let modelSettings = '';
      const modelMatch = output.match(/model[:\s]+(claude[\w-]+)/i);
      if (modelMatch) model = modelMatch[1];
      const settingsMatch = output.match(/model.*settings[:\s]+(.+)/i);
      if (settingsMatch) modelSettings = settingsMatch[1];

      workers.push({
        name,
        created: new Date(created * 1000).toISOString(),
        elapsed,
        lastActivity: new Date(activity * 1000).toISOString(),
        output: output.split('\n').slice(-15).join('\n'), // last 15 lines for API
        active,
        model,
        modelSettings,
      });
    }

    return workers;
  } catch (e) {
    // tmux not running or no sessions
    return [];
  }
}

// ---------------------------------------------------------------------------
// SSE Event Stream (Task 3)
// ---------------------------------------------------------------------------

const sseClients = new Set();
const watchers = [];
let workerPollInterval = null;

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

function startWatchers() {
  // Watch dispatch/result/blocker directories
  const watchDirs = [
    { dir: DISPATCHES_DIR, event: 'dispatches:changed' },
    { dir: RESULTS_DIR, event: 'results:changed' },
    { dir: BLOCKERS_DIR, event: 'blockers:changed' },
  ];

  for (const { dir, event } of watchDirs) {
    try {
      const w = fs.watch(dir, { persistent: false }, () => {
        broadcast(event, { timestamp: new Date().toISOString() });
      });
      w.on('error', () => {}); // ignore watch errors
      watchers.push(w);
    } catch (_) {} // dir might not exist
  }

  // Watch handler-state.md
  try {
    const w = fs.watch(STATE_FILE, { persistent: false }, () => {
      broadcast('state:changed', { timestamp: new Date().toISOString() });
    });
    w.on('error', () => {});
    watchers.push(w);
  } catch (_) {}
}

function startWorkerPolling() {
  if (workerPollInterval) return;
  workerPollInterval = setInterval(() => {
    if (sseClients.size === 0) return;
    const workers = getWorkerStatus();
    broadcast('workers:update', { workers });
  }, 5000);
}

function stopWorkerPolling() {
  if (workerPollInterval) {
    clearInterval(workerPollInterval);
    workerPollInterval = null;
  }
}

// ---------------------------------------------------------------------------
// Body Parser Helper (Task 4)
// ---------------------------------------------------------------------------

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status = 500) {
  sendJSON(res, { error: message }, status);
}

// ---------------------------------------------------------------------------
// Server (async callback for POST body parsing)
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }
  let filePath = path.join(ROOT, decoded);

  // Default to dashboard.html for root
  if (url.pathname === '/') filePath = path.join(ROOT, 'dashboard.html');

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // -------------------------------------------------------------------------
  // API: list task files (existing)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/tasks' && req.method === 'GET') {
    const tasksDir = path.join(ROOT, 'backlog', 'tasks');
    fs.readdir(tasksDir, (err, files) => {
      if (err) {
        sendError(res, 'Could not read tasks directory');
        return;
      }
      const mdFiles = files.filter(f => f.endsWith('.md')).sort();
      sendJSON(res, mdFiles);
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: dispatches, results, blockers (Task 1)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/dispatches' && req.method === 'GET') {
    try {
      const [dispatches, results, blockers] = await Promise.all([
        readAndParseDir(DISPATCHES_DIR, parseDispatchFile),
        readAndParseDir(RESULTS_DIR, parseResultFile),
        readAndParseDir(BLOCKERS_DIR, parseBlockerFile),
      ]);
      sendJSON(res, { dispatches, results, blockers });
    } catch (e) {
      sendError(res, e.message);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // API: handler state (Task 1)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/handler-state' && req.method === 'GET') {
    fs.readFile(STATE_FILE, 'utf8', (err, content) => {
      if (err) {
        sendError(res, 'Could not read handler-state.md');
        return;
      }
      // Split into sections by ## headers
      const sections = [];
      const parts = content.split(/(?=^## )/m);
      for (const part of parts) {
        const headerMatch = part.match(/^## (.+)/m);
        if (headerMatch) {
          sections.push({
            title: headerMatch[1].trim(),
            content: part.trim(),
          });
        } else if (part.trim()) {
          // Preamble before first ## header
          sections.push({
            title: '_preamble',
            content: part.trim(),
          });
        }
      }
      sendJSON(res, { sections, raw: content });
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: worker status (Task 2)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/workers' && req.method === 'GET') {
    const workers = getWorkerStatus();
    sendJSON(res, { workers });
    return;
  }

  // -------------------------------------------------------------------------
  // API: SSE event stream (Task 3)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('event: connected\ndata: {}\n\n');

    sseClients.add(res);
    startWorkerPolling();

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (_) {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
      if (sseClients.size === 0) stopWorkerPolling();
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: dispatch actions (Task 4)
  // -------------------------------------------------------------------------
  const dispatchActionMatch = url.pathname.match(/^\/api\/dispatches\/(.+)\/(approve|reject|rework|stop)$/);
  if (dispatchActionMatch && req.method === 'POST') {
    const dispatchId = dispatchActionMatch[1];
    const action = dispatchActionMatch[2];

    try {
      const body = await parseBody(req);
      const timestamp = new Date().toISOString().split('T')[0];
      let line = '';

      if (action === 'approve') {
        line = `\n| ${dispatchId} | APPROVED | ${timestamp} |`;
      } else if (action === 'reject') {
        line = `\n| ${dispatchId} | REJECTED | ${timestamp} |`;
      } else if (action === 'rework') {
        const feedback = body.feedback || 'No feedback provided';
        line = `\n| ${dispatchId} | REWORK | ${timestamp} | ${feedback} |`;
      } else if (action === 'stop') {
        const workerName = body.workerName;
        if (!workerName) {
          sendError(res, 'workerName required in body', 400);
          return;
        }
        try {
          execSync(`tmux kill-session -t "${workerName}" 2>/dev/null`, { timeout: 5000 });
        } catch (_) {
          // Session might already be dead
        }
        sendJSON(res, { ok: true, action: 'stop', dispatchId, workerName });
        return;
      }

      // Append to handler-state.md
      fs.appendFile(STATE_FILE, line, 'utf8', (err) => {
        if (err) {
          sendError(res, 'Failed to update handler-state.md');
          return;
        }
        sendJSON(res, { ok: true, action, dispatchId });
      });
    } catch (e) {
      sendError(res, e.message, 400);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // API: dev server start (Task 5)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/server/start' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const projectPath = body.path;
      const port = body.port;

      if (!projectPath || !port) {
        sendError(res, 'path and port required', 400);
        return;
      }

      // Validate path exists
      if (!fs.existsSync(projectPath)) {
        sendError(res, `Path does not exist: ${projectPath}`, 400);
        return;
      }

      // Detect dev server command from package.json
      let command = `npx serve -l ${port}`;
      const pkgPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const scripts = pkg.scripts || {};
          if (scripts.dev) {
            command = `PORT=${port} npm run dev`;
          } else if (scripts.start) {
            command = `PORT=${port} npm start`;
          }
        } catch (_) {}
      }

      const sessionName = `preview-${port}`;

      // Kill existing session if present
      try {
        execSync(`tmux kill-session -t "${sessionName}" 2>/dev/null`, { timeout: 5000 });
      } catch (_) {}

      // Launch in tmux
      execSync(
        `tmux new-session -d -s "${sessionName}" -c "${projectPath}" "${command}"`,
        { timeout: 5000 }
      );

      sendJSON(res, { ok: true, url: `http://192.168.50.205:${port}`, session: sessionName, command });
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // Static file serving (existing)
  // -------------------------------------------------------------------------
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + url.pathname);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// Start file watchers for SSE
startWatchers();

server.listen(PORT, () => {
  console.log('Dashboard server running at http://localhost:' + PORT + '/dashboard.html');
  console.log('Press Ctrl+C to stop.');
});

// Cleanup on exit
process.on('SIGINT', () => {
  stopWorkerPolling();
  for (const w of watchers) {
    try { w.close(); } catch (_) {}
  }
  process.exit(0);
});
