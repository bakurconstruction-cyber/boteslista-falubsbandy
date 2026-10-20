// Tester av de centrala arbetsflödena. Kör: npm test
'use strict';
process.env.BK_TODAY = '2026-10-16';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server/local');

delete process.env.DATABASE_URL; // testerna kör alltid mot en ny, tom databas i minnet
let srv; let base; let cookie = '';

async function api(method, url, body, { expect = 200, asCookie } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'boteskassan', Cookie: asCookie ?? cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc && asCookie === undefined) cookie = sc.split(';')[0];
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  assert.equal(res.status, expect, `${method} ${url} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
const cat = async (n) => (await api('GET', '/api/categories')).find((c) => c.number === n);
const player = async (id) => (await api('GET', `/api/players/${id}`)).player;
const fineByNo = async (no) => (await api('GET', '/api/fines')).find((f) => f.fine_no === no);

let A; let B; let C;

test.before(async () => {
  srv = await createServer({ port: 0 });
  base = `http://127.0.0.1:${srv.port}`;
  await api('POST', '/api/setup', { username: 'kassor', display_name: 'Kassör', password: 'hemligt123' });
  A = (await api('POST', '/api/players', { first_name: 'Anna', last_name: 'Test', jersey: '9' })).id;
  B = (await api('POST', '/api/players', { first_name: 'Bertil', last_name: 'Test' })).id;
  C = (await api('POST', '/api/players', { first_name: 'Cecilia', last_name: 'Test' })).id;
});
test.after(() => srv.close());

test('0. Behörigheter: oinloggad och läsbehörig kan inte ändra', async () => {
  await api('GET', '/api/dashboard', null, { expect: 401, asCookie: '' });
  await api('POST', '/api/users', { username: 'laget', password: 'lasbara123', role: 'viewer' });
  const res = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'boteskassan' }, body: JSON.stringify({ username: 'laget', password: 'lasbara123' }) });
  const vc = res.headers.get('set-cookie').split(';')[0];
  await api('GET', '/api/leaderboard', null, { asCookie: vc });
  await api('POST', '/api/players', { first_name: 'X', last_name: 'Y' }, { expect: 403, asCookie: vc });
  await api('GET', '/api/audit', null, { expect: 403, asCookie: vc });
});

test('1+2. Registrera bot och löpande bötesnummer', async () => {
  const c4 = await cat(4);
  const r = await api('POST', '/api/fines', { items: [{ player_id: A, category_id: c4.id, issued_date: '2026-09-10' }] });
  assert.deepEqual(r.fine_nos, ['B-0001']);
  const f = await fineByNo('B-0001');
  assert.equal(f.amount, 2500); assert.equal(f.due_date, '2026-09-30'); assert.equal(f.status, 'obetald');
  // flera samtidigt, inklusive "per pryl"
  const c1 = await cat(1);
  const r2 = await api('POST', '/api/fines', { items: [
    { player_id: A, category_id: c1.id, quantity: 3, issued_date: '2026-10-02' },
    { player_id: B, category_id: (await cat(14)).id, issued_date: '2026-09-20' },
    { player_id: C, category_id: (await cat(12)).id, issued_date: '2026-10-05' },
  ] });
  assert.deepEqual(r2.fine_nos, ['B-0002', 'B-0003', 'B-0004']);
  assert.equal((await fineByNo('B-0002')).amount, 15000);
  // validering: framtida datum, negativt belopp
  await api('POST', '/api/fines', { items: [{ player_id: A, category_id: c4.id, issued_date: '2026-12-01' }] }, { expect: 400 });
  await api('POST', '/api/fines', { items: [{ player_id: A, category_id: c4.id, amount: '-5' }] }, { expect: 400 });
  // misslyckad batch får inte förbruka nummer
  await api('POST', '/api/fines', { items: [{ player_id: A, category_id: c4.id, issued_date: '2026-10-01' }, { player_id: 'S-999', category_id: c4.id }] }, { expect: 404 });
  const r3 = await api('POST', '/api/fines', { items: [{ player_id: B, category_id: c4.id, issued_date: '2026-10-06' }] });
  assert.deepEqual(r3.fine_nos, ['B-0005']);
});

test('3+4. Delbetalning och full betalning', async () => {
  // A har B-0001 (25 kr) och B-0002 (150 kr)
  const p1 = await api('POST', '/api/payments', { player_id: A, date: '2026-09-15', amount: '10', method: 'Swish', allocation_mode: 'manual', allocations: [{ fine_id: (await fineByNo('B-0001')).id, amount: '10' }] });
  assert.equal(p1.payment_no, 'I-0001');
  let f = await fineByNo('B-0001');
  assert.equal(f.status, 'delvis'); assert.equal(f.remaining, 1500);
  await api('POST', '/api/payments', { player_id: A, date: '2026-09-25', amount: '15', method: 'Swish', allocation_mode: 'manual', allocations: [{ fine_id: f.id, amount: '15' }] });
  f = await fineByNo('B-0001');
  assert.equal(f.status, 'betald'); assert.equal(f.paid_date, '2026-09-25');
  const pa = await player(A);
  assert.equal(pa.debt, 15000); assert.equal(pa.paid, 2500); assert.equal(pa.credit, 0);
  // dubblettskydd
  await api('POST', '/api/payments', { player_id: A, date: '2026-09-25', amount: '15', method: 'Swish', allocation_mode: 'none' }, { expect: 409 });
  const key = 'form-123';
  await api('POST', '/api/payments', { player_id: C, date: '2026-10-06', amount: '5', method: 'Swish', allocation_mode: 'none', idempotency_key: key });
  await api('POST', '/api/payments', { player_id: C, date: '2026-10-06', amount: '5', method: 'Swish', allocation_mode: 'none', idempotency_key: key }, { expect: 409 });
});

