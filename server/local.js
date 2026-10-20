// Lokal körning: node server/local.js
// Använder DATABASE_URL om den finns, annars startas en lokal Postgres-kompatibel databas
// (sparas i ./data/pg) och migrationerna appliceras automatiskt.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

async function startLocalDb(dir) {
  const { NetlifyDB } = await import('@netlify/database-dev');
  const ndb = new NetlifyDB(dir ? { directory: dir } : {});
  const cs = await ndb.start();
  await ndb.applyMigrations(path.join(__dirname, '..', 'netlify', 'database', 'migrations'));
  return { cs, ndb };
}

async function createServer({ port = 3000, dbDir } = {}) {
  let ndb = null;
  if (!process.env.DATABASE_URL) {
    const r = await startLocalDb(dbDir);
    process.env.DATABASE_URL = r.cs; ndb = r.ndb;
  }
  const { handle, bootstrapAdmin } = require('./app');
  await bootstrapAdmin();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
      const request = new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
      const response = await handle(request, { ip: req.socket.remoteAddress || '' });
      const out = {};
      response.headers.forEach((v, k) => { out[k] = v; });
      res.writeHead(response.status, out);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    let f = path.join(PUBLIC, p);
    if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUBLIC, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(port, r));
  const close = async () => {
    await new Promise((r) => server.close(r));
    await require('./db').closePool();
    if (ndb) await ndb.stop();
  };
  return { server, close, port: server.address().port };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer({ port, dbDir: path.join(__dirname, '..', 'data', 'pg') }).then(({ port: p }) => {
    console.log(`Böteskassan 26/27 körs på http://localhost:${p}`);
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { createServer };
