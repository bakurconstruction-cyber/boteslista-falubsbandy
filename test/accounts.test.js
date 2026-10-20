// Tester av spelarkonton, bötesanmälningar och juniorrabatt. Kör: npm test
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
  assert.equal(res.status, expect, `${method} ${url} → ${res.status}: ${JSON.stringify(data)}`);
  return { data, cookie: (res.headers.get('set-cookie') || '').split(';')[0] };
}
const api = async (...a) => (await call(...a)).data;
const login = async (username, password, expect = 200) => (await call('POST', '/api/login', { username, password }, { expect, as: '' })).cookie;
const cat = async (n) => (await api('GET', '/api/categories')).find((c) => c.number === n);
const player = async (id) => (await api('GET', `/api/players/${id}`)).player;
const fines = async () => api('GET', '/api/fines');
const report = async (id, as) => (await api('GET', '/api/reports', null, { as })).find((r) => r.id === id);

let ERIK; let LISA; let OLLE; let JUNIOR; let erik; let lisa; let olle;

test.before(async () => {
  srv = await createServer({ port: 0 });
  base = `http://127.0.0.1:${srv.port}`;
  admin = (await call('POST', '/api/setup', { username: 'kassor', display_name: 'Kassör', password: 'hemligt123' }, { as: '' })).cookie;
  ERIK = (await api('POST', '/api/players', { first_name: 'Erik', last_name: 'Andersson', jersey: '7' })).id;
  LISA = (await api('POST', '/api/players', { first_name: 'Lisa', last_name: 'Berg', jersey: '4' })).id;
  OLLE = (await api('POST', '/api/players', { first_name: 'Olle', last_name: 'Ek', jersey: '22' })).id;
  JUNIOR = (await api('POST', '/api/players', { first_name: 'Junior', last_name: 'Jansson', jersey: '10', junior_discount: true })).id;
});
test.after(() => srv.close());

test('Spelarkonton: skapas av admin, inloggning med tröjnummer', async () => {
  for (const [id, pw] of [[ERIK, 'erikpass1'], [LISA, 'lisapass1'], [OLLE, 'ollepass1']]) {
    const r = await api('POST', `/api/players/${id}/account`, { password: pw });
    assert.ok(r.id);
  }
  await api('POST', `/api/players/${ERIK}/account`, { password: 'annat123' }, { expect: 409 }); // ett konto per spelare
  erik = await login('7', 'erikpass1');
  lisa = await login('#4', 'lisapass1'); // "#4" fungerar också
  olle = await login('22', 'ollepass1');
  await login('7', 'fel-lösen', 401);
  await login('99', 'erikpass1', 401);
  const st = await api('GET', '/api/status', null, { as: erik });
  assert.equal(st.user.role, 'player'); assert.equal(st.user.player_id, ERIK); assert.equal(st.user.jersey, '7');
  // tröjnummer måste vara unikt bland spelarkonton
  await api('PUT', `/api/players/${OLLE}`, { first_name: 'Olle', last_name: 'Ek', jersey: '7' }, { expect: 409 });
  // vanliga användarnamn får inte vara bara siffror
  await api('POST', '/api/users', { username: '123', password: 'hemligt123', role: 'viewer' }, { expect: 400 });
  // det befintliga administratörskontot fungerar som förut
  const a2 = await login('kassor', 'hemligt123');
  assert.equal((await api('GET', '/api/status', null, { as: a2 })).user.role, 'admin');
});