test('5. Överbetalning ger tillgodohavande, fördelning och återbetalning', async () => {
  // B har B-0003 (200 kr, sep) och B-0005 (25 kr). Betalar 300 kr.
  const r = await api('POST', '/api/payments', { player_id: B, date: '2026-10-08', amount: '300', method: 'Banköverföring', allocation_mode: 'auto' });
  assert.equal(r.allocated, 22500); assert.equal(r.credit, 7500);
  let pb = await player(B);
  assert.equal(pb.debt, 0); assert.equal(pb.credit, 7500);
  // Ny bot → fördela tillgodo
  const no = (await api('POST', '/api/fines', { items: [{ player_id: B, category_id: (await cat(19)).id, issued_date: '2026-10-10' }] })).fine_nos[0];
  await api('POST', `/api/players/${B}/allocate-credit`, { mode: 'auto' });
  assert.equal((await fineByNo(no)).status, 'betald');
  pb = await player(B);
  assert.equal(pb.credit, 2500);
  // återbetala mer än tillgodo → fel; exakt → ok
  await api('POST', '/api/cash', { type: 'refund', player_id: B, date: '2026-10-11', amount: '30' }, { expect: 400 });
  await api('POST', '/api/cash', { type: 'refund', player_id: B, date: '2026-10-11', amount: '25' });
  assert.equal((await player(B)).credit, 0);
});

test('6. Makulering: kräver anledning, frigör betalning, räknas inte', async () => {
  const f = await fineByNo('B-0004'); // C, 200 kr, obetald
  await api('POST', `/api/fines/${f.id}/void`, {}, { expect: 400 });
  await api('POST', `/api/fines/${f.id}/void`, { reason: 'Fel spelare' });
  const after = await fineByNo('B-0004');
  assert.equal(after.status, 'makulerad');
  const pc = await player(C);
  assert.equal(pc.debt, 0); assert.equal(pc.fine_count, 0);
  // numret återanvänds inte
  const r = await api('POST', '/api/fines', { items: [{ player_id: C, category_id: (await cat(12)).id, issued_date: '2026-10-05' }] });
  assert.notEqual(r.fine_nos[0], 'B-0004');
  // bot med betalning makuleras → pengarna blir tillgodo
  const fa = await fineByNo('B-0001');
  await api('POST', `/api/fines/${fa.id}/void`, { reason: 'Test' });
  const pa = await player(A);
  assert.equal(pa.credit, 2500);
  assert.equal(pa.paid, 2500);
});

test('7. Förseningsbot vid månadsskifte (regel 29)', async () => {
  // September: A hade B-0001 betald (men makulerad nu), B hade B-0003 obetald per 30/9 (betald 8/10)
  const rules = await api('GET', '/api/rules?period=2026-09');
  assert.equal(rules.r29.deadline, '2026-09-30'); assert.equal(rules.r29.ended, true);
  const rowB = rules.r29.rows.find((r) => r.player_id === B);
  assert.ok(rowB, 'B ska vara försenad'); assert.equal(rowB.owed, 20000);
  assert.ok(!rules.r29.rows.find((r) => r.player_id === A));
  const r = await api('POST', '/api/rules/29', { period: '2026-09', player_ids: [B] });
  assert.equal((await fineByNo(r.fine_nos[0])).amount, 20000);
  // ingen dubblett
  await api('POST', '/api/rules/29', { period: '2026-09', player_ids: [B] }, { expect: 409 });
  // pågående månad kan inte belastas
  await api('POST', '/api/rules/29', { period: '2026-10', player_ids: [B] }, { expect: 400 });
  // kan inte registreras via vanliga formuläret
  await api('POST', '/api/fines', { items: [{ player_id: B, category_id: (await cat(29)).id }] }, { expect: 400 });
});

test('8. Planterad bot med referens', async () => {
  const c28 = await cat(28);
  const r = await api('POST', '/api/fines', { items: [{ player_id: C, category_id: c28.id, ref_fine_no: 'b-0002', issued_date: '2026-10-12' }] });
  const f = await fineByNo(r.fine_nos[0]);
  assert.equal(f.amount, 15000); assert.match(f.calc, /B-0002/);
  assert.notEqual(f.fine_no, 'B-0002');
  await api('POST', '/api/fines', { items: [{ player_id: C, category_id: c28.id, ref_fine_no: 'B-0004' }] }, { expect: 400 }); // makulerad
  await api('POST', '/api/fines', { items: [{ player_id: C, category_id: c28.id, ref_fine_no: 'B-9999' }] }, { expect: 400 });
});

