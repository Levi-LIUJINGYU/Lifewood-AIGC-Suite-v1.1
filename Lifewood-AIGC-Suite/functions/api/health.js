/** GET /api/health — same contract as serve.cjs (enables live save in the dashboard). */
export async function onRequestGet() {
  return Response.json(
    { ok: true, app: 'lifewood-aigc-suite', version: 1 },
    { headers: { 'cache-control': 'no-store' } }
  );
}