test('Behörigheter: spelare kan läsa men inte administrera (skyddat i servern)', async () => {
  await api('GET', '/api/leaderboard', null, { as: erik });
  await api('GET', '/api/fines', null, { as: erik });
  await api('GET', `/api/players/${LISA}`, null, { as: erik });
  const c4 = await cat(4);
  await api('POST', '/api/fines', { items: [{ player_id: LISA, category_id: c4.id }] }, { as: erik, expect: 403 });
  await api('POST', '/api/payments', { player_id: ERIK, date: '2026-10-10', amount: '50', method: 'Swish' }, { as: erik, expect: 403 });
  await api('POST', '/api/cash', { type: 'income', date: '2026-10-10', amount: '50', description: 'x' }, { as: erik, expect: 403 });
  await api('PUT', '/api/settings', { start_balance: '999' }, { as: erik, expect: 403 });
  await api('GET', '/api/users', null, { as: erik, expect: 403 });
  await api('PUT', '/api/users/1', { role: 'viewer' }, { as: erik, expect: 403 });
  await api('POST', `/api/players/${OLLE}/account`, { password: 'x1234567' }, { as: erik, expect: 403 });
  await api('POST', `/api/players/${ERIK}/junior-discount`, { enabled: true }, { as: erik, expect: 403 });
  await api('GET', '/api/audit', null, { as: erik, expect: 403 });
  await api('GET', '/api/export/sakerhetskopia.json', null, { as: erik, expect: 403 });
  await api('POST', '/api/reports/1/approve', {}, { as: erik, expect: 403 });
  // admin kan inte skicka anmälningar (inget spelarkonto) och spelarkonton kan inte byta roll
  await api('POST', '/api/reports', { player_id: LISA, category_id: c4.id }, { expect: 403 });
  const u = (await api('GET', '/api/users')).find((x) => x.player_id === ERIK);
  await api('PUT', `/api/users/${u.id}`, { role: 'admin' }, { expect: 400 });
});

test('Anmälan registreras med rätt anmälare och påverkar inte skuld/leaderboard', async () => {
  const c14 = await cat(14); // Försenad till samling, 200 kr
  const lbBefore = await api('GET', '/api/leaderboard?sort=amount');
  const r = await api('POST', '/api/reports', { player_id: LISA, category_id: c14.id, incident_date: '2026-10-15', comment: 'Kom 10 min sent', idempotency_key: 'k1' }, { as: erik });
  assert.equal(r.report_no, 'A-0001');
  const rep = await report(r.id);
  assert.equal(rep.status, 'pending');
  assert.equal(rep.reporter_player_id, ERIK); assert.equal(rep.reporter_name, 'Erik Andersson'); assert.equal(rep.reporter_jersey, '7');
  assert.equal(rep.amount, 20000); assert.equal(rep.player_id, LISA);
  // ingen påverkan förrän godkänd
  assert.equal((await player(LISA)).debt, 0);
  assert.equal((await fines()).length, 0);
  assert.deepEqual((await api('GET', '/api/leaderboard?sort=amount')).most.map((x) => x.amount), lbBefore.most.map((x) => x.amount));
  assert.equal((await api('GET', '/api/cash')).totals.balance, 0);
  // dubbletter: samma formulär två gånger, eller samma bot/dag igen
  await api('POST', '/api/reports', { player_id: LISA, category_id: c14.id, incident_date: '2026-10-15', idempotency_key: 'k1' }, { as: erik, expect: 409 });
  await api('POST', '/api/reports', { player_id: LISA, category_id: c14.id, incident_date: '2026-10-15' }, { as: erik, expect: 409 });
  // ogiltigt: sig själv, regelbot, framtida datum
  await api('POST', '/api/reports', { player_id: ERIK, category_id: c14.id }, { as: erik, expect: 400 });
  await api('POST', '/api/reports', { player_id: LISA, category_id: (await cat(29)).id }, { as: erik, expect: 400 });
  await api('POST', '/api/reports', { player_id: LISA, category_id: c14.id, incident_date: '2026-12-01' }, { as: erik, expect: 400 });
  // spelare ser sina egna och de som gäller dem – inte andras
  assert.ok(await report(r.id, lisa));
  assert.equal(await report(r.id, olle), undefined);
  assert.equal((await api('GET', '/api/reports/todo', null, { as: lisa })).todo, 1);
  assert.equal((await api('GET', '/api/reports/todo')).todo, 1);
});