test('Avslagen klubba (18) visar beräkning', async () => {
  const r = await api('POST', '/api/fines', { items: [{ player_id: A, category_id: (await cat(18)).id, stick_value: '1200', new_stick_cost: '899,50', issued_date: '2026-10-13' }] });
  const f = await fineByNo(r.fine_nos[0]);
  assert.equal(f.amount, 60000 + 89950);
});

test('9. Leaderboard uppdateras och hanterar delade placeringar', async () => {
  let lb = await api('GET', '/api/leaderboard?sort=count');
  const before = lb.most.find((r) => r.id === C);
  await api('POST', '/api/fines', { items: [{ player_id: C, category_id: (await cat(4)).id, issued_date: '2026-10-14' }] });
  lb = await api('GET', '/api/leaderboard?sort=count');
  const after = lb.most.find((r) => r.id === C);
  assert.equal(after.count, before.count + 1);
  // delade placeringar: samma värde → samma placering
  const groups = new Map();
  for (const r of lb.most) { if (groups.has(r.value)) assert.equal(r.place, groups.get(r.value)); else groups.set(r.value, r.place); }
  // månadsfilter
  const sep = await api('GET', '/api/leaderboard?period=month&month=2026-09&sort=amount');
  assert.equal(sep.range.from, '2026-09-01');
  assert.equal(sep.most.find((r) => r.id === B).amount, 20000);
});

test('10. Kassasaldo efter inbetalningar, utgifter och återföring', async () => {
  await api('PUT', '/api/settings', { start_balance: '1000' });
  await api('POST', '/api/cash', { type: 'expense', date: '2026-10-14', amount: '150', description: 'Fika' });
  await api('POST', '/api/cash', { type: 'income', date: '2026-10-14', amount: '40,50', description: 'Pant' });
  let c = await api('GET', '/api/cash');
  const received = 1000 + 1500 + 30000 + 500; // I-0001..I-0004
  assert.equal(c.totals.received, received);
  assert.equal(c.totals.balance, 100000 + received + 4050 - 2500 - 15000);
  // utfärdade böter räknas inte som pengar
  assert.notEqual(c.totals.balance, c.totals.issued);
  // återföring av betalning med obligatorisk anledning
  const pays = await api('GET', '/api/payments');
  const pc = pays.find((p) => p.player_id === C);
  await api('POST', `/api/payments/${pc.id}/reverse`, {}, { expect: 400 });
  await api('POST', `/api/payments/${pc.id}/reverse`, { reason: 'Felregistrerad' });
  c = await api('GET', '/api/cash');
  assert.equal(c.totals.received, received - 500);
  const d = await api('GET', '/api/dashboard');
  assert.equal(d.paid_in, received - 500);
});

test('Ändringslogg, export och exempeldata utan att röra riktiga uppgifter', async () => {
  const log = await api('GET', '/api/audit');
  assert.ok(log.some((a) => a.action === 'Bot makulerad' && a.reason === 'Fel spelare'));
  const realFines = (await api('GET', '/api/fines')).length;
  await api('POST', '/api/demo');
  const withDemo = await api('GET', '/api/fines');
  assert.ok(withDemo.some((f) => f.fine_no.startsWith('X-')));
  await api('DELETE', '/api/demo');
  const after = await api('GET', '/api/fines');
  assert.equal(after.length, realFines);
  const next = await api('POST', '/api/fines', { items: [{ player_id: A, category_id: (await cat(4)).id, issued_date: '2026-10-15' }] });
  assert.match(next.fine_nos[0], /^B-00\d\d$/);
  const csvText = await api('GET', '/api/export/boter.csv');
  assert.match(csvText, /Bötesnummer;Spelar-ID/);
  const imp = await api('POST', '/api/players/import', { csv: 'förnamn;efternamn;tröjnummer\nDavid;Import;12\nAnna;Test;9\n;Saknar;1' });
  assert.equal(imp.created.length, 1); assert.equal(imp.skipped.length, 1); assert.equal(imp.errors.length, 1);
});

test('Samtidiga registreringar får unika, löpande bötesnummer', async () => {
  const c4 = await cat(4);
  const before = (await api('GET', '/api/fines')).filter((f) => f.fine_no.startsWith('B-')).length;
  const results = await Promise.all(Array.from({ length: 12 }, () => api('POST', '/api/fines', { items: [{ player_id: B, category_id: c4.id, issued_date: '2026-10-15' }] })));
  const nos = results.map((r) => r.fine_nos[0]);
  assert.equal(new Set(nos).size, 12);
  const all = (await api('GET', '/api/fines')).filter((f) => f.fine_no.startsWith('B-')).map((f) => Number(f.fine_no.slice(2))).sort((a, b) => a - b);
  assert.equal(all.length, before + 12);
  assert.deepEqual(all, Array.from({ length: all.length }, (_, i) => i + 1)); // inga luckor, inga dubbletter
  const backup = await api('GET', '/api/export/sakerhetskopia.json');
  assert.equal(backup.data.fines.length, (await api('GET', '/api/fines')).length);
});
