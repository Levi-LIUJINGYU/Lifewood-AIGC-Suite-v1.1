/* Zero-dependency local server for the Lifewood AIGC Suite.
   Serves static files + reads/writes dashboard-data.json for persistent CRUD. */
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const dir = __dirname, port = 8765, file = 'index.html';
const DATA_FILE = path.join(dir, 'dashboard-data.json');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function defaultData() {
  return { version: 1, custom_mode: true, daily_goal: 0, team: ['Gavin', 'Ian', 'Eva', 'Pierce', 'Vena'], sync_log: [], videos: [] };
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
        const d = defaultData();
        return fs.writeFile(DATA_FILE, JSON.stringify(d, null, 2), 'utf8', werr => cb(werr, d));
      }
      return cb(e);
    }
    try { cb(null, JSON.parse(raw)); }
    catch (pe) { cb(pe); }
  });
}

function writeDataFile(obj, cb) {
  const payload = JSON.stringify(Object.assign({ version: 1, updated_at: new Date().toISOString() }, obj), null, 2);
  const tmp = DATA_FILE + '.tmp';
  fs.writeFile(tmp, payload, 'utf8', e => {
    if (e) return cb(e);
    fs.rename(tmp, DATA_FILE, cb);
  });
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function apiGetData(res) {
  readDataFile((e, data) => {
    if (e) return sendJson(res, 500, { error: e.message });
    sendJson(res, 200, data);
  });
}

function apiPutData(req, res) {
  readBody(req).then(raw => {
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch (e) { return sendJson(res, 400, { error: 'invalid JSON' }); }
    if (!body || typeof body !== 'object') return sendJson(res, 400, { error: 'expected object' });
    if (!Array.isArray(body.videos)) return sendJson(res, 400, { error: 'videos must be an array' });
    writeDataFile(body, e => {
      if (e) return sendJson(res, 500, { error: e.message });
      sendJson(res, 200, { ok: true, count: body.videos.length });
    });
  }).catch(e => sendJson(res, 500, { error: e.message }));
}

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '').split('?')[0]);

  if (req.method === 'GET' && url === '/api/health') return sendJson(res, 200, { ok: true, app: 'lifewood-aigc-suite', version: 1 });
  if (req.method === 'GET' && url === '/api/data') return apiGetData(res);
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
  console.log('\n  Sign in:  lifewood / lifewood');
  console.log('  Leave this window open while you use it. Close it (or press Ctrl+C) to stop.\n');
  try {
    if (process.platform === 'win32') exec('start "" "' + url + '"');
    else if (process.platform === 'darwin') exec('open "' + url + '"');
    else exec('xdg-open "' + url + '"');
  } catch (_) {}
}).on('error', e => { console.error('Could not start server:', e.message, '\nIf port ' + port + ' is busy, close the other window and try again.'); });