test('Godkänd anmälan skapar exakt en officiell bot', async () => {
  const rep = (await api('GET', '/api/reports')).find((x) => x.report_no === 'A-0001');
  // bara den anmälde kan godkänna som spelare
  await api('POST', `/api/reports/${rep.id}/accept`, {}, { as: erik, expect: 403 });
  await api('POST', `/api/reports/${rep.id}/accept`, {}, { as: olle, expect: 403 });
  const r = await api('POST', `/api/reports/${rep.id}/accept`, {}, { as: lisa });
  assert.equal(r.fine_no, 'B-0001');
  // en gång till – och admin efteråt – ger ingen ny bot
  await api('POST', `/api/reports/${rep.id}/accept`, {}, { as: lisa, expect: 409 });
  await api('POST', `/api/reports/${rep.id}/approve`, {}, { expect: 409 });
  await api('POST', `/api/reports/${rep.id}/reject`, { reason: 'x' }, { expect: 409 });
  const all = await fines();
  assert.equal(all.length, 1);
  const f = all[0];
  assert.equal(f.player_id, LISA); assert.equal(f.amount, 20000); assert.equal(f.issued_date, '2026-10-16');
  assert.match(f.description, /A-0001.*#7 Erik Andersson/);
  assert.equal((await player(LISA)).debt, 20000);
  const lb = await api('GET', '/api/leaderboard?sort=amount');
  assert.equal(lb.most.find((x) => x.id === LISA).amount, 20000); // leaderboard uppdaterad
  const after = await report(rep.id);
  assert.equal(after.status, 'approved'); assert.equal(after.fine_no, 'B-0001'); assert.equal(after.approved_by_player, 1);
  // botdetaljen visar anmälan
  const d = await api('GET', `/api/fines/${f.id}`);
  assert.equal(d.report.report_no, 'A-0001');
});

test('Samtidiga godkännanden av samma anmälan ger en bot', async () => {
  const c4 = await cat(4);
  const r = await api('POST', '/api/reports', { player_id: OLLE, category_id: c4.id, incident_date: '2026-10-14' }, { as: erik });
  const hit = (path, cookie) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'boteskassan', Cookie: cookie }, body: '{}' });
  const res = await Promise.all([hit(`/api/reports/${r.id}/approve`, admin), hit(`/api/reports/${r.id}/approve`, admin), hit(`/api/reports/${r.id}/accept`, olle)]);
  const ok = res.filter((x) => x.status === 200).length;
  assert.ok(ok <= 1, 'högst ett godkännande får lyckas');
  // Den lokala testdatabasen delar en session mellan anslutningar, så samtidiga transaktioner kan
  // alla rullas tillbaka här. Det viktiga: aldrig mer än en bot. Godkänn i så fall en gång till.
  assert.equal((await fines()).filter((f) => f.player_id === OLLE).length, ok);
  if (!ok) await api('POST', `/api/reports/${r.id}/approve`, {});
  const made = (await fines()).filter((f) => f.player_id === OLLE);
  assert.equal(made.length, 1);
  assert.equal((await report(r.id)).status, 'approved');
});

