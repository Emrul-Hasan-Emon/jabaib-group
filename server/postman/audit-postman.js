#!/usr/bin/env node
/**
 * Postman freshness audit: compares every request in server/postman/*.json
 * against the LIVE Nest API surface (Swagger /api/docs-json).
 *
 * Requires the API server to be running on BASE (default http://localhost:3000).
 *
 * Exit code 0 = every route is covered by at least one request and no request
 * points at a dead route. 1 = drift found.
 *
 * Run: node postman/audit-postman.js
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.API_BASE || 'http://localhost:3000';
const DIR = __dirname;

function collect(items, out) {
  for (const it of items) {
    if (Array.isArray(it.item)) {
      collect(it.item, out);
    } else {
      const req = it.request;
      if (!req) continue;
      const url = req.url;
      let segs = [];
      if (url && Array.isArray(url.path)) segs = url.path.filter(Boolean);
      else if (url && typeof url.path === 'string')
        segs = url.path.split('/').filter(Boolean);
      if (!segs.length) continue;
      out.push({
        name: it.name || '?',
        method: (req.method || 'GET').toUpperCase(),
        path: '/' + segs.join('/'),
      });
    }
  }
}

function swaggerRx(p) {
  const segs = p
    .split('/')
    .filter(Boolean)
    .map((s) =>
      s.startsWith('{') && s.endsWith('}') ? '[^/]+' : escapeRegExp(s),
    );
  return new RegExp('^/' + segs.join('/') + '$');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const res = await fetch(`${BASE}/api/docs-json`);
  if (!res.ok) {
    console.error(`Cannot load Swagger from ${BASE}/api/docs-json (HTTP ${res.status}).`);
    console.error('Start the API server first.');
    process.exit(2);
  }
  const spec = await res.json();

  const live = [];
  for (const p of Object.keys(spec.paths || {})) {
    for (const m of Object.keys(spec.paths[p])) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) {
        live.push({ method: m.toUpperCase(), path: p, rx: swaggerRx(p) });
      }
    }
  }
  // DROP the bare root route (GET /) — not an API endpoint worth covering.
  const liveFiltered = live.filter((r) => r.path !== '/');

  const covered = new Map(); // key: method + ' ' + path
  const stale = [];

  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.postman_collection.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const reqs = [];
    collect(data.item || [], reqs);
    for (const r of reqs) {
      let hit = null;
      for (const l of liveFiltered) {
        if (l.method === r.method && l.rx.test(r.path)) {
          hit = l;
          break;
        }
      }
      if (hit) {
        const key = `${hit.method} ${hit.path}`;
        if (!covered.has(key)) covered.set(key, []);
        covered.get(key).push(`${file.replace('.postman_collection.json', '')}: ${r.name}`);
      } else {
        stale.push({ file, name: r.name, method: r.method, path: r.path });
      }
    }
  }

  const uncovered = liveFiltered.filter((l) => !covered.has(`${l.method} ${l.path}`));

  console.log(`Collections: ${fs.readdirSync(DIR).filter((f) => f.endsWith('.postman_collection.json')).length}`);
  console.log(`Live admin+user routes (excluding GET /): ${liveFiltered.length}`);
  console.log(`Covered by Postman: ${covered.size}`);
  console.log(`Uncovered: ${uncovered.length}`);
  console.log(`Stale Postman requests: ${stale.length}`);
  console.log();

  if (uncovered.length) {
    console.log('--- UNCOVERED LIVE ROUTES ---');
    for (const l of uncovered.sort((a, b) => a.path.localeCompare(b.path)))
      console.log(`  ${l.method.padEnd(6)} ${l.path}`);
    console.log();
  }
  if (stale.length) {
    console.log('--- STALE POSTMAN REQUESTS ---');
    for (const s of stale)
      console.log(`  ${s.file}: ${s.name} -> ${s.method} ${s.path}`);
    console.log();
  }

  if (uncovered.length || stale.length) {
    console.log('DRIFT FOUND — collections are out of date.');
    process.exit(1);
  }
  console.log('All Postman collections are up to date. ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});