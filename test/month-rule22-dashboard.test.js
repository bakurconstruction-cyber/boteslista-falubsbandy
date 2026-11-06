// Tester: "Registrera 2 veckor utan böter" (regel 22 för alla), aktiv månad, Swish-meddelandet
// "Böter [Aktiv månad]" och startsidans tre kort. Kör: npm test
'use strict';
process.env.BK_TODAY = '2026-11-20';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server/local');

delete process.env.DATABASE_URL;
let srv; let base; let admin = '';

async function call(method, url, body, { expect = 200, as = admin } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'boteskassan', Cookie: as },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  if (expect !== null) assert.equal(res.status, expect, `${method} ${url} → ${res.status}: ${JSON.stringify(data)}`);
  return { data, status: res.status, cookie: (res.headers.get('set-cookie') || '').split(';')[0] };
}
const api = async (...a) => (await call(...a)).data;
const login = async (u, p) => (await call('POST', '/api/login', { username: u, password: p }, { as: '' })).cookie;
const cat = async (n) => (await api('GET', '/api/categories')).find((c) => c.number === n);
const fines = async () => api('GET', '/api/fines');
const eligibleIds = async () => (await api('GET', '/api/rules')).r22.rows.filter((r) => r.eligible).map((r) => r.player_id).sort();
const r22Fines = async () => (await fines()).filter((f) => f.category_number === 22 && !f.voided);

const SEASON_START = '2026-08-01T08:00:00Z';
let A; let B; let C; let D; let E; let F; let player; let viewer;

test.before(async () => {
  srv = await createServer({ port: 0 });
  base = `http://127.0.0.1:${srv.port}`;
  admin = (await call('POST', '/api/setup', { username: 'kassor', password: 'hemligt123' }, { as: '' })).cookie;
  const mk = async (first, jersey, created = SEASON_START) => (await api('POST', '/api/players', { first_name: first, last_name: 'Test', jersey, created_at: created })).id;
  A = await mk('Anna', '1'); // inga böter → kvalificerar
  B = await mk('Bo', '2'); // bot 15 nov → kvalificerar inte (perioden slutar 29 nov)
  C = await mk('Cia', '3'); // bot 30 okt → kvalificerar (31 okt – 13 nov)
  D = await mk('Dan', '4'); // inaktiv → aldrig med
  E = await mk('Eva', '5', '2026-11-10T08:00:00Z'); // ny i laget 10 nov → inte 14 dagar än
  F = await mk('Fia', '6'); // bot 6 nov → perioden 7–20 nov är inte passerad (20 nov är idag)
  const c4 = await cat(4);
  await api('POST', '/api/fines', { items: [
    { player_id: B, category_id: c4.id, issued_date: '2026-11-15' },
    { player_id: C, category_id: c4.id, issued_date: '2026-10-30' },
    { player_id: F, category_id: c4.id, issued_date: '2026-11-06' },
  ] });
  await api('POST', `/api/players/${D}/active`, { active: false });
  await api('POST', `/api/players/${B}/account`, { password: 'losenord1' });
  player = await login('2', 'losenord1');
  await api('POST', '/api/users', { username: 'laget', password: 'lasbara123', role: 'viewer' });
  viewer = await login('laget', 'lasbara123');
});
test.after(() => srv.close());

test('Regel 22: rätt spelare kvalificerar enligt den befintliga regeln', async () => {
  assert.deepEqual(await eligibleIds(), [A, C].sort());
});

test('Regel 22 alla: bara administratören får registrera', async () => {
  await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A, C] }, { expect: 403, as: player });
  await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A, C] }, { expect: 403, as: viewer });
  await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A, C] }, { expect: 401, as: '' });
  assert.equal((await r22Fines()).length, 0);
});

test('Regel 22 alla: ändrad lista efter bekräftelse → ingen registreras', async () => {
  await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A] }, { expect: 409 });
  await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A, B, C] }, { expect: 409 });
  await call('POST', '/api/rules/22/all', {}, { expect: 400 });
  assert.equal((await r22Fines()).length, 0);
});

