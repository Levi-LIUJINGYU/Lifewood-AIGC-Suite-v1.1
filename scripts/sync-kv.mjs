#!/usr/bin/env node
/**
 * Sync dashboard-data.json ↔ Cloudflare KV (same store as /api/data on Pages).
 *
 *   node scripts/sync-kv.mjs push   # local file → KV (overwrite remote)
 *   node scripts/sync-kv.mjs pull   # KV → local file (backup)
 *
 * Requires: npm i -g wrangler   and   wrangler login
 * Set env KV_NAMESPACE_ID or edit wrangler.toml [[kv_namespaces]] id.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dataFile = join(root, 'dashboard-data.json');
const kvKey = 'dashboard-bundle';

function kvNamespaceId() {
  if (process.env.KV_NAMESPACE_ID) return process.env.KV_NAMESPACE_ID;
  const toml = readFileSync(join(root, 'wrangler.toml'), 'utf8');
  const m = toml.match(/id\s*=\s*"([^"]+)"/);
  if (!m || m[1].startsWith('REPLACE')) {
    console.error('Set KV_NAMESPACE_ID or put your namespace id in wrangler.toml');
    process.exit(1);
  }
  return m[1];
}

function wrangler(args) {
  const r = spawnSync('wrangler', args, { encoding: 'utf8', shell: true });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'wrangler failed');
    process.exit(r.status || 1);
  }
  return (r.stdout || '').trim();
}

const cmd = process.argv[2];
const ns = kvNamespaceId();

if (cmd === 'push') {
  if (!existsSync(dataFile)) {
    console.error('Missing', dataFile);
    process.exit(1);
  }
  const raw = readFileSync(dataFile, 'utf8');
  JSON.parse(raw);
  wrangler(['kv', 'key', 'put', kvKey, raw, '--namespace-id', ns]);
  console.log('Pushed', dataFile, '→ KV key', kvKey);
} else if (cmd === 'pull') {
  const raw = wrangler(['kv', 'key', 'get', kvKey, '--namespace-id', ns]);
  if (!raw) {
    console.error('KV key empty — nothing to pull');
    process.exit(1);
  }
  const pretty = JSON.stringify(JSON.parse(raw), null, 2);
  writeFileSync(dataFile, pretty + '\n', 'utf8');
  console.log('Pulled KV →', dataFile);
} else {
  console.log('Usage: node scripts/sync-kv.mjs push|pull');
  process.exit(1);
}
