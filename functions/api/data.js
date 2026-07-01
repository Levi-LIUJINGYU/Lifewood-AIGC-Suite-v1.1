const KV_KEY = 'dashboard-bundle';

function defaultData() {
  return {
    version: 1,
    custom_mode: true,
    daily_goal: 0,
    team: ['Gavin', 'Ian', 'Eva', 'Pierce', 'Vena'],
    sync_log: [],
    videos: [],
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function readBundle(env, request) {
  let raw = await env.DASHBOARD_KV.get(KV_KEY);
  if (raw) return raw;

  // First visit: seed KV from the static dashboard-data.json in the deployment.
  if (env.ASSETS) {
    const seedUrl = new URL('dashboard-data.json', request.url);
    const seedRes = await env.ASSETS.fetch(seedUrl);
    if (seedRes.ok) {
      raw = await seedRes.text();
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.videos)) {
          await env.DASHBOARD_KV.put(KV_KEY, raw);
          return raw;
        }
      } catch (_) {}
    }
  }

  raw = JSON.stringify(defaultData());
  await env.DASHBOARD_KV.put(KV_KEY, raw);
  return raw;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DASHBOARD_KV) {
    return json({ error: 'DASHBOARD_KV binding missing — bind a KV namespace in Cloudflare Pages settings' }, 500);
  }
  try {
    const raw = await readBundle(env, request);
    return new Response(raw, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch (e) {
    return json({ error: e.message || 'read failed' }, 500);
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.DASHBOARD_KV) {
    return json({ error: 'DASHBOARD_KV binding missing' }, 500);
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') return json({ error: 'expected object' }, 400);
    if (!Array.isArray(body.videos)) return json({ error: 'videos must be an array' }, 400);

    const saved = Object.assign({ version: 1, updated_at: new Date().toISOString() }, body);
    await env.DASHBOARD_KV.put(KV_KEY, JSON.stringify(saved));
    return json({ ok: true, count: body.videos.length, updated_at: saved.updated_at });
  } catch (e) {
    return json({ error: e.message || 'write failed' }, 500);
  }
}