test('Regel 22 alla: fel mitt i registreringen → ingen registreras (en transaktion)', async () => {
  // Tvinga fram ett fel på den ANDRA spelaren: lägg en rad med nästa-nästa bötesnummer i förväg.
  const { db } = require('../server/db');
  const q = db();
  const counter = (await q.get("SELECT value FROM counters WHERE name = 'fine'")).value;
  const blocker = 'B-' + String(counter + 2).padStart(4, '0');
  const c4 = await q.get('SELECT * FROM categories WHERE number = 4');
  await q.run(`INSERT INTO fines (fine_no, season_id, player_id, category_id, category_name, category_number, kind, issued_date, due_date, amount, registered_by, created_at, voided, void_reason)
    VALUES (?, 1, ?, ?, ?, 4, ?, '2026-08-01', '2026-08-31', 100, 'test', '2026-08-01', 1, 'testspärr')`, blocker, B, c4.id, c4.name, c4.kind);
  try {
    const before = (await fines()).length;
    const r = await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A, C] }, { expect: 500 });
    assert.match(r.data.error, /Inget har sparats/);
    assert.equal((await fines()).length, before);
    assert.equal((await r22Fines()).length, 0); // inte heller den första spelaren
    assert.equal((await q.get("SELECT value FROM counters WHERE name = 'fine'")).value, counter); // nummer förbrukades inte
  } finally {
    await q.run('DELETE FROM fines WHERE fine_no = ?', blocker);
  }
});

test('Regel 22 alla: registrerar alla kvalificerade individuellt i en transaktion', async () => {
  const c22 = await cat(22);
  const res = await api('POST', '/api/rules/22/all', { confirmed_player_ids: [C, A] });
  assert.deepEqual(res.registered.map((r) => r.player_id).sort(), [A, C].sort());
  const nos = res.registered.map((r) => r.fine_no);
  assert.equal(new Set(nos).size, 2);
  const created = await r22Fines();
  assert.equal(created.length, 2);
  for (const f of created) {
    assert.equal(f.amount, c22.default_amount); // befintligt belopp, oförändrat
    assert.equal(f.issued_date, '2026-11-20');
    assert.ok(nos.includes(f.fine_no));
  }
  assert.ok(!created.some((f) => [B, D, E, F].includes(f.player_id)));
  assert.equal(created.find((f) => f.player_id === C).description, 'Inga böter 2026-10-31 – 2026-11-13');
  const log = await api('GET', '/api/audit');
  assert.ok(log.some((l) => l.action === 'Regel 22 registrerad för alla kvalificerade'));
});

test('Regel 22 alla: samma spelare kan inte registreras två gånger', async () => {
  assert.deepEqual(await eligibleIds(), []);
  const r = await call('POST', '/api/rules/22/all', { confirmed_player_ids: [A, C] }, { expect: 409 });
  assert.equal(r.data.code, 'none_eligible');
  await call('POST', '/api/rules/22', { player_ids: [A] }, { expect: 400 }); // inte heller via den vanliga knappen
  assert.equal((await r22Fines()).length, 2);
  // Databasskyddet: samma regel-nyckel två gånger stoppas även om man försöker direkt
  const { db } = require('../server/db');
  const f = (await r22Fines())[0];
  await assert.rejects(db().run(`INSERT INTO fines (fine_no, season_id, player_id, category_id, category_name, category_number, kind, issued_date, due_date, amount, registered_by, created_at, rule_key)
    SELECT 'B-9999', season_id, player_id, category_id, category_name, category_number, kind, issued_date, due_date, amount, 'test', created_at, rule_key FROM fines WHERE id = ?`, f.id), /duplicate key/);
});

test('Aktiv månad: startvärde finns och bara administratören kan byta', async () => {
  const s = await api('GET', '/api/settings');
  assert.match(s.active_month, /^2026-(0[89]|1[0-2])$|^2027-0[1-4]$/);
  await call('PUT', '/api/settings', { active_month: '2026-12' }, { expect: 403, as: player });
  await call('PUT', '/api/settings', { active_month: '2026-12' }, { expect: 403, as: viewer });
  await call('PUT', '/api/settings', { active_month: '2027-06' }, { expect: 400 }); // utanför säsongen
  await call('PUT', '/api/settings', { active_month: 'november' }, { expect: 400 });
});

