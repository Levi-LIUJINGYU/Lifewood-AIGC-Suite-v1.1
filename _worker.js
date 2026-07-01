// Cloudflare Worker entry point — serves the static site (via env.ASSETS) and
// handles /api/health and /api/data (KV-backed replacement for serve.cjs's local API).
const KV_KEY = 'dashboard-data';

function defaultData() {
  return { version: 1, custom_mode: true, daily_goal: 0, team: ['Gavin', 'Ian', 'Eva', 'Pierce', 'Vena'], sync_log: [], videos: [] };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function handleGetData(env) {
  const raw = await env.DASHBOARD_KV.get(KV_KEY);
  if (!raw) {
    const data = defaultData();
    await env.DASHBOARD_KV.put(KV_KEY, JSON.stringify(data));
    return json(data);
  }
  try {
    return json(JSON.parse(raw));
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function handlePutData(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'expected object' }, 400);
  if (!Array.isArray(body.videos)) return json({ error: 'videos must be an array' }, 400);
  const payload = Object.assign({ version: 1 }, body, { updated_at: new Date().toISOString() });
  await env.DASHBOARD_KV.put(KV_KEY, JSON.stringify(payload));
  return json({ ok: true, count: body.videos.length });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json({ ok: true, app: 'lifewood-aigc-suite', version: 1 });
    }
    if (request.method === 'GET' && url.pathname === '/api/data') {
      return handleGetData(env);
    }
    if (request.method === 'PUT' && url.pathname === '/api/data') {
      return handlePutData(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