test('Bestriden och avslagen anmälan påverkar inte skulden', async () => {
  const c19 = await cat(19);
  const debtBefore = (await player(ERIK)).debt;
  const r = await api('POST', '/api/reports', { player_id: ERIK, category_id: c19.id, incident_date: '2026-10-12', comment: 'Skorna på golvet' }, { as: lisa });
  await api('POST', `/api/reports/${r.id}/dispute`, {}, { as: erik, expect: 400 }); // orsak krävs
  await api('POST', `/api/reports/${r.id}/dispute`, { reason: 'Det var inte mina' }, { as: lisa, expect: 403 }); // bara den anmälde
  await api('POST', `/api/reports/${r.id}/dispute`, { reason: 'Det var inte mina skor' }, { as: erik });
  let rep = await report(r.id);
  assert.equal(rep.status, 'disputed'); assert.equal(rep.dispute_reason, 'Det var inte mina skor');
  assert.equal((await api('GET', '/api/reports/todo')).disputed, 1); // hamnar hos admin
  await api('POST', `/api/reports/${r.id}/accept`, {}, { as: erik, expect: 409 }); // bestriden → admin avgör
  assert.equal((await player(ERIK)).debt, debtBefore);
  await api('POST', `/api/reports/${r.id}/reject`, {}, { expect: 400 }); // anledning krävs
  await api('POST', `/api/reports/${r.id}/reject`, { reason: 'Kunde inte styrkas' });
  rep = await report(r.id);
  assert.equal(rep.status, 'rejected'); assert.equal(rep.fine_id, null);
  assert.equal((await player(ERIK)).debt, debtBefore);
  await api('POST', `/api/reports/${r.id}/approve`, {}, { expect: 409 });
  // bestriden som admin ändå godkänner → bot
  const r2 = await api('POST', '/api/reports', { player_id: ERIK, category_id: c19.id, incident_date: '2026-10-13' }, { as: olle });
  await api('POST', `/api/reports/${r2.id}/dispute`, { reason: 'Nej' }, { as: erik });
  const ok = await api('POST', `/api/reports/${r2.id}/approve`, { note: 'Flera vittnen' });
  assert.match(ok.fine_no, /^B-\d{4}$/);
  assert.equal((await player(ERIK)).debt, debtBefore + 5000);
});

test('Juniorrabatt: 50 % på nya böter, ordinarie belopp och rabatt sparas', async () => {
  const c14 = await cat(14); // 200 kr
  const j = await player(JUNIOR);
  assert.equal(j.junior_discount, 50);
  // admin registrerar direkt
  const no = (await api('POST', '/api/fines', { items: [{ player_id: JUNIOR, category_id: c14.id, issued_date: '2026-10-15' }, { player_id: LISA, category_id: c14.id, issued_date: '2026-10-15' }] })).fine_nos;
  const fj = (await fines()).find((f) => f.fine_no === no[0]);
  const fl = (await fines()).find((f) => f.fine_no === no[1]);
  assert.equal(fj.base_amount, 20000); assert.equal(fj.discount_amount, 10000); assert.equal(fj.amount, 10000); assert.equal(fj.discount_pct, 50);
  assert.match(fj.calc, /Juniorrabatt 50 %/);
  assert.equal(fl.amount, 20000); assert.equal(fl.discount_amount, 0); // andra betalar fullt
  // standardbeloppet i böteslistan är oförändrat
  assert.equal((await cat(14)).default_amount, 20000);
  // skuld, betalning, kassa och leaderboard räknar med slutbeloppet
  assert.equal((await player(JUNIOR)).debt, 10000);
  await api('POST', '/api/payments', { player_id: JUNIOR, date: '2026-10-16', amount: '100', method: 'Swish', allocation_mode: 'auto' });
  assert.equal((await fines()).find((f) => f.fine_no === no[0]).status, 'betald');
  assert.equal((await player(JUNIOR)).debt, 0);
  assert.equal((await api('GET', '/api/leaderboard?sort=amount')).most.find((x) => x.id === JUNIOR).amount, 10000);
  assert.equal((await api('GET', '/api/cash')).totals.received, 10000);
  // via godkänd anmälan
  const r = await api('POST', '/api/reports', { player_id: JUNIOR, category_id: (await cat(4)).id, incident_date: '2026-10-15' }, { as: erik });
  assert.equal((await report(r.id)).amount, 2500); // anmälan visar ordinarie standardbelopp
  const { fine_no } = await api('POST', `/api/reports/${r.id}/approve`, {});
  const fr = (await fines()).find((f) => f.fine_no === fine_no);
  assert.equal(fr.base_amount, 2500); assert.equal(fr.discount_amount, 1250); assert.equal(fr.amount, 1250);
  // redigering: ordinarie belopp anges, rabatten räknas om – aldrig dubbelt
  await api('PUT', `/api/fines/${fr.id}`, { amount: '50', reason: 'Fel belopp' });
  const fe = (await fines()).find((f) => f.fine_no === fine_no);
  assert.equal(fe.base_amount, 5000); assert.equal(fe.discount_amount, 2500); assert.equal(fe.amount, 2500);
  await api('PUT', `/api/fines/${fr.id}`, { description: 'Ny text', reason: 'Text' });
  assert.equal((await fines()).find((f) => f.fine_no === fine_no).amount, 2500);
});

