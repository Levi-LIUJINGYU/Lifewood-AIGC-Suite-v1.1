// Cloudflare Worker — static assets + authenticated /api/data with optimistic concurrency.
const KV_KEY = "dashboard-data";
const SESS_PREFIX = "sess:";
const TOKEN_TTL_SEC = 12 * 3600;

function defaultData() {
  return { version: 2, custom_mode: true, daily_goal: 0, team: ["Gavin", "Ian", "Eva", "Pierce", "Vena"], sync_log: [], videos: [] };
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function creds(env) {
  return {
    teamUser: env.API_TEAM_USER || "lifewood",
    teamPass: env.API_TEAM_PASS || "lifewood",
    adminUser: env.API_ADMIN_USER || "LIFEWOOD",
    adminPass: env.API_ADMIN_PASS || "LIFEWOOD",
  };
}

function checkPassword(user, pass, env) {
  const c = creds(env);
  if (user === c.teamUser && pass === c.teamPass) return { user, role: "team" };
  if (user === c.adminUser && pass === c.adminPass) return { user, role: "admin" };
  return null;
}

function randomToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bearerToken(request) {
  const h = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : "";
}

async function requireAuth(request, env) {
  const token = bearerToken(request);
  if (!token) return json({ error: "unauthorized" }, 401);
  const raw = await env.DASHBOARD_KV.get(SESS_PREFIX + token);
  if (!raw) return json({ error: "unauthorized" }, 401);
  try {
    const sess = JSON.parse(raw);
    if (!sess || !sess.exp || sess.exp < Date.now()) {
      await env.DASHBOARD_KV.delete(SESS_PREFIX + token);
      return json({ error: "unauthorized" }, 401);
    }
    return sess;
  } catch (e) {
    return json({ error: "unauthorized" }, 401);
  }
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid JSON" }, 400);
  }
  const user = String((body && body.user) || "").trim();
  const pass = String((body && body.pass) || "");
  const ok = checkPassword(user, pass, env);
  if (!ok) return json({ error: "unauthorized" }, 401);
  const token = randomToken();
  const exp = Date.now() + TOKEN_TTL_SEC * 1000;
  await env.DASHBOARD_KV.put(SESS_PREFIX + token, JSON.stringify({ user: ok.user, role: ok.role, exp }), {
    expirationTtl: TOKEN_TTL_SEC,
  });
  return json({ ok: true, token, exp, role: ok.role, user: ok.user });
}

function etagOf(updatedAt) {
  return updatedAt ? `"${updatedAt}"` : "";
}

function parseIfMatch(request) {
  const raw = (request.headers.get("if-match") || request.headers.get("x-if-match") || "").trim();
  if (!raw) return "";
  if (raw === "*") return "*";
  return raw.replace(/^W\//, "").replace(/^"|"$/g, "");
}

async function readStore(env) {
  const raw = await env.DASHBOARD_KV.get(KV_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function handleGetData(env) {
  let data = await readStore(env);
  if (!data) {
    data = defaultData();
    data.updated_at = new Date().toISOString();
    await env.DASHBOARD_KV.put(KV_KEY, JSON.stringify(data));
  }
  const tag = etagOf(data.updated_at);
  return json(data, 200, tag ? { ETag: tag } : {});
}

async function handlePutData(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid JSON" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "expected object" }, 400);
  if (!Array.isArray(body.videos)) return json({ error: "videos must be an array" }, 400);

  const current = (await readStore(env)) || {};
  const currentAt = current.updated_at || "";
  const ifMatch = parseIfMatch(request);
  if (currentAt && ifMatch !== "*" && ifMatch !== currentAt) {
    return json({ error: "conflict", updated_at: currentAt }, 409, { ETag: etagOf(currentAt) });
  }

  const updated_at = new Date().toISOString();
  const payload = Object.assign({ version: 2 }, body, { updated_at });
  await env.DASHBOARD_KV.put(KV_KEY, JSON.stringify(payload));
  return json({ ok: true, count: body.videos.length, updated_at }, 200, { ETag: etagOf(updated_at) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, app: "lifewood-aigc-suite", version: 2, auth: true });
    }
    if (request.method === "POST" && url.pathname === "/api/login") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/data" && (request.method === "GET" || request.method === "PUT")) {
      const auth = await requireAuth(request, env);
      if (auth instanceof Response) return auth;
      if (request.method === "GET") return handleGetData(env);
      return handlePutData(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
