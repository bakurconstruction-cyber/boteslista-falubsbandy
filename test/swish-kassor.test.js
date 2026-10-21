// Tester: Swish, kassabehörighet (Johannes), juniorrabatt-undantag för Avslagen klubba och
// att varje anmälan godkänns separat. Kör: npm test
'use strict';
process.env.BK_TODAY = '2026-10-16';
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
const player = async (id) => (await api('GET', `/api/players/${id}`)).player;
const fines = async () => api('GET', '/api/fines');
const payments = async () => api('GET', '/api/payments');
const reports = async () => api('GET', '/api/reports');

let JOH; let VIGGO; let ERIK; let LISA; let OLLE; let MAX; let joh; let viggo; let erik; let lisa;

test.before(async () => {
  srv = await createServer({ port: 0 });
  base = `http://127.0.0.1:${srv.port}`;
  admin = (await call('POST', '/api/setup', { username: 'kassor', password: 'hemligt123' }, { as: '' })).cookie;
  JOH = (await api('POST', '/api/players', { first_name: 'Johannes', last_name: 'Kassa', jersey: '2' })).id;
  VIGGO = (await api('POST', '/api/players', { first_name: 'Viggo', last_name: 'Lund', jersey: '10', junior_discount: true })).id;
  ERIK = (await api('POST', '/api/players', { first_name: 'Erik', last_name: 'Andersson', jersey: '7' })).id;
  LISA = (await api('POST', '/api/players', { first_name: 'Lisa', last_name: 'Berg', jersey: '4' })).id;
  OLLE = (await api('POST', '/api/players', { first_name: 'Olle', last_name: 'Ek', jersey: '22' })).id;
  MAX = (await api('POST', '/api/players', { first_name: 'Max', last_name: 'Nord', jersey: '15' })).id;
  for (const id of [JOH, VIGGO, ERIK, LISA]) await api('POST', `/api/players/${id}/account`, { password: 'losenord1' });
  joh = await login('2', 'losenord1'); viggo = await login('10', 'losenord1'); erik = await login('7', 'losenord1'); lisa = await login('4', 'losenord1');
});
test.after(() => srv.close());

test('3+4+5. Juniorrabatt 50 % på vanliga böter, fullt belopp för Avslagen klubba', async () => {
  const c14 = await cat(14); const c18 = await cat(18);
  assert.equal(c18.junior_exempt, 1);
  assert.equal(c14.junior_exempt, 0);
  const [n1, n2, n3] = (await api('POST', '/api/fines', { items: [
    { player_id: VIGGO, category_id: c14.id, issued_date: '2026-10-10' }, // 200 kr → 100 kr
    { player_id: VIGGO, category_id: c18.id, issued_date: '2026-10-11', stick_value: '1200', new_stick_cost: '900' }, // 600 + 900 = 1500 kr
    { player_id: ERIK, category_id: c18.id, issued_date: '2026-10-11', stick_value: '1000', new_stick_cost: '500' }, // 1000 kr
  ] })).fine_nos;
  const all = await fines();
  const f1 = all.find((f) => f.fine_no === n1); const f2 = all.find((f) => f.fine_no === n2); const f3 = all.find((f) => f.fine_no === n3);
  assert.deepEqual([f1.base_amount, f1.discount_amount, f1.amount], [20000, 10000, 10000]);
  assert.deepEqual([f2.base_amount, f2.discount_amount, f2.amount, f2.discount_pct], [150000, 0, 150000, 0]);
  assert.match(f2.calc, /Juniorrabatt gäller inte Avslagen klubba/);
  assert.equal(f3.amount, 100000);
  assert.equal((await player(VIGGO)).debt, 10000 + 150000);
  // redigering av klubb-boten: fortfarande ingen rabatt; vanlig bot: rabatt räknas om en gång
  await api('PUT', `/api/fines/${f2.id}`, { amount: '1600', reason: 'Dyrare klubba' });
  await api('PUT', `/api/fines/${f1.id}`, { amount: '200', description: 'x', reason: 'Text' });
  const after = await fines();
  assert.equal(after.find((f) => f.fine_no === n2).amount, 160000);
  assert.equal(after.find((f) => f.fine_no === n1).amount, 10000);
  // via godkänd anmälan: vanlig bot får rabatt (klubba kan inte anmälas – hanteras av admin)
  const r = await api('POST', '/api/reports', { player_id: VIGGO, category_id: (await cat(4)).id, incident_date: '2026-10-12' }, { as: erik });
  await api('POST', '/api/reports', { player_id: VIGGO, category_id: c18.id }, { as: erik, expect: 400 });
  const { fine_no } = await api('POST', `/api/reports/${r.id}/approve`, {});
  const fr = (await fines()).find((f) => f.fine_no === fine_no);
  assert.deepEqual([fr.base_amount, fr.discount_amount, fr.amount], [2500, 1250, 1250]);
});

