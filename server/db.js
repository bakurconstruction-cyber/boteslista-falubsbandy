// Databas: PostgreSQL (Netlify Database i drift, lokal Postgres vid utveckling och test).
// Schema och startdata ligger i netlify/database/migrations/ och appliceras av Netlify vid deploy.
// Alla belopp lagras som heltal i ÖRE för att undvika avrundningsfel.
'use strict';
const pg = require('pg');

// COUNT/SUM returnerar bigint – vi hanterar alltid belopp under 2^53, så tolka som Number.
pg.types.setTypeParser(20, (v) => Number(v));

let pool = null;
function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // I Netlify: rätt databas/gren för miljön (produktion eller förhandsversion).
  try { return require('@netlify/database').getConnectionString(); } catch { /* utanför Netlify */ }
  return process.env.NETLIFY_DB_URL;
}
function getPool() {
  if (!pool) {
    const cs = connectionString();
    if (!cs) throw new Error('Ingen databas konfigurerad (DATABASE_URL saknas).');
    pool = new pg.Pool({ connectionString: cs, max: 3, idleTimeoutMillis: 10000 });
  }
  return pool;
}
async function closePool() { if (pool) { const p = pool; pool = null; await p.end(); } }

// "?"-platshållare → $1, $2 … så att SQL kan skrivas som tidigare.
function toPg(sql) { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); }

// Litet gränssnitt: all/get/run. Samma objekt används både för poolen och för en transaktionsklient.
function wrap(runner) {
  const q = async (sql, params) => (await runner.query(toPg(sql), params)).rows;
  return {
    all: (sql, ...p) => q(sql, p),
    get: async (sql, ...p) => (await q(sql, p))[0],
    run: async (sql, ...p) => { const r = await runner.query(toPg(sql), p); return { changes: r.rowCount, rows: r.rows }; },
    exec: (sql) => runner.query(sql),
  };
}
function db() { return wrap(getPool()); }

// Kör fn i en transaktion. Ett transaktionslås (advisory lock) gör att ändringar körs en i taget,
// vilket skyddar bötesnummer, saldon och dubblettkontroller mot samtidiga registreringar.
async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(262027)');
    const r = await fn(wrap(client));
    await client.query('COMMIT');
    return r;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  } finally { client.release(); }
}

// Nästa nummer ur en räknare. Räknaren går bara uppåt – nummer återanvänds aldrig.
async function nextNumber(t, name) {
  const r = await t.get('UPDATE counters SET value = value + 1 WHERE name = ? RETURNING value', name);
  return r.value;
}

module.exports = { db, tx, nextNumber, getPool, closePool, toPg };
