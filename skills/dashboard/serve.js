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
const RESULTS_DIR = path.join(HANDLER_BASE, 'handler-results-archive');  // archived results (new results live in dispatch files)
const BLOCKERS_DIR = path.join(HANDLER_BASE, 'handler-blockers-archive'); // archived blockers (new blockers live in dispatch files)
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
// Decision Link Enrichment
// ---------------------------------------------------------------------------

const PLANS_DIR = path.join(HANDLER_BASE, 'plans');
const GITHUB_BASE = 'https://github.com/elicoon';
const PROJECT_REPOS = {
  'golf-clip': 'golf-clip',
  'golfclip': 'golf-clip',
  'coon-family-app': 'coon-family-app',
  'traffic-control': 'traffic-control',
  'anthropic-app': 'elicoon.com',
  'anthropic-application': 'elicoon.com',
  'claude-code-skills': 'claude-code-skills',
  'mosh-ssh-tmux': 'mosh-ssh-tmux',
  'dev-org': 'dev-org',
};

function findDecisionLinks(stateContent) {
  // Parse pending decisions table
  const pdSection = stateContent.match(/## Pending Decisions[\s\S]*?(?=\n## )/);
  if (!pdSection) return {};

  const links = {};
  const pdRows = pdSection[0].matchAll(/\|\s*(PD\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/g);
  for (const row of pdRows) {
    const id = row[1].trim();
    const project = row[2].trim();
    const question = row[3].trim();
    const options = row[4].trim();
    if (/resolved/i.test(options)) continue;

    const decLinks = [];
    const repo = PROJECT_REPOS[project.toLowerCase()] || '';

    // Extract PR references and link to GitHub
    const prRefs = question.matchAll(/PR\s*#(\d+)/gi);
    for (const pr of prRefs) {
      if (repo) {
        decLinks.push({
          label: 'PR #' + pr[1],
          url: GITHUB_BASE + '/' + repo + '/pull/' + pr[1],
          type: 'pr',
        });
      }
    }

    // Find related handler results from archive (completed work for same project)
    // TODO: Also extract results from dispatch files' ## Progress sections
    // Extract PR numbers from question for matching against filenames
    const prNums = [];
    for (const m of question.matchAll(/PR\s*#(\d+)/gi)) prNums.push('pr' + m[1]);
    try {
      const resultFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.md'));
      const projSlug = project.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const rf of resultFiles) {
        const rfSlug = rf.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Must match project name in filename
        if (!rfSlug.includes(projSlug) && projSlug.length > 3) continue;
        // Match by: PR number in filename, or keyword overlap
        const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const rfLower = rf.toLowerCase();
        const prMatch = prNums.some(pr => rfLower.includes(pr));
        const rfWords = rfLower.replace(/[-_.]/g, ' ');
        const overlap = qWords.filter(w => rfWords.includes(w));
        if (prMatch || overlap.length >= 1 || (projSlug.length <= 3 && rfSlug.includes(projSlug))) {
          try {
            const rc = fs.readFileSync(path.join(RESULTS_DIR, rf), 'utf8');
            const titleLine = rc.match(/^#\s+(.+)/m);
            const title = titleLine ? titleLine[1].replace(/^Result:\s*/i, '').substring(0, 80) : rf;
            decLinks.push({
              label: title,
              url: '/api/file?path=handler-results-archive/' + rf,
              type: 'result',
            });
          } catch (e) { /* skip unreadable */ }
        }
      }
    } catch (e) { /* results dir missing */ }

    // Find related plan/design/architecture docs
    const DOC_DIRS = [
      { dir: PLANS_DIR, urlPrefix: 'plans/', type: 'plan' },
      { dir: path.join(HANDLER_BASE, 'architecture'), urlPrefix: 'architecture/', type: 'plan' },
    ];
    for (const { dir, urlPrefix, type } of DOC_DIRS) {
      try {
        const docFiles = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        const projSlug = project.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const df of docFiles) {
          const dfSlug = df.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (dfSlug.includes(projSlug) || dfSlug.includes('anthropic') && projSlug.includes('anthropic')) {
            const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const dfWords = df.toLowerCase().replace(/[-_.]/g, ' ');
            const overlap = qWords.filter(w => dfWords.includes(w));
            if (overlap.length >= 1 || /design|plan|architecture|review/i.test(question)) {
              decLinks.push({
                label: df.replace('.md', ''),
                url: '/api/file?path=' + urlPrefix + df,
                type,
              });
            }
          }
          // Also match if the question directly references the filename
          if (question.includes(df) || question.includes(df.replace('.md', ''))) {
            if (!decLinks.some(l => l.url.includes(df))) {
              decLinks.push({
                label: df.replace('.md', ''),
                url: '/api/file?path=' + urlPrefix + df,
                type,
              });
            }
          }
        }
      } catch (e) { /* dir missing */ }
    }

    if (decLinks.length > 0) {
      links[id] = decLinks;
    }
  }

  // Also enrich queued dispatches with their dispatch file content summaries
  const qdSection = stateContent.match(/### Queued Dispatches[\s\S]*?(?=\n## |\n### [^Q])/);
  if (qdSection) {
    const qdRows = qdSection[0].matchAll(/\|\s*(\S+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*[^|]*\|\s*[^|]*\|/g);
    for (const row of qdRows) {
      const fileId = row[1].trim();
      if (fileId === 'File' || fileId === '---') continue;
      const project = row[2].trim();
      const repo = PROJECT_REPOS[project.toLowerCase()] || '';

      // Find the actual dispatch file
      try {
        const dispatchFiles = fs.readdirSync(DISPATCHES_DIR).filter(f => f.endsWith('.md'));
        const match = dispatchFiles.find(f => f.toLowerCase().includes(fileId.toLowerCase()));
        if (match) {
          const dc = fs.readFileSync(path.join(DISPATCHES_DIR, match), 'utf8');
          const decLinks = [];

          // Extract PR references from dispatch file content
          const prRefs = dc.matchAll(/PR\s*#(\d+)/gi);
          for (const pr of prRefs) {
            if (repo) {
              decLinks.push({
                label: 'PR #' + pr[1],
                url: GITHUB_BASE + '/' + repo + '/pull/' + pr[1],
                type: 'pr',
              });
            }
          }

          if (decLinks.length > 0) {
            links[fileId] = decLinks;
          }
        }
      } catch (e) { /* dispatch dir missing */ }
    }
  }

  return links;
}

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

  // Promote commonly-needed metadata to top-level fields
  result.project = result.metadata.project || '';
  // Don't promote priority — client extracts numeric priority from metadata.priority
  result.budgetCap = result.metadata.budget_cap || '';
  result.type = result.metadata.type || '';
  result.repo = result.metadata.repo || '';

  // v2 lifecycle fields — promote to top-level
  result.status = (result.metadata.status || 'queued').toLowerCase();
  result.needsApproval = /yes/i.test(result.metadata.needs_approval || '');
  result.worker = result.metadata.worker || '';
  result.startedAt = result.metadata.started || '';
  result.completedAt = result.metadata.completed || '';
  result.commit = result.metadata.commit || '';
  result.pr = result.metadata.pr || '';
  result.resultSummary = result.metadata.result || '';
  result.blocker = result.metadata.blocker || '';

  // Parse ## Progress section
  const progressMatch = content.match(/## Progress\s*\n([\s\S]*?)(?=\n## |$)/);
  result.progress = progressMatch ? progressMatch[1].trim() : '';

  // Scope Boundaries (risks / out-of-scope)
  const scopeMatch = content.match(/### Scope Boundaries\s*\n([\s\S]*?)(?=\n### |\n## |$)/);
  result.scopeBoundaries = scopeMatch ? scopeMatch[1].trim() : '';

  // Context section — key files and background
  const contextMatch = content.match(/## Context\s*\n([\s\S]*?)(?=\n## |$)/);
  if (contextMatch) {
    result.context = contextMatch[1].trim();
    // Extract key file paths: lines starting with - `/path/...`
    const fileLines = contextMatch[1].matchAll(/^-\s*`([^`]+)`\s*[—–-]\s*(.+)/gm);
    result.keyFiles = [];
    for (const fl of fileLines) {
      result.keyFiles.push({ path: fl[1].trim(), description: fl[2].trim() });
    }
  } else {
    result.context = '';
    result.keyFiles = [];
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
  // Watch dispatch directory (v2: single source of truth)
  const watchDirs = [
    { dir: DISPATCHES_DIR, event: 'dispatches:changed' },
  ];

  for (const { dir, event } of watchDirs) {
    try {
      let debounce = null;
      const w = fs.watch(dir, { persistent: false }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => broadcast(event, { timestamp: new Date().toISOString() }), 300);
      });
      w.on('error', () => {}); // ignore watch errors
      watchers.push(w);
    } catch (_) {} // dir might not exist
  }

  // Watch handler-state.md
  try {
    let debounce = null;
    const w = fs.watch(STATE_FILE, { persistent: false }, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => broadcast('state:changed', { timestamp: new Date().toISOString() }), 300);
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
    let totalSize = 0;
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > 1e6) { req.destroy(); reject(new Error('Body too large')); return; }
      chunks.push(chunk);
    });
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
      const dispatches = await readAndParseDir(DISPATCHES_DIR, parseDispatchFile);
      sendJSON(res, { dispatches });
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
          sections.push({
            title: '_preamble',
            content: part.trim(),
          });
        }
      }

      // Enrich pending decisions with relevant file links
      const decisionLinks = findDecisionLinks(content);
      sendJSON(res, { sections, raw: content, decisionLinks });
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
  const dispatchActionMatch = url.pathname.match(/^\/api\/dispatches\/([\w.-]+)\/(approve|reject|rework|stop)$/);
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
        const feedback = (body.feedback || 'No feedback provided').replace(/[|]/g, '-');
        line = `\n| ${dispatchId} | REWORK | ${timestamp} | ${feedback} |`;
      } else if (action === 'stop') {
        const workerName = body.workerName;
        if (!workerName || !/^worker-\d+$/.test(workerName)) {
          sendError(res, 'workerName must match worker-N pattern', 400);
          return;
        }
        try {
          execSync(`tmux kill-session -t ${workerName} 2>/dev/null`, { timeout: 5000 });
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
      const port = parseInt(body.port, 10);

      if (!projectPath || !port) {
        sendError(res, 'path and port required', 400);
        return;
      }

      // Validate port is a safe integer
      if (isNaN(port) || port < 1024 || port > 65535) {
        sendError(res, 'port must be between 1024-65535', 400);
        return;
      }

      // Validate path has no shell metacharacters
      if (!/^\/[\w./-]+$/.test(projectPath)) {
        sendError(res, 'Invalid path', 400);
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
        execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { timeout: 5000 });
      } catch (_) {}

      // Launch in tmux
      execSync(
        `tmux new-session -d -s ${sessionName} -c "${projectPath}" "${command}"`,
        { timeout: 5000 }
      );

      const host = req.headers.host || `localhost:${PORT}`;
      const hostname = host.split(':')[0];
      sendJSON(res, { ok: true, url: `http://${hostname}:${port}`, session: sessionName, command });
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // API: file viewer — serves markdown files from dev-org/docs as HTML
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/file' && req.method === 'GET') {
    const relPath = url.searchParams.get('path');
    if (!relPath) {
      sendError(res, 'path parameter required', 400);
      return;
    }
    // Sanitize: only allow alphanumeric, hyphens, underscores, dots, slashes
    if (!/^[\w./-]+$/.test(relPath)) {
      sendError(res, 'Invalid path', 400);
      return;
    }
    const absPath = path.join(HANDLER_BASE, relPath);
    // Prevent traversal outside HANDLER_BASE
    if (!absPath.startsWith(HANDLER_BASE)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(absPath, 'utf8', (err, content) => {
      if (err) {
        sendError(res, 'File not found: ' + relPath, 404);
        return;
      }
      // Render as simple HTML with monospace styling
      const title = relPath.split('/').pop().replace('.md', '');
      const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0d1117; color: #c9d1d9; line-height: 1.6; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
  h1, h2, h3 { color: #58a6ff; border-bottom: 1px solid #21262d; padding-bottom: 8px; }
  a { color: #58a6ff; }
  code { background: #161b22; padding: 2px 6px; border-radius: 3px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #30363d; padding: 8px 12px; text-align: left; }
  th { background: #161b22; }
  .back { display: inline-block; margin-bottom: 20px; color: #8b949e; text-decoration: none; }
  .back:hover { color: #58a6ff; }
</style></head><body>
<a class="back" href="javascript:window.close()">Close</a>
<pre>${escaped}</pre>
</body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    });
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