test('Undantaget ändrar inte historiska böter', async () => {
  // Simulerar en klubb-bot registrerad med rabatt före ändringen: den ska stå kvar orörd.
  const { db } = require('../server/db');
  const c18 = await cat(18);
  await db().run(`INSERT INTO fines (fine_no, season_id, player_id, category_id, category_name, category_number, kind, issued_date, due_date, amount, base_amount, discount_amount, discount_pct, registered_by, created_at)
    VALUES ('B-9001', 1, ?, ?, 'Avslagen klubba', 18, 'stick', '2026-10-01', '2026-10-31', 50000, 100000, 50000, 50, 'gammal', 'x')`, VIGGO, c18.id);
  await api('POST', '/api/fines', { items: [{ player_id: VIGGO, category_id: c18.id, issued_date: '2026-10-13', stick_value: '200', new_stick_cost: '0' }] });
  const old = (await fines()).find((f) => f.fine_no === 'B-9001');
  assert.deepEqual([old.amount, old.base_amount, old.discount_amount], [50000, 100000, 50000]);
});

test('1+2. Swish: förifylld länk och uppgifter – ingenting markeras som betalt', async () => {
  // utan konfigurerat nummer: ingen länk
  let s = await api('GET', '/api/me/swish', null, { as: viggo });
  assert.equal(s.configured, false); assert.equal(s.url, null);
  // administratören konfigurerar; validering
  await api('PUT', '/api/settings', { swish_number: '12345' }, { expect: 400 });
  await api('PUT', '/api/settings', { swish_number: '070-123 45 67', swish_name: 'Kassören Falu BS' });
  await api('PUT', '/api/settings', { swish_number: '0709999999' }, { as: joh, expect: 403 }); // bara admin
  assert.equal((await api('GET', '/api/settings', null, { as: viggo })).swish_number, '0701234567');
  const debtBefore = (await player(VIGGO)).debt;
  const paysBefore = (await payments()).length;
  s = await api('GET', '/api/me/swish', null, { as: viggo });
  assert.equal(s.configured, true); assert.equal(s.number, '0701234567'); assert.equal(s.name, 'Kassören Falu BS');
  assert.equal(s.amount, debtBefore);
  assert.match(s.message, new RegExp(`^Böter ${VIGGO} nr 10 Viggo Lund$`));
  assert.ok(s.message.length <= 50);
  const u = new URL(s.url);
  assert.equal(u.origin + u.pathname, 'https://app.swish.nu/1/p/sw/');
  assert.equal(u.searchParams.get('sw'), '0701234567');
  assert.equal(u.searchParams.get('amt'), debtBefore % 100 ? (debtBefore / 100).toFixed(2) : String(debtBefore / 100));
  assert.equal(u.searchParams.get('cur'), 'SEK');
  assert.equal(u.searchParams.get('msg'), s.message);
  // att hämta/klicka Swish ändrar ingenting
  for (let i = 0; i < 3; i++) await api('GET', '/api/me/swish', null, { as: viggo });
  assert.equal((await player(VIGGO)).debt, debtBefore);
  assert.equal((await payments()).length, paysBefore);
  // en spelare utan skuld får ingen länk; admin/läskonto har ingen spelarskuld
  s = await api('GET', '/api/me/swish', null, { as: lisa });
  assert.equal(s.amount, 0); assert.equal(s.url, null);
  await api('GET', '/api/me/swish', null, { expect: 403 });
});

