/* Zero-dependency local server for the Lifewood AIGC Suite.
   Serves static files + authenticated read/write of dashboard-data.json. */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), { exec } = require('child_process');
const dir = __dirname, port = 8765, file = 'index.html';
const DATA_FILE = path.join(dir, 'dashboard-data.json');
const TOKEN_TTL_MS = 12 * 3600 * 1000;
const SESSIONS = new Map();
const TEAM_USER = process.env.API_TEAM_USER || 'lifewood';
const TEAM_PASS = process.env.API_TEAM_PASS || 'lifewood';
const ADMIN_USER = process.env.API_ADMIN_USER || 'LIFEWOOD';
const ADMIN_PASS = process.env.API_ADMIN_PASS || 'LIFEWOOD';
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function defaultData() {
  return { version: 2, custom_mode: true, daily_goal: 0, team: ['Gavin', 'Ian', 'Eva', 'Pierce', 'Vena'], sync_log: [], videos: [] };
}

function checkPassword(user, pass) {
  if (user === TEAM_USER && pass === TEAM_PASS) return { user, role: 'team' };
  if (user === ADMIN_USER && pass === ADMIN_PASS) return { user, role: 'admin' };
  return null;
}

function purgeSessions() {
  const now = Date.now();
  for (const [token, sess] of SESSIONS) {
    if (!sess || sess.exp < now) SESSIONS.delete(token);
  }
}

function bearerToken(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : '';
}

function requireAuth(req, res) {
  purgeSessions();
  const token = bearerToken(req);
  const sess = token && SESSIONS.get(token);
  if (!sess || sess.exp < Date.now()) {
    sendJson(res, 401, { error: 'unauthorized' });
    return null;
  }
  return sess;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => { chunks.push(c); if (chunks.reduce((n, x) => n + x.length, 0) > 32e6) { req.destroy(); reject(new Error('body too large')); } });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function readDataFile(cb) {
  fs.readFile(DATA_FILE, 'utf8', (e, raw) => {
    if (e) {
      if (e.code === 'ENOENT') {
        const d = Object.assign(defaultData(), { updated_at: new Date().toISOString() });
        return fs.writeFile(DATA_FILE, JSON.stringify(d, null, 2), 'utf8', werr => cb(werr, d));
      }
      return cb(e);
    }
    try { cb(null, JSON.parse(raw)); }
    catch (pe) { cb(pe); }
  });
}

function writeDataFile(obj, cb) {
  const updated_at = new Date().toISOString();
  const payloadObj = Object.assign({ version: 2 }, obj, { updated_at });
  const payload = JSON.stringify(payloadObj, null, 2);
  const tmp = DATA_FILE + '.tmp';
  fs.writeFile(tmp, payload, 'utf8', e => {
    if (e) return cb(e);
    fs.rename(tmp, DATA_FILE, err => cb(err, payloadObj));
  });
}

function sendJson(res, code, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (extraHeaders) Object.assign(headers, extraHeaders);
  if (obj && obj.updated_at) headers.ETag = `"${obj.updated_at}"`;
  res.writeHead(code, headers);
  res.end(body);
}

function parseIfMatch(req) {
  const raw = String(req.headers['if-match'] || req.headers['x-if-match'] || '').trim();
  if (!raw) return '';
  if (raw === '*') return '*';
  return raw.replace(/^W\//, '').replace(/^"|"$/g, '');
}

function apiLogin(req, res) {
  readBody(req).then(raw => {
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch (e) { return sendJson(res, 400, { error: 'invalid JSON' }); }
    const user = String((body && body.user) || '').trim();
    const pass = String((body && body.pass) || '');
    const ok = checkPassword(user, pass);
    if (!ok) return sendJson(res, 401, { error: 'unauthorized' });
    purgeSessions();
    const token = crypto.randomBytes(24).toString('hex');
    const exp = Date.now() + TOKEN_TTL_MS;
    SESSIONS.set(token, { user: ok.user, role: ok.role, exp });
    sendJson(res, 200, { ok: true, token, exp, role: ok.role, user: ok.user });
  }).catch(e => sendJson(res, 500, { error: e.message }));
}

function apiGetData(req, res) {
  if (!requireAuth(req, res)) return;
  readDataFile((e, data) => {
    if (e) return sendJson(res, 500, { error: e.message });
    sendJson(res, 200, data);
  });
}

function apiPutData(req, res) {
  if (!requireAuth(req, res)) return;
  readBody(req).then(raw => {
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch (e) { return sendJson(res, 400, { error: 'invalid JSON' }); }
    if (!body || typeof body !== 'object') return sendJson(res, 400, { error: 'expected object' });
    if (!Array.isArray(body.videos)) return sendJson(res, 400, { error: 'videos must be an array' });
    readDataFile((e, current) => {
      if (e) return sendJson(res, 500, { error: e.message });
      const currentAt = (current && current.updated_at) || '';
      const ifMatch = parseIfMatch(req);
      if (currentAt && ifMatch !== '*' && ifMatch !== currentAt) {
        return sendJson(res, 409, { error: 'conflict', updated_at: currentAt });
      }
      writeDataFile(body, (werr, saved) => {
        if (werr) return sendJson(res, 500, { error: werr.message });
        sendJson(res, 200, { ok: true, count: body.videos.length, updated_at: saved.updated_at });
      });
    });
  }).catch(e => sendJson(res, 500, { error: e.message }));
}

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '').split('?')[0]);

  if (req.method === 'GET' && url === '/api/health') return sendJson(res, 200, { ok: true, app: 'lifewood-aigc-suite', version: 2, auth: true });
  if (req.method === 'POST' && url === '/api/login') return apiLogin(req, res);
  if (req.method === 'GET' && url === '/api/data') return apiGetData(req, res);
  if (req.method === 'PUT' && url === '/api/data') return apiPutData(req, res);

  let f = url;
  if (f === '/' || f === '') f = '/' + file;
  const fp = path.normalize(path.join(dir, f));
  if (!fp.startsWith(dir)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (e, data) => {
    if (e) { res.writeHead(404); return res.end('Not found: ' + f); }
    res.writeHead(200, { 'content-type': types[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  const url = 'http://localhost:' + port + '/' + file;
  console.log('\n  Lifewood AIGC Suite is running at:\n  ' + url);
  console.log('\n  Data file:  dashboard-data.json  (auto-saved when you edit the dashboard)');
  console.log('\n  API:        /api/login then Bearer token on /api/data (conflict check via If-Match)');
  console.log('\n  Sign in:  lifewood / lifewood');
  console.log('  Leave this window open while you use it. Close it (or press Ctrl+C) to stop.\n');
  try {
    if (process.platform === 'win32') exec('start "" "' + url + '"');
    else if (process.platform === 'darwin') exec('open "' + url + '"');
    else exec('xdg-open "' + url + '"');
  } catch (_) {}
}).on('error', e => { console.error('Could not start server:', e.message, '\nIf port ' + port + ' is busy, close the other window and try again.'); });