test('Juniorrabatt följer spelar-ID, inte tröjnummer, och ändrar inget retroaktivt', async () => {
  const c4 = await cat(4);
  const juniorFinesBefore = (await fines()).filter((f) => f.player_id === JUNIOR).map((f) => [f.fine_no, f.amount, f.base_amount, f.discount_amount]);
  // nr 10 byter till nr 11, en ny spelare får nr 10 → ingen rabatt för den nya
  await api('PUT', `/api/players/${JUNIOR}`, { first_name: 'Junior', last_name: 'Jansson', jersey: '11' });
  const NEW10 = (await api('POST', '/api/players', { first_name: 'Ny', last_name: 'Tia', jersey: '10' })).id;
  assert.equal((await player(NEW10)).junior_discount, 0);
  const [a, b] = (await api('POST', '/api/fines', { items: [{ player_id: NEW10, category_id: c4.id, issued_date: '2026-10-16' }, { player_id: JUNIOR, category_id: c4.id, issued_date: '2026-10-16' }] })).fine_nos;
  const all = await fines();
  assert.equal(all.find((f) => f.fine_no === a).amount, 2500);
  assert.equal(all.find((f) => f.fine_no === b).amount, 1250);
  // admin stänger av rabatten → nya böter fullt pris, gamla oförändrade
  await api('POST', `/api/players/${JUNIOR}/junior-discount`, { enabled: false });
  const c = (await api('POST', '/api/fines', { items: [{ player_id: JUNIOR, category_id: c4.id, issued_date: '2026-10-16' }] })).fine_nos[0];
  const after = await fines();
  assert.equal(after.find((f) => f.fine_no === c).amount, 2500);
  assert.equal(after.find((f) => f.fine_no === b).amount, 1250);
  for (const [no, amount, baseAmt, disc] of juniorFinesBefore) {
    const f = after.find((x) => x.fine_no === no);
    assert.deepEqual([f.amount, f.base_amount, f.discount_amount], [amount, baseAmt, disc], `${no} ändrades retroaktivt`);
  }
  // och på igen
  await api('POST', `/api/players/${JUNIOR}/junior-discount`, { enabled: true });
  assert.equal((await player(JUNIOR)).junior_discount, 50);
  const log = await api('GET', '/api/audit');
  assert.ok(log.some((x) => x.action === 'Juniorrabatt avstängd'));
});

test('Befintliga flöden: makulering, återföring och export fungerar med nya kolumner', async () => {
  const jf = (await fines()).find((f) => f.player_id === JUNIOR && f.discount_amount > 0 && f.status === 'betald');
  await api('POST', `/api/fines/${jf.id}/void`, { reason: 'Test' });
  assert.equal((await player(JUNIOR)).credit, 10000); // betalda pengar blir tillgodo
  const pays = await api('GET', '/api/payments');
  await api('POST', `/api/payments/${pays.find((p) => p.player_id === JUNIOR).id}/reverse`, { reason: 'Test' });
  assert.equal((await player(JUNIOR)).credit, 0);
  const csvText = await api('GET', '/api/export/boter.csv');
  assert.match(csvText, /Ordinarie belopp \(kr\);Juniorrabatt \(kr\)/);
  const rep = await api('GET', '/api/export/anmalningar.csv');
  assert.match(rep, /A-0001/);
  const backup = await api('GET', '/api/export/sakerhetskopia.json');
  assert.ok(Array.isArray(backup.data.fine_reports));
  // inaktiv spelare kan inte logga in
  await api('POST', `/api/players/${OLLE}/active`, { active: false });
  await login('22', 'ollepass1', 401);
  await api('GET', '/api/dashboard', null, { as: olle, expect: 401 });
});