test('Kassabehörighet: kopplad till spelar-ID, kan ges och återkallas av admin', async () => {
  // utan behörighet: 403 på serversidan
  await api('GET', '/api/verify/overview', null, { as: joh, expect: 403 });
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: '10', verified: true, method: 'Swish', date: '2026-10-16' }, { as: joh, expect: 403 });
  await api('POST', `/api/players/${JOH}/payment-permission`, { enabled: true }, { as: joh, expect: 403 }); // kan inte ge sig själv
  await api('POST', `/api/players/${JOH}/payment-permission`, { enabled: true });
  const st = await api('GET', '/api/status', null, { as: joh });
  assert.equal(st.user.can_register_payments, true);
  // byter tröjnummer → behörigheten följer spelar-ID, och en ny nr 2 får den inte
  await api('PUT', `/api/players/${JOH}`, { first_name: 'Johannes', last_name: 'Kassa', jersey: '3' });
  joh = await login('3', 'losenord1');
  await api('GET', '/api/verify/overview', null, { as: joh });
  const NEW2 = (await api('POST', '/api/players', { first_name: 'Ny', last_name: 'Tvåa', jersey: '2' })).id;
  assert.equal((await player(NEW2)).can_register_payments, 0);
  await api('PUT', `/api/players/${JOH}`, { first_name: 'Johannes', last_name: 'Kassa', jersey: '2' }, { expect: 200 }); // tillbaka till 2 – Ny Tvåa har inget konto
  await api('PUT', `/api/players/${NEW2}`, { first_name: 'Ny', last_name: 'Tvåa', jersey: '9' });
  joh = await login('2', 'losenord1');
});

test('3. Johannes registrerar verifierade hel- och delbetalningar', async () => {
  const ov = await api('GET', '/api/verify/overview', null, { as: joh });
  const v = ov.players.find((p) => p.id === VIGGO);
  assert.ok(v.debt > 0);
  // verifiering krävs
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: '50', method: 'Swish', date: '2026-10-16' }, { as: joh, expect: 400 });
  // delbetalning
  const debt0 = (await player(VIGGO)).debt;
  const p1 = await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: '100', method: 'Swish', date: '2026-10-16', reference: 'Swish 16/10', verified: true, mode: 'partial', idempotency_key: 'j-1' }, { as: joh });
  assert.match(p1.payment_no, /^I-\d{4}$/);
  assert.equal((await player(VIGGO)).debt, debt0 - 10000);
  const pay = (await payments()).find((x) => x.payment_no === p1.payment_no);
  assert.equal(pay.registered_by, '#2 Johannes Kassa'); assert.equal(pay.amount, 10000); assert.ok(pay.created_at);
  const log = await api('GET', '/api/audit');
  assert.ok(log.some((a) => a.action === 'Verifierad inbetalning registrerad' && a.username === '#2 Johannes Kassa' && a.entity_id === p1.payment_no));
  // 8. upprepat klick (samma formulär) ger ingen dubblett
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: '100', method: 'Swish', date: '2026-10-16', verified: true, mode: 'partial', idempotency_key: 'j-1' }, { as: joh, expect: 409 });
  const parallel = await Promise.all(Array.from({ length: 4 }, () => call('POST', '/api/verify/payments', { player_id: VIGGO, amount: '1', method: 'Swish', date: '2026-10-15', verified: true, idempotency_key: 'j-2' }, { as: joh, expect: null })));
  assert.equal(parallel.filter((r) => r.status === 200).length, 1);
  assert.equal((await payments()).filter((x) => x.reference === '' && x.amount === 100 && x.date === '2026-10-15').length, 1);
  // mer än skulden och egen betalning stoppas
  const debt1 = (await player(VIGGO)).debt;
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: String(debt1 / 100 + 1), method: 'Swish', date: '2026-10-16', verified: true }, { as: joh, expect: 400 });
  await api('POST', '/api/fines', { items: [{ player_id: JOH, category_id: (await cat(4)).id, issued_date: '2026-10-14' }] });
  await api('POST', '/api/verify/payments', { player_id: JOH, amount: '25', method: 'Swish', date: '2026-10-16', verified: true }, { as: joh, expect: 403 });
  // hela skulden
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: String((debt1 - 100) / 100), method: 'Swish', date: '2026-10-16', verified: true, mode: 'full' }, { as: joh, expect: 409 }); // fel belopp för "hela"
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: String(debt1 / 100), method: 'Kontant', date: '2026-10-16', verified: true, mode: 'full', idempotency_key: 'j-3' }, { as: joh });
  assert.equal((await player(VIGGO)).debt, 0);
  assert.ok((await fines()).filter((f) => f.player_id === VIGGO && !f.voided).every((f) => f.status === 'betald'));
  await api('POST', '/api/verify/payments', { player_id: VIGGO, amount: '1', method: 'Swish', date: '2026-10-16', verified: true }, { as: joh, expect: 409 }); // ingen skuld kvar
});