test('Swish-meddelandet följer aktiv månad – inte dagens datum', async () => {
  await api('PUT', '/api/settings', { swish_number: '0701234567' });
  for (const [ym, name] of [['2026-11', 'November'], ['2026-12', 'December'], ['2027-01', 'Januari'], ['2026-09', 'September']]) {
    await api('PUT', '/api/settings', { active_month: ym });
    const sw = await api('GET', '/api/me/swish', null, { as: player });
    assert.equal(sw.message, `Böter ${name}`);
    const url = new URL(sw.url);
    assert.equal(url.origin + url.pathname, 'https://app.swish.nu/1/p/sw/');
    assert.equal(url.searchParams.get('msg'), `Böter ${name}`); // det som faktiskt skickas till Swish
    assert.ok(sw.url.includes(`msg=B%C3%B6ter%20${name}`));
    assert.equal(url.searchParams.get('amt'), String(sw.amount / 100)); // belopp och nummer oförändrade
    assert.equal((await api('GET', '/api/settings', null, { as: player })).swish_message, `Böter ${name}`);
    assert.equal((await api('GET', '/api/month')).swish_message, `Böter ${name}`);
    assert.equal((await api('GET', '/api/month')).period, ym); // Månadsskifte öppnar på aktiv månad
  }
});

test('Swish-numret behålls när aktiv månad byts', async () => {
  await api('PUT', '/api/settings', { swish_number: '0701234567', swish_name: 'Kassören' });
  await api('PUT', '/api/settings', { active_month: '2026-11' });
  const sw = await api('GET', '/api/me/swish', null, { as: player });
  assert.equal(sw.number, '0701234567');
  assert.equal(new URL(sw.url).searchParams.get('sw'), '0701234567');
  assert.equal(sw.name, 'Kassören');
});

test('Startsidan: de tre korten räknas rätt och följer aktiv månad', async () => {
  await api('PUT', '/api/settings', { active_month: '2026-11', start_balance: '500' });
  const c14 = await cat(14);
  const [x1, x2] = (await api('POST', '/api/fines', { items: [
    { player_id: A, category_id: c14.id, issued_date: '2026-11-18' },
    { player_id: C, category_id: c14.id, issued_date: '2026-11-19' },
  ] })).fine_nos;
  const all = await fines();
  await api('POST', `/api/fines/${all.find((f) => f.fine_no === x2).id}/void`, { reason: 'test' }); // makulerad räknas inte
  await api('POST', '/api/payments', { player_id: A, date: '2026-11-19', amount: '50', method: 'Swish', allocation_mode: 'auto' }); // delbetalning
  await api('POST', '/api/cash', { type: 'expense', date: '2026-11-19', amount: '100', description: 'Puckar' });

  const d = await api('GET', '/api/dashboard');
  const cash = await api('GET', '/api/cash');
  const players = await api('GET', '/api/players');
  const live = (await fines()).filter((f) => !f.voided);
  // Kort 1: kassa = startsaldo + inbetalningar + övrigt − återbetalningar − utgifter
  assert.equal(d.cash.balance, cash.totals.balance);
  assert.equal(d.cash.balance, 50000 + 5000 - 10000);
  // Kort 2: bara obetalda belopp
  assert.equal(d.unpaid_fines.amount, live.reduce((s, f) => s + f.remaining, 0));
  assert.equal(d.unpaid_fines.amount, players.reduce((s, p) => s + p.debt, 0));
  assert.equal(d.unpaid_fines.count, live.filter((f) => f.remaining > 0).length);
  // Kort 3: böter registrerade under aktiv månad (november), makulerade exkluderade
  const nov = live.filter((f) => f.issued_date.startsWith('2026-11'));
  assert.equal(d.active_month, '2026-11');
  assert.equal(d.active_month_name, 'November');
  assert.deepEqual(d.active_month_fines, { amount: nov.reduce((s, f) => s + f.amount, 0), count: nov.length });
  assert.ok(nov.some((f) => f.fine_no === x1));
  // Byt aktiv månad → kortet följer med
  await api('PUT', '/api/settings', { active_month: '2026-10' });
  const d2 = await api('GET', '/api/dashboard');
  const oct = live.filter((f) => f.issued_date.startsWith('2026-10'));
  assert.deepEqual(d2.active_month_fines, { amount: oct.reduce((s, f) => s + f.amount, 0), count: oct.length });
  // Spelare med obetalda böter
  assert.deepEqual(d.debtors.map((p) => p.id).sort(), players.filter((p) => p.debt > 0).map((p) => p.id).sort());
  // Spelare och läskonto ser startsidan men kan inte ändra
  await call('GET', '/api/dashboard', null, { as: player });
  await call('GET', '/api/dashboard', null, { as: viewer });
});