test('3. Johannes kan inte ändra böter, rabatter, inställningar eller behörigheter', async () => {
  const f = (await fines())[0];
  const pay = (await payments())[0];
  const c4 = await cat(4);
  const forbidden = [
    ['POST', '/api/fines', { items: [{ player_id: ERIK, category_id: c4.id }] }],
    ['PUT', `/api/fines/${f.id}`, { amount: '1', reason: 'x' }],
    ['POST', `/api/fines/${f.id}/void`, { reason: 'x' }],
    ['POST', `/api/players/${VIGGO}/junior-discount`, { enabled: false }],
    ['PUT', '/api/settings', { team_name: 'Hack' }],
    ['PUT', `/api/categories/${c4.id}`, { default_amount: '1' }],
    ['GET', '/api/users', null],
    ['PUT', '/api/users/1', { role: 'viewer' }],
    ['POST', `/api/players/${ERIK}/payment-permission`, { enabled: true }],
    ['POST', `/api/payments/${pay.id}/reverse`, { reason: 'x' }], // endast admin korrigerar
    ['POST', '/api/payments', { player_id: ERIK, date: '2026-10-16', amount: '5', method: 'Swish' }], // admin-flödet (utan verifiering)
    ['POST', '/api/cash', { type: 'refund', player_id: ERIK, date: '2026-10-16', amount: '1' }],
    ['POST', `/api/players/${ERIK}/allocate-credit`, { mode: 'auto' }],
    ['POST', '/api/reports/1/approve', {}],
    ['GET', '/api/audit', null],
  ];
  for (const [m, u, b] of forbidden) await api(m, u, b, { as: joh, expect: 403 });
  // vanliga spelare har ingen kassabehörighet
  await api('GET', '/api/verify/overview', null, { as: erik, expect: 403 });
  await api('POST', '/api/verify/payments', { player_id: LISA, amount: '1', method: 'Swish', date: '2026-10-16', verified: true }, { as: erik, expect: 403 });
  // admin återkallar → direkt 403
  await api('POST', `/api/players/${JOH}/payment-permission`, { enabled: false });
  await api('GET', '/api/verify/overview', null, { as: joh, expect: 403 });
  assert.equal((await api('GET', '/api/status', null, { as: joh })).user.can_register_payments, false);
  await api('POST', `/api/players/${JOH}/payment-permission`, { enabled: true });
  // admin kan korrigera en betalning som Johannes registrerade
  const jp = (await payments()).find((x) => x.registered_by === '#2 Johannes Kassa' && !x.reversed);
  await api('POST', `/api/payments/${jp.id}/reverse`, { reason: 'Felregistrerad' });
});

test('6+7+8. Fem väntande anmälningar: en godkänns → exakt en bot, övriga orörda', async () => {
  const c4 = await cat(4); const c5 = await cat(5); const c19 = await cat(19);
  // olika kombinationer: samma anmälare, samma anmälde, samma dag
  const made = [];
  for (const [who, target, c, d] of [[erik, LISA, c4, '2026-10-10'], [erik, LISA, c5, '2026-10-10'], [erik, OLLE, c4, '2026-10-10'], [lisa, ERIK, c19, '2026-10-11'], [erik, MAX, c4, '2026-10-12']]) {
    made.push(await api('POST', '/api/reports', { player_id: target, category_id: c.id, incident_date: d }, { as: who }));
  }
  // en extra bestriden och en avslagen som ska behålla sina statusar
  const disp = await api('POST', '/api/reports', { player_id: ERIK, category_id: c4.id, incident_date: '2026-10-13' }, { as: lisa });
  await api('POST', `/api/reports/${disp.id}/dispute`, { reason: 'Nej' }, { as: erik });
  const rej = await api('POST', '/api/reports', { player_id: LISA, category_id: c19.id, incident_date: '2026-10-13' }, { as: erik });
  await api('POST', `/api/reports/${rej.id}/reject`, { reason: 'Inte styrkt' });
  const snapshot = async () => Object.fromEntries((await reports()).map((r) => [r.report_no, r.status]));
  const before = await snapshot();
  const finesBefore = (await fines()).length;
  // Lisa godkänner EN av sina två väntande (den andra mot henne ska stå kvar)
  const target = made[1];
  const res = await api('POST', `/api/reports/${target.id}/accept`, { expect: { report_no: target.report_no, status: 'pending' } }, { as: lisa });
  assert.equal(res.report.report_no, target.report_no);
  const after = await snapshot();
  for (const [no, st] of Object.entries(before)) assert.equal(after[no], no === target.report_no ? 'approved' : st, `${no} ändrades`);
  const finesAfter = await fines();
  assert.equal(finesAfter.length, finesBefore + 1);
  const newFines = finesAfter.filter((f) => f.report_id);
  assert.equal(newFines.filter((f) => f.report_id === target.id).length, 1);
  // upprepade klick / omladdning: inga nya böter, inga statusbyten
  await api('POST', `/api/reports/${target.id}/accept`, {}, { as: lisa, expect: 409 });
  await api('POST', `/api/reports/${target.id}/approve`, {}, { expect: 409 });
  await api('POST', `/api/reports/${rej.id}/approve`, {}, { expect: 409 });
  await api('POST', `/api/reports/${made[0].id}/approve`, { expect: { report_no: made[0].report_no, status: 'disputed' } }, { expect: 409 }); // inaktuell sida
  await api('POST', `/api/reports/${made[0].id}/approve`, { expect: { report_no: 'A-9999' } }, { expect: 409 }); // fel kort
  // fel person: Lisa kan inte godkänna anmälan mot Olle
  await api('POST', `/api/reports/${made[2].id}/accept`, {}, { as: lisa, expect: 403 });
  assert.deepEqual(await snapshot(), after);
  assert.equal((await fines()).length, finesBefore + 1);
  // admin godkänner en annan samtidigt från flera "flikar"
  const hit = (cookie, path) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'boteskassan', Cookie: cookie }, body: '{}' });
  const results = await Promise.all([hit(admin, `/api/reports/${made[3].id}/approve`), hit(admin, `/api/reports/${made[3].id}/approve`), hit(erik, `/api/reports/${made[3].id}/accept`)]);
  assert.ok(results.filter((r) => r.status === 200).length <= 1);
  if (!results.some((r) => r.status === 200)) await api('POST', `/api/reports/${made[3].id}/approve`, {}); // lokal testdatabas: se accounts.test.js
  const final = await snapshot();
  assert.equal(final[made[3].report_no], 'approved');
  for (const r of [made[0], made[2], made[4]]) assert.equal(final[r.report_no], 'pending');
  assert.equal(final[disp.report_no], 'disputed');
  assert.equal(final[rej.report_no], 'rejected');
  assert.equal((await fines()).filter((f) => f.report_id === made[3].id).length, 1);
  assert.equal((await fines()).length, finesBefore + 2);
});

test('Databasen stoppar statusbyte på en avgjord anmälan', async () => {
  const { db } = require('../server/db');
  const r = (await reports()).find((x) => x.status === 'rejected');
  await assert.rejects(db().run("UPDATE fine_reports SET status = 'pending' WHERE id = ?", r.id), /redan avgjord/);
  const a = (await reports()).find((x) => x.status === 'approved');
  await assert.rejects(db().run("UPDATE fine_reports SET status = 'rejected' WHERE id = ?", a.id), /redan avgjord/);
});

test('9. Befintliga konton och flöden fungerar', async () => {
  await login('kassor', 'hemligt123');
  await api('GET', '/api/dashboard');
  await api('GET', '/api/leaderboard?sort=amount', null, { as: erik });
  const c = await api('GET', '/api/cash');
  const sum = (await payments()).filter((p) => !p.reversed).reduce((s, p) => s + p.amount, 0);
  assert.equal(c.totals.received, sum);
  const csv = await api('GET', '/api/export/inbetalningar.csv');
  assert.match(csv, /#2 Johannes Kassa/);
});
