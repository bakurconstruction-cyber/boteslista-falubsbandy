// Alla ändringar av data. Varje funktion validerar indata, körs i en transaktion och skriver
// en rad i ändringsloggen. ID:n och nummer skapas här på serversidan.
'use strict';
const { nextNumber, tx } = require('./db');
// Alla exporterade funktioner tar (db, user, …). db = poolen; ändringar körs i egen transaktion via tx().
const L = require('./logic');

class AppError extends Error {
  constructor(message, status = 400, code) { super(message); this.status = status; this.code = code; }
}
const fail = (msg, status, code) => { throw new AppError(msg, status, code); };

// ---------- Hjälpfunktioner för validering ----------
const MAX_AMOUNT = 100000_00; // 100 000 kr
function parseKr(v, field = 'Belopp', { allowZero = false } = {}) {
  if (typeof v === 'number') v = String(v);
  if (typeof v !== 'string') fail(`${field} saknas.`);
  const s = v.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) fail(`${field} måste vara ett belopp i kronor, t.ex. 50 eller 12,50.`);
  const ore = Math.round(parseFloat(s) * 100);
  if (!allowZero && ore <= 0) fail(`${field} måste vara större än 0 kr.`);
  if (ore > MAX_AMOUNT) fail(`${field} är orimligt högt (max 100 000 kr).`);
  return ore;
}
function str(v, field, { max = 500, required = false } = {}) {
  const s = v == null ? '' : String(v).trim();
  if (required && !s) fail(`${field} måste fyllas i.`);
  if (s.length > max) fail(`${field} får vara högst ${max} tecken.`);
  return s;
}
function date(v, field) {
  if (!L.isDate(v)) fail(`${field} måste vara ett giltigt datum (ÅÅÅÅ-MM-DD).`);
  return v;
}
function notFuture(d, field) { if (d > L.todayStr()) fail(`${field} kan inte ligga i framtiden.`); }
function inSeason(season, d, field) {
  if (d < season.start_date || d > season.end_date) fail(`${field} måste ligga inom säsongen ${season.name} (${season.start_date} – ${season.end_date}).`);
}
const kr = (ore) => (ore / 100).toLocaleString('sv-SE', { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 }) + ' kr';
const now = () => new Date().toISOString();
const J = (o) => (o == null ? null : JSON.stringify(o));
// Läsbart namn i loggar och "registrerad av": spelarkonton visas som "#10 Förnamn Efternamn".
const who = (user) => user.label || user.username;

async function audit(db, user, action, entity, entityId, oldV, newV, reason) {
  (await db.run('INSERT INTO audit_log (ts, username, action, entity, entity_id, old_value, new_value, reason) VALUES (?,?,?,?,?,?,?,?)', now(), who(user), action, entity, entityId == null ? null : String(entityId), J(oldV), J(newV), reason || null));
}

async function getPlayer(db, id) {
  const p = (await db.get('SELECT * FROM players WHERE id = ?', String(id || '')));
  if (!p) fail('Spelaren finns inte.', 404);
  return p;
}
async function getFine(db, id) {
  const f = (await db.get('SELECT * FROM fines WHERE id = ?', Number(id)));
  if (!f) fail('Boten finns inte.', 404);
  return f;
}
async function fineAllocated(db, fineId) {
  return (await db.get('SELECT COALESCE(SUM(amount),0)::int s FROM allocations WHERE fine_id = ? AND active = 1', fineId)).s;
}
async function paymentAllocated(db, payId) {
  return (await db.get('SELECT COALESCE(SUM(amount),0)::int s FROM allocations WHERE payment_id = ? AND active = 1', payId)).s;
}
async function playerCredit(db, playerId, seasonId) {
  const paid = (await db.get('SELECT COALESCE(SUM(amount),0)::int s FROM payments WHERE player_id = ? AND season_id = ? AND reversed = 0', playerId, seasonId)).s;
  const refunded = (await db.get("SELECT COALESCE(SUM(amount),0)::int s FROM cash_events WHERE player_id = ? AND season_id = ? AND type = 'refund' AND voided = 0", playerId, seasonId)).s;
  const alloc = (await db.get(`SELECT COALESCE(SUM(a.amount),0)::int s FROM allocations a JOIN payments p ON p.id = a.payment_id
    WHERE p.player_id = ? AND p.season_id = ? AND a.active = 1`, playerId, seasonId)).s;
  return paid - refunded - alloc;
}
async function openFines(db, playerId, seasonId) {
  const rows = await db.all(`SELECT f.*, f.amount - COALESCE((SELECT SUM(a.amount) FROM allocations a WHERE a.fine_id = f.id AND a.active = 1), 0) AS remaining
    FROM fines f WHERE f.player_id = ? AND f.season_id = ? AND f.voided = 0 ORDER BY f.due_date, f.issued_date, f.id`, playerId, seasonId);
  return rows.filter((f) => f.remaining > 0);
}

// ---------- Spelare ----------
function playerInput(body) {
  const first = str(body.first_name, 'Förnamn', { max: 60, required: true });
  const last = str(body.last_name, 'Efternamn', { max: 60, required: true });
  const jersey = str(body.jersey, 'Tröjnummer', { max: 4 });
  if (jersey && !/^\d{1,3}$/.test(jersey)) fail('Tröjnummer måste vara en siffra (0–999).');
  return { first_name: first, last_name: last, jersey: jersey || null, position: str(body.position, 'Position', { max: 40 }) || null, notes: str(body.notes, 'Anteckningar', { max: 2000 }) };
}
async function createPlayer(db, user, body, { isDemo = false } = {}) {
  const p = playerInput(body);
  const n = await nextNumber(db, isDemo ? 'demo_player' : 'player');
  const id = (isDemo ? 'X-S' : 'S-') + String(n).padStart(3, '0');
  const junior = body.junior_discount === true || body.junior_discount === 'on' || Number(body.junior_discount) === 50 ? 50 : 0;
  (await db.run('INSERT INTO players (id, first_name, last_name, jersey, position, notes, active, is_demo, junior_discount, created_at) VALUES (?,?,?,?,?,?,1,?,?,?)', id, p.first_name, p.last_name, p.jersey, p.position, p.notes, isDemo ? 1 : 0, junior, body.created_at || now()));
  await audit(db, user, 'Spelare skapad', 'spelare', id, null, { ...p, ...(junior ? { juniorrabatt: `${junior} %` } : {}) });
  return id;
}
async function updatePlayer(db, user, id, body) {
  return tx(async (db) => {
    const old = await getPlayer(db, id);
    const p = playerInput(body);
    if (p.jersey !== old.jersey) await assertJerseyFreeForLogin(db, old.id, p.jersey);
    (await db.run('UPDATE players SET first_name=?, last_name=?, jersey=?, position=?, notes=? WHERE id=?', p.first_name, p.last_name, p.jersey, p.position, p.notes, old.id));
    await audit(db, user, 'Spelare ändrad', 'spelare', old.id,
      { first_name: old.first_name, last_name: old.last_name, jersey: old.jersey, position: old.position, notes: old.notes }, p);
  });
}
// Spelare loggar in med tröjnumret, så två spelarkonton kan inte ha samma nummer.
async function assertJerseyFreeForLogin(db, playerId, jersey) {
  const hasAccount = await db.get('SELECT 1 AS x FROM users WHERE player_id = ?', playerId);
  if (!hasAccount || !jersey) {
    if (hasAccount && !jersey) fail('Spelaren har ett spelarkonto och loggar in med tröjnumret – tröjnumret kan inte tas bort. Stäng av kontot först.');
    return;
  }
  const clash = await db.get(`SELECT p.first_name, p.last_name FROM players p JOIN users u ON u.player_id = p.id
    WHERE p.jersey = ? AND p.id <> ? AND p.is_demo = 0`, jersey, playerId);
  if (clash) fail(`Tröjnummer ${jersey} används redan för inloggning av ${clash.first_name} ${clash.last_name}. Byt nummer på den spelaren först.`, 409);
}
// Juniorrabatt slås på/av per spelare (spelar-ID). Påverkar bara böter som blir officiella efter ändringen.
async function setJuniorDiscount(db, user, id, enabled) {
  return tx(async (db) => {
    const p = await getPlayer(db, id);
    const pct = enabled ? 50 : 0;
    if (p.junior_discount === pct) return;
    (await db.run('UPDATE players SET junior_discount = ? WHERE id = ?', pct, p.id));
    await audit(db, user, enabled ? 'Juniorrabatt aktiverad' : 'Juniorrabatt avstängd', 'spelare', p.id,
      { juniorrabatt: `${p.junior_discount} %` }, { juniorrabatt: `${pct} %`, gäller: 'nya böter – befintliga böter ändras inte' });
  });
}
async function setPlayerActive(db, user, id, active) {
  return tx(async (db) => {
    const old = await getPlayer(db, id);
    (await db.run('UPDATE players SET active = ? WHERE id = ?', active ? 1 : 0, old.id));
    await audit(db, user, active ? 'Spelare aktiverad' : 'Spelare inaktiverad', 'spelare', old.id, { active: old.active }, { active: active ? 1 : 0 });
  });
}
async function deletePlayer(db, user, id) {
  return tx(async (db) => {
    const p = await getPlayer(db, id);
    const used = (await db.get('SELECT ((SELECT COUNT(*) FROM fines WHERE player_id=?) + (SELECT COUNT(*) FROM payments WHERE player_id=?) + (SELECT COUNT(*) FROM cash_events WHERE player_id=?))::int n', p.id, p.id, p.id)).n;
    if (used) fail('Spelaren har böter eller betalningar och kan inte tas bort. Inaktivera spelaren i stället – historiken sparas då.', 409);
    (await db.run('DELETE FROM players WHERE id = ?', p.id));
    await audit(db, user, 'Spelare borttagen', 'spelare', p.id, { name: `${p.first_name} ${p.last_name}` }, null);
  });
}
// CSV-import: kolumner förnamn;efternamn;tröjnummer;position;anteckningar (rubrikrad valfri)
async function importPlayers(db, user, text) {
  if (typeof text !== 'string' || !text.trim()) fail('CSV-filen är tom.');
  if (text.length > 200_000) fail('Filen är för stor.');
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const parse = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === delim) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out.map((s) => s.trim());
  };
  let rows = lines.map(parse);
  if (/f[öo]rnamn|first/i.test(rows[0][0] || '')) rows = rows.slice(1);
  const result = { created: [], skipped: [], errors: [] };
  if (rows.length > 300) fail('Max 300 rader per import.');
  return tx(async (db) => {
    const existing = new Set((await db.all("SELECT lower(first_name||' '||last_name) n FROM players WHERE is_demo = 0")).map((r) => r.n));
    for (const [i, r] of rows.entries()) {
      const lineNo = i + 1;
      try {
        const body = { first_name: r[0], last_name: r[1], jersey: r[2], position: r[3], notes: r[4] };
        const key = `${(r[0] || '').toLowerCase()} ${(r[1] || '').toLowerCase()}`;
        if (existing.has(key)) { result.skipped.push(`Rad ${lineNo}: ${r[0]} ${r[1]} finns redan`); continue; }
        const id = await createPlayer(db, user, body);
        existing.add(key); result.created.push(`${id} ${r[0]} ${r[1]}`);
      } catch (e) {
        if (!(e instanceof AppError)) throw e;
        result.errors.push(`Rad ${lineNo}: ${e.message}`);
      }
    }
    return result;
  });
}

// ---------- Kategorier ----------
async function updateCategory(db, user, id, body) {
  return tx(async (db) => {
    const c = (await db.get('SELECT * FROM categories WHERE id = ?', Number(id)));
    if (!c) fail('Kategorin finns inte.', 404);
    const name = str(body.name ?? c.name, 'Namn', { max: 80, required: true });
    const amount = ['stick', 'planted'].includes(c.kind) ? 0 : parseKr(body.default_amount ?? String(c.default_amount / 100), 'Standardbelopp');
    const active = body.active == null ? c.active : body.active ? 1 : 0;
    (await db.run('UPDATE categories SET name=?, default_amount=?, active=? WHERE id=?', name, amount, active, c.id));
    await audit(db, user, 'Böteskategori ändrad', 'kategori', c.number,
      { name: c.name, default_amount: kr(c.default_amount), active: c.active }, { name, default_amount: kr(amount), active }, body.reason);
  });
}

// ---------- Böter ----------
const RULE_KINDS = { no_fines: 22, least_fines: 23, late: 29 };
// Skapar en bot (anropas inom en transaktion). Returnerar bötesnumret.
async function insertFine(db, user, season, input, { isDemo = false, ruleKey = null, allowRuleKind = false, fixedAmount = null, reportId = null } = {}) {
  const player = await getPlayer(db, input.player_id);
  isDemo = isDemo || !!player.is_demo; // böter till exempelspelare blir automatiskt exempeldata
  if (!player.active && !isDemo) fail(`${player.first_name} ${player.last_name} är inaktiv. Aktivera spelaren för att registrera nya böter.`);
  const cat = (await db.get('SELECT * FROM categories WHERE id = ?', Number(input.category_id)));
  if (!cat) fail('Välj en böteskategori.');
  if (!cat.active) fail(`Kategorin "${cat.name}" är inaktiverad.`);
  if (RULE_KINDS[cat.kind] && !allowRuleKind) fail(`Bot nr ${cat.number} registreras via sidan Regler så att dubbletter undviks.`);
  const issued = date(input.issued_date || L.todayStr(), 'Datum');
  if (!isDemo) notFuture(issued, 'Datum');
  inSeason(season, issued, 'Datum');
  const due = input.due_date ? date(input.due_date, 'Sista betalningsdag') : L.defaultDueDate(issued);
  if (due < issued) fail('Sista betalningsdag kan inte vara före utfärdandedatum.');
  let quantity = 1;
  if (cat.kind === 'per_item') {
    quantity = Number(input.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 30) fail('Antal måste vara ett heltal mellan 1 och 30.');
  }
  let amount; let calc = null; let refId = null;
  let description = str(input.description, 'Beskrivning', { max: 500 });
  if (cat.kind === 'stick') {
    const value = parseKr(input.stick_value, 'Klubbans värde');
    const cost = parseKr(input.new_stick_cost, 'Kostnad för ny klubba', { allowZero: true });
    amount = Math.round(value / 2) + cost;
    calc = `50 % av ${kr(value)} = ${kr(Math.round(value / 2))} + ny klubba ${kr(cost)} = ${kr(amount)}`;
  } else if (cat.kind === 'planted') {
    const no = str(input.ref_fine_no, 'Ursprungligt bötesnummer', { required: true, max: 20 }).toUpperCase();
    const ref = (await db.get('SELECT * FROM fines WHERE fine_no = ?', no));
    if (!ref) fail(`Bötesnummer ${no} finns inte.`);
    if (ref.voided) fail(`${no} är makulerad och kan inte användas som planterad bot.`);
    if (ref.is_demo && !isDemo) fail(`${no} är exempeldata och kan inte användas för en riktig spelare.`);
    if (ref.kind === 'planted') fail(`${no} är själv en planterad bot. Ange den ursprungliga boten.`);
    amount = ref.base_amount ?? ref.amount; refId = ref.id; // ordinarie belopp, inte en annan spelares rabatterade
    calc = `Samma belopp som ${ref.fine_no} (${ref.category_name}): ${kr(amount)}`;
  } else if (fixedAmount != null) {
    amount = fixedAmount; // från en godkänd anmälan: standardbeloppet som gällde när den skickades in
    if (quantity > 1) calc = `${quantity} × ${kr(Math.round(amount / quantity))} = ${kr(amount)}`;
  } else {
    const standard = cat.default_amount * quantity;
    amount = input.amount != null && input.amount !== '' ? parseKr(input.amount) : standard;
    if (amount !== standard) calc = `Standardbelopp ${kr(standard)} ändrat till ${kr(amount)}`;
    else if (quantity > 1) calc = `${quantity} × ${kr(cat.default_amount)} = ${kr(amount)}`;
  }
  if (amount <= 0) fail('Bötesbeloppet måste vara större än 0 kr.');
  if (amount > MAX_AMOUNT) fail('Bötesbeloppet är orimligt högt.');
  // Juniorrabatt: räknas en gång, när boten blir officiell, på spelarens ordinarie belopp.
  // Undantag: kategorier markerade junior_exempt (Avslagen klubba) kostar alltid fullt belopp.
  const d = juniorDiscount(amount, player, cat);
  if (d.discount) calc = (calc ? calc + ' · ' : '') + `Juniorrabatt ${d.pct} %: ${kr(amount)} − ${kr(d.discount)} = ${kr(d.final)}`;
  else if (d.exempt) calc = (calc ? calc + ' · ' : '') + `Juniorrabatt gäller inte ${cat.name}: fullt belopp ${kr(amount)}`;
  const no = isDemo ? 'X-' + String(await nextNumber(db, 'demo_fine')).padStart(4, '0') : 'B-' + String(await nextNumber(db, 'fine')).padStart(4, '0');
  try {
    (await db.run(`INSERT INTO fines (fine_no, season_id, player_id, category_id, category_name, category_number, kind, issued_date, due_date,
      description, quantity, amount, base_amount, discount_amount, discount_pct, report_id, ref_fine_id, rule_key, calc, registered_by, is_demo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, no, season.id, player.id, cat.id, cat.name, cat.number, cat.kind, issued, due, description, quantity, d.final, amount, d.discount, d.pct, reportId, refId, ruleKey, calc, who(user), isDemo ? 1 : 0, now()));
  } catch (e) {
    if (e.code === '23505' && reportId) fail('Anmälan har redan blivit en bot.', 409, 'already_decided');
    if (e.code === '23505' && ruleKey) fail(`${player.first_name} ${player.last_name} har redan fått bot nr ${cat.number} för denna period.`, 409, 'duplicate_rule');
    throw e;
  }
  await audit(db, user, 'Bot registrerad', 'bot', no, null, { spelare: `${player.first_name} ${player.last_name}`, kategori: `${cat.number}. ${cat.name}`, belopp: kr(d.final), ...(d.discount ? { ordinarie: kr(amount), juniorrabatt: kr(d.discount) } : {}), datum: issued, förfaller: due, beskrivning: description, beräkning: calc });
  return no;
}
// Den enda platsen där juniorrabatt bestäms för en ny bot.
function juniorDiscount(base, player, cat) {
  const pct = Number(player.junior_discount) || 0;
  if (pct > 0 && cat.junior_exempt) return { final: base, discount: 0, pct: 0, exempt: true };
  return { ...discountFor(base, pct), exempt: false };
}
function discountFor(base, pct) {
  pct = Number(pct) || 0;
  if (pct <= 0) return { final: base, discount: 0, pct: 0 };
  const discount = Math.floor((base * pct) / 100); // avrundas nedåt → spelaren betalar aldrig 0 kr
  return { final: base - discount, discount, pct };
}
async function createFines(db, user, season, items) {
  if (!Array.isArray(items) || !items.length) fail('Inga böter att registrera.');
  if (items.length > 60) fail('Max 60 böter åt gången.');
  return tx(async (db) => {
    const out = [];
    for (const it of items) out.push(await insertFine(db, user, season, it));
    return out;
  });
}
async function editFine(db, user, season, id, body) {
  return tx(async (db) => {
    const f = await getFine(db, id);
    if (f.voided) fail('En makulerad bot kan inte ändras.');
    const reason = str(body.reason, 'Anledning', { required: true, max: 300 });
    const issued = date(body.issued_date ?? f.issued_date, 'Datum');
    inSeason(season, issued, 'Datum');
    const due = date(body.due_date ?? f.due_date, 'Sista betalningsdag');
    if (due < issued) fail('Sista betalningsdag kan inte vara före utfärdandedatum.');
    const description = str(body.description ?? f.description, 'Beskrivning', { max: 500 });
    // För en bot med juniorrabatt anges ordinarie belopp; rabatten (samma procent som när boten
    // utfärdades) räknas om – den läggs aldrig på en gång till.
    const base = body.amount != null && body.amount !== '' ? parseKr(body.amount) : (f.base_amount ?? f.amount);
    const d = f.discount_pct > 0 ? discountFor(base, f.discount_pct) : { final: base, discount: 0, pct: 0 };
    const amount = d.final;
    const paid = await fineAllocated(db, f.id);
    if (amount < paid) fail(`Beloppet kan inte sättas lägre än det som redan betalats mot boten (${kr(paid)}). Återför eller flytta betalningen först.`);
    if (f.kind === 'planted' && amount !== f.amount) fail('Beloppet för en planterad bot hämtas från den ursprungliga boten och kan inte ändras.');
    const changes = {}; const old = {};
    for (const [k, v] of Object.entries({ issued_date: issued, due_date: due, description, amount })) {
      if (v !== f[k]) { old[k] = k === 'amount' ? kr(f[k]) : f[k]; changes[k] = k === 'amount' ? kr(v) : v; }
    }
    if (!Object.keys(changes).length) fail('Inga ändringar att spara.');
    if (d.discount && changes.amount) { old.ordinarie = kr(f.base_amount ?? f.amount); changes.ordinarie = kr(base); changes.juniorrabatt = kr(d.discount); }
    (await db.run('UPDATE fines SET issued_date=?, due_date=?, description=?, amount=?, base_amount=?, discount_amount=? WHERE id=?', issued, due, description, amount, f.base_amount == null && !d.discount ? null : base, d.discount, f.id));
    await audit(db, user, 'Bot ändrad', 'bot', f.fine_no, old, changes, reason);
  });
}
async function voidFine(db, user, id, body) {
  return tx(async (db) => {
    const f = await getFine(db, id);
    if (f.voided) fail('Boten är redan makulerad.');
    const reason = str(body.reason, 'Anledning till makulering', { required: true, max: 300 });
    const released = (await db.get('SELECT COALESCE(SUM(amount),0)::int s FROM allocations WHERE fine_id = ? AND active = 1', f.id)).s;
    (await db.run('UPDATE allocations SET active = 0, released_at = ?, release_reason = ? WHERE fine_id = ? AND active = 1', now(), 'Boten makulerades', f.id));
    (await db.run('UPDATE fines SET voided = 1, void_reason = ?, voided_at = ?, voided_by = ? WHERE id = ?', reason, now(), user.username, f.id));
    await audit(db, user, 'Bot makulerad', 'bot', f.fine_no, { status: 'aktiv', belopp: kr(f.amount) }, { status: 'makulerad', frigjort_till_tillgodohavande: kr(released) }, reason);
    return { released };
  });
}

// ---------- Inbetalningar ----------
const METHODS = ['Swish', 'Banköverföring', 'Kontant', 'Annat'];
async function allocate(db, payment, items) {
  let left = payment.amount - await paymentAllocated(db, payment.id);
  let total = 0;
  for (const it of items) {
    if (it.amount <= 0) continue;
    const f = (await db.get('SELECT * FROM fines WHERE id = ?', it.fine_id));
    if (!f || f.player_id !== payment.player_id) fail('Boten tillhör inte spelaren.');
    if (f.voided) fail(`${f.fine_no} är makulerad.`);
    const remaining = f.amount - await fineAllocated(db, f.id);
    if (it.amount > remaining) fail(`${f.fine_no}: du försöker fördela ${kr(it.amount)} men bara ${kr(remaining)} återstår.`);
    if (it.amount > left) fail('Fördelningen överstiger det tillgängliga beloppet.');
    (await db.run('INSERT INTO allocations (payment_id, fine_id, amount, created_at) VALUES (?,?,?,?)', payment.id, f.id, it.amount, now()));
    left -= it.amount; total += it.amount;
  }
  return total;
}
async function autoItems(db, playerId, seasonId, amount) {
  const items = [];
  for (const f of await openFines(db, playerId, seasonId)) {
    if (amount <= 0) break;
    const a = Math.min(amount, f.remaining);
    items.push({ fine_id: f.id, amount: a, fine_no: f.fine_no }); amount -= a;
  }
  return items;
}
async function manualItems(db, list) {
  if (!Array.isArray(list)) fail('Ogiltig fördelning.');
  return list.map((x) => ({ fine_id: Number(x.fine_id), amount: x.amount === '' || x.amount == null ? 0 : parseKr(x.amount, 'Fördelat belopp', { allowZero: true }) })).filter((x) => x.amount > 0);
}
async function createPayment(db, user, season, body, opts = {}) {
  return tx((t) => createPaymentTx(t, user, season, body, opts));
}
async function createPaymentTx(db, user, season, body, { isDemo = false } = {}) {
  {
    const player = await getPlayer(db, body.player_id);
    isDemo = isDemo || !!player.is_demo;
    const d = date(body.date, 'Betalningsdatum');
    if (!isDemo) notFuture(d, 'Betalningsdatum');
    inSeason(season, d, 'Betalningsdatum');
    const amount = parseKr(body.amount);
    const method = str(body.method, 'Betalningsmetod', { required: true, max: 30 });
    if (!METHODS.includes(method)) fail('Ogiltig betalningsmetod.');
    const reference = str(body.reference, 'Referens', { max: 120 });
    const comment = str(body.comment, 'Kommentar', { max: 500 });
    const key = body.idempotency_key ? str(body.idempotency_key, 'Nyckel', { max: 80 }) : null;
    if (key) {
      const ex = (await db.get('SELECT payment_no FROM payments WHERE idempotency_key = ?', key));
      if (ex) fail(`Betalningen är redan registrerad (${ex.payment_no}). Ingen dubblett skapades.`, 409, 'already_registered');
    }
    if (!body.confirm_duplicate) {
      const dup = (await db.get('SELECT payment_no FROM payments WHERE player_id=? AND date=? AND amount=? AND reversed=0', player.id, d, amount));
      if (dup) fail(`Det finns redan en inbetalning från ${player.first_name} ${player.last_name} på ${kr(amount)} samma dag (${dup.payment_no}). Är det en ny betalning?`, 409, 'possible_duplicate');
    }
    const no = isDemo ? 'X-I' + String(await nextNumber(db, 'demo_payment')).padStart(4, '0') : 'I-' + String(await nextNumber(db, 'payment')).padStart(4, '0');
    const payment = await db.get(`INSERT INTO payments (payment_no, season_id, player_id, date, amount, method, reference, comment, idempotency_key, registered_by, is_demo, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`, no, season.id, player.id, d, amount, method, reference, comment, key, who(user), isDemo ? 1 : 0, now());
    const mode = body.allocation_mode || 'auto';
    const items = mode === 'manual' ? await manualItems(db, body.allocations) : mode === 'none' ? [] : await autoItems(db, player.id, season.id, amount);
    const allocated = await allocate(db, payment, items);
    const credit = amount - allocated;
    await audit(db, user, body.verified ? 'Verifierad inbetalning registrerad' : 'Inbetalning registrerad', 'betalning', no, null, { spelare: `${player.first_name} ${player.last_name}`, datum: d, belopp: kr(amount), metod: method, referens: reference, fördelat: kr(allocated), tillgodo: kr(credit), ...(body.verified ? { verifierad: 'ja – pengarna kontrollerade' } : {}) });
    return { payment_no: no, allocated, credit };
  }
}
// Betalning registrerad av en spelare med kassabehörighet (t.ex. Johannes). Strängare än admin:
// pengarna måste vara kontrollerade, beloppet får inte överstiga skulden (inga tillgodohavanden),
// fördelning sker alltid mot obetalda böter (äldst först) och man kan inte registrera sin egen betalning.
const VERIFY_METHODS = ['Swish', 'Banköverföring', 'Kontant'];
async function createVerifiedPaymentTx(db, user, season, body) {
  if (body.verified !== true) fail('Bekräfta att du har kontrollerat att pengarna har kommit in.');
  if (user.role === 'player' && String(body.player_id) === user.player_id) fail('Du kan inte registrera din egen betalning. Be administratören.', 403);
  if (!VERIFY_METHODS.includes(body.method)) fail('Välj Swish, banköverföring eller kontant.');
  const amount = parseKr(body.amount);
  const st = await L.loadState(db, season);
  const p = st.playerById.get(String(body.player_id || ''));
  if (!p || p.is_demo) fail('Spelaren finns inte.', 404);
  if (p.debt <= 0) fail(`${p.name} har ingen obetald skuld.`, 409, 'no_debt');
  if (amount > p.debt) fail(`Beloppet (${kr(amount)}) är större än skulden (${kr(p.debt)}). Överskott hanteras av administratören.`);
  if (body.mode === 'full' && amount !== p.debt) fail('Skulden har ändrats sedan sidan laddades. Ladda om och försök igen.', 409, 'debt_changed');
  return createPaymentTx(db, user, season, {
    player_id: p.id, date: body.date, amount: String(amount / 100), method: body.method, reference: body.reference,
    comment: str(body.comment, 'Kommentar', { max: 300 }) || (body.mode === 'full' ? 'Hela skulden – verifierad' : 'Delbetalning – verifierad'),
    idempotency_key: body.idempotency_key, confirm_duplicate: !!body.confirm_duplicate, allocation_mode: 'auto', verified: true,
  });
}
// Administratören ger eller återkallar kassabehörighet. Kopplad till spelar-ID.
async function setPaymentPermission(db, user, id, enabled) {
  return tx(async (db) => {
    const p = await getPlayer(db, id);
    if (p.is_demo) fail('Exempelspelare kan inte få behörighet.');
    const v = enabled ? 1 : 0;
    if (p.can_register_payments === v) return;
    (await db.run('UPDATE players SET can_register_payments = ? WHERE id = ?', v, p.id));
    await audit(db, user, enabled ? 'Kassabehörighet given' : 'Kassabehörighet återkallad', 'spelare', p.id, { kassabehörighet: !!p.can_register_payments }, { kassabehörighet: !!v });
  });
}
async function allocateCredit(db, user, season, playerId, body) {
  return tx(async (db) => {
    const player = await getPlayer(db, playerId);
    const credit = await playerCredit(db, player.id, season.id);
    if (credit <= 0) fail('Spelaren har inget tillgodohavande att fördela.');
    const items = body.mode === 'manual' ? await manualItems(db, body.allocations) : await autoItems(db, player.id, season.id, credit);
    const want = items.reduce((s, i) => s + i.amount, 0);
    if (!want) fail('Det finns inga obetalda böter att fördela tillgodohavandet på.');
    if (want > credit) fail(`Du kan fördela högst ${kr(credit)}.`);
    // Pengarna tas från spelarens inbetalningar som har ofördelat belopp, äldst först.
    const sources = (await db.all('SELECT * FROM payments WHERE player_id = ? AND season_id = ? AND reversed = 0 ORDER BY date, id', player.id, season.id));
    let total = 0;
    for (const it of items) {
      let need = it.amount;
      for (const s of sources) {
        if (need <= 0) break;
        const free = s.amount - await paymentAllocated(db, s.id);
        if (free <= 0) continue;
        const a = Math.min(free, need);
        await allocate(db, s, [{ fine_id: it.fine_id, amount: a }]);
        need -= a; total += a;
      }
    }
    await audit(db, user, 'Tillgodohavande fördelat', 'spelare', player.id, { tillgodo: kr(credit) }, { fördelat: kr(total), tillgodo: kr(credit - total) });
    return { allocated: total };
  });
}
async function reversePayment(db, user, season, id, body) {
  return tx(async (db) => {
    const p = (await db.get('SELECT * FROM payments WHERE id = ?', Number(id)));
    if (!p) fail('Betalningen finns inte.', 404);
    if (p.reversed) fail('Betalningen är redan återförd.');
    const reason = str(body.reason, 'Anledning', { required: true, max: 300 });
    const allocated = await paymentAllocated(db, p.id);
    const credit = await playerCredit(db, p.player_id, season.id);
    if (credit - (p.amount - allocated) < 0) fail('Delar av denna betalning har redan återbetalats till spelaren. Makulera återbetalningen i kassan först.', 409);
    (await db.run('UPDATE allocations SET active = 0, released_at = ?, release_reason = ? WHERE payment_id = ? AND active = 1', now(), 'Betalningen återfördes', p.id));
    (await db.run('UPDATE payments SET reversed = 1, reverse_reason = ?, reversed_at = ?, reversed_by = ? WHERE id = ?', reason, now(), user.username, p.id));
    await audit(db, user, 'Inbetalning återförd', 'betalning', p.payment_no, { status: 'aktiv', belopp: kr(p.amount), fördelat: kr(allocated) }, { status: 'återförd' }, reason);
  });
}

// ---------- Kassa ----------
async function createCashEvent(db, user, season, body, { isDemo = false } = {}) {
  return tx(async (db) => {
    const type = body.type;
    if (!['income', 'expense', 'refund'].includes(type)) fail('Ogiltig typ av kassahändelse.');
    const d = date(body.date, 'Datum');
    if (!isDemo) notFuture(d, 'Datum');
    inSeason(season, d, 'Datum');
    const amount = parseKr(body.amount);
    let description = str(body.description, 'Beskrivning', { required: type !== 'refund', max: 300 });
    let playerId = null;
    if (type === 'refund') {
      const player = await getPlayer(db, body.player_id);
      const credit = await playerCredit(db, player.id, season.id);
      if (amount > credit) fail(`Återbetalningen (${kr(amount)}) är större än spelarens tillgodohavande (${kr(Math.max(0, credit))}).`);
      playerId = player.id; description = description || 'Återbetalning av tillgodohavande';
      isDemo = isDemo || !!player.is_demo;
    }
    const no = isDemo ? 'X-K' + String(await nextNumber(db, 'demo_cash')).padStart(4, '0') : 'K-' + String(await nextNumber(db, 'cash')).padStart(4, '0');
    (await db.run('INSERT INTO cash_events (event_no, season_id, type, date, amount, description, player_id, registered_by, is_demo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', no, season.id, type, d, amount, description, playerId, user.username, isDemo ? 1 : 0, now()));
    const label = { income: 'Övrig inkomst', expense: 'Utgift', refund: 'Återbetalning' }[type];
    await audit(db, user, `${label} registrerad`, 'kassa', no, null, { datum: d, belopp: kr(amount), beskrivning: description, spelare: playerId });
    return no;
  });
}
async function voidCashEvent(db, user, id, body) {
  return tx(async (db) => {
    const c = (await db.get('SELECT * FROM cash_events WHERE id = ?', Number(id)));
    if (!c) fail('Kassahändelsen finns inte.', 404);
    if (c.voided) fail('Händelsen är redan makulerad.');
    const reason = str(body.reason, 'Anledning', { required: true, max: 300 });
    (await db.run('UPDATE cash_events SET voided = 1, void_reason = ? WHERE id = ?', reason, c.id));
    await audit(db, user, 'Kassahändelse makulerad', 'kassa', c.event_no, { status: 'aktiv', belopp: kr(c.amount) }, { status: 'makulerad' }, reason);
  });
}

// ---------- Regler 22, 23, 29 ----------
async function catByNumber(db, n) { return (await db.get('SELECT * FROM categories WHERE number = ?', n)); }
async function applyRule(db, user, season, rule, body) {
  const settings = await L.getSettings(db);
  const ids = Array.isArray(body.player_ids) ? body.player_ids.map(String) : [];
  if (!ids.length) fail('Välj minst en spelare.');
  return tx(async (db) => {
    const st = await L.loadState(db, season);
    const out = [];
    if (rule === '29') {
      if (settings.rule29_enabled !== '1') fail('Regel 29 är avstängd under Inställningar.');
      if (!L.isMonth(body.period)) fail('Ange betalningsperiod (ÅÅÅÅ-MM).');
      const cand = L.rule29Candidates(st, body.period, settings);
      if (!cand.ended) fail(`Perioden ${body.period} är inte slut än. Förseningsbot kan registreras först efter ${cand.deadline}.`);
      for (const id of ids) {
        const c = cand.rows.find((r) => r.player_id === id);
        if (!c) fail('Spelaren hade ingen förfallen skuld vid periodens slut.');
        if (c.existing) fail(`${c.name} har redan förseningsbot för ${body.period} (${c.existing}).`, 409, 'duplicate_rule');
        out.push(await insertFine(db, user, season, { player_id: id, category_id: (await catByNumber(db, 29)).id, issued_date: L.todayStr(), description: `Ej betalat senast ${cand.deadline} (skuld då: ${kr(c.owed)})` }, { ruleKey: `R29:${body.period}`, allowRuleKind: true, isDemo: !!c.is_demo }));
      }
    } else if (rule === '22') {
      if (settings.rule22_enabled !== '1') fail('Regel 22 är avstängd under Inställningar.');
      const cand = L.rule22Candidates(st, settings);
      for (const id of ids) {
        const c = cand.rows.find((r) => r.player_id === id);
        if (!c || !c.eligible) fail('Spelaren uppfyller inte villkoret för regel 22 just nu.');
        out.push(await insertFine(db, user, season, { player_id: id, category_id: (await catByNumber(db, 22)).id, issued_date: L.todayStr(), description: `Inga böter ${c.period_start} – ${c.period_end}` }, { ruleKey: c.rule_key, allowRuleKind: true, isDemo: !!c.is_demo }));
      }
    } else if (rule === '23') {
      if (settings.rule23_enabled !== '1') fail('Regel 23 är avstängd under Inställningar.');
      const r23 = L.rule23Ranking(st, settings);
      const issued = r23.season_over ? (L.todayStr() > season.end_date ? season.end_date : L.todayStr()) : L.todayStr();
      for (const id of ids) {
        const c = r23.ranking.find((r) => r.id === id);
        if (!c) fail('Spelaren finns inte bland aktiva spelare.');
        if (c.existing) fail(`${c.name} har redan fått bot nr 23 denna säsong (${c.existing}).`, 409, 'duplicate_rule');
        out.push(await insertFine(db, user, season, { player_id: id, category_id: (await catByNumber(db, 23)).id, issued_date: issued, description: `Minst böter säsongen ${season.name} (${kr(c.amount)})` }, { ruleKey: `R23:${season.id}`, allowRuleKind: true, isDemo: !!c.is_demo }));
      }
    } else fail('Okänd regel.');
    return out;
  });
}

// ---------- Månadsavstämning ----------
async function closeMonth(db, user, season, period, body) {
  if (!L.isMonth(period)) fail('Ogiltig månad.');
  return tx(async (db) => {
    const ex = (await db.get('SELECT * FROM month_closings WHERE season_id = ? AND period = ?', season.id, period));
    if (body.reopen) {
      if (!ex) fail('Månaden är inte avstämd.');
      const reason = str(body.reason, 'Anledning', { required: true, max: 300 });
      (await db.run('DELETE FROM month_closings WHERE season_id = ? AND period = ?', season.id, period));
      await audit(db, user, 'Månadsavstämning ångrad', 'månad', period, ex, null, reason);
      return;
    }
    if (ex) fail('Månaden är redan avstämd.');
    const note = str(body.note, 'Anteckning', { max: 500 });
    (await db.run('INSERT INTO month_closings (season_id, period, closed_by, closed_at, note) VALUES (?,?,?,?,?)', season.id, period, user.username, now(), note));
    await audit(db, user, 'Månad avstämd', 'månad', period, null, { note });
  });
}

// ---------- Inställningar & säsong ----------
// Swish-nummer: privat mobilnummer (07…) eller företags-/föreningsnummer (123…, 9…). Sparas som siffror.
function swishNumber(v) {
  const s = String(v || '').replace(/[\s-]/g, '').replace(/^\+46/, '0').replace(/^46(?=7)/, '0');
  if (!s) return '';
  if (!/^(07\d{8}|123\d{7}|9\d{9})$/.test(s)) fail('Swish-numret ska vara ett mobilnummer (07X XXX XX XX) eller ett Swish-företagsnummer (123 XXX XX XX).');
  return s;
}
async function updateSettings(db, user, body) {
  return tx(async (db) => {
    const old = await L.getSettings(db);
    const next = {};
    if (body.team_name != null) next.team_name = str(body.team_name, 'Lagnamn', { max: 80, required: true });
    if (body.payment_info != null) next.payment_info = str(body.payment_info, 'Betalningsinformation', { max: 300, required: true });
    if (body.swish_number != null) next.swish_number = swishNumber(body.swish_number);
    if (body.swish_name != null) next.swish_name = str(body.swish_name, 'Mottagarens namn', { max: 50 });
    if (body.start_balance != null) next.start_balance = String(parseKr(String(body.start_balance), 'Startsaldo', { allowZero: true }));
    for (const k of ['rule22_enabled', 'rule23_enabled', 'rule29_enabled']) if (body[k] != null) next[k] = body[k] ? '1' : '0';
    if (body.rule22_days != null) {
      const d = Number(body.rule22_days);
      if (!Number.isInteger(d) || d < 7 || d > 60) fail('Antal dagar för regel 22 måste vara 7–60.');
      next.rule22_days = String(d);
    }
    const oldV = {}; const newV = {};
    for (const [k, v] of Object.entries(next)) {
      if (old[k] !== v) { oldV[k] = old[k]; newV[k] = v; (await db.run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, v)); }
    }
    if (Object.keys(newV).length) await audit(db, user, 'Inställningar ändrade', 'inställningar', null, oldV, newV, body.reason);
  });
}
async function updateSeason(db, user, body) {
  return tx(async (db) => {
    const s = await L.activeSeason(db);
    const start = date(body.start_date, 'Säsongsstart'); const end = date(body.end_date, 'Säsongsslut');
    if (end <= start) fail('Säsongsslut måste vara efter säsongsstart.');
    const outside = (await db.get('SELECT COUNT(*)::int n FROM fines WHERE season_id = ? AND (issued_date < ? OR issued_date > ?)', s.id, start, end)).n
      + (await db.get('SELECT COUNT(*)::int n FROM payments WHERE season_id = ? AND (date < ? OR date > ?)', s.id, start, end)).n;
    if (outside) fail('Det finns registreringar utanför de nya datumen. Justera inte säsongen så att historik hamnar utanför.');
    (await db.run('UPDATE seasons SET start_date = ?, end_date = ? WHERE id = ?', start, end, s.id));
    await audit(db, user, 'Säsong ändrad', 'säsong', s.name, { start_date: s.start_date, end_date: s.end_date }, { start_date: start, end_date: end });
  });
}

// ---------- Exempeldata ----------
// Exempeldata har egna nummerserier (X-…) och flaggan is_demo, så den kan tas bort utan att röra riktiga uppgifter.
async function seedDemo(db, user, season) {
  if ((await db.get('SELECT 1 FROM players WHERE is_demo = 1 LIMIT 1'))) fail('Exempeldata finns redan. Ta bort den först om du vill skapa ny.');
  const today = L.todayStr();
  const ref = today < season.start_date ? season.start_date : today > season.end_date ? season.end_date : today;
  return tx(async (db) => {
    const names = [['Exempel', 'Målvakt', '1', 'Målvakt'], ['Exempel', 'Libero', '4', 'Libero'], ['Exempel', 'Halvback', '7', 'Halvback'], ['Exempel', 'Mittfältare', '10', 'Mittfält'], ['Exempel', 'Forward', '17', 'Anfallare'], ['Exempel', 'Ytter', '22', 'Ytter']];
    const ids = [];
    for (const [f, l, j, pos] of names) ids.push(await createPlayer(db, user, { first_name: f, last_name: l, jersey: j, position: pos, notes: 'EXEMPELDATA – inte en riktig spelare', created_at: season.start_date + 'T08:00:00Z' }, { isDemo: true }));
    const catIds = Object.fromEntries((await db.all('SELECT number, id FROM categories')).map((c) => [c.number, c.id]));
    const cat = (n) => catIds[n];
    const back = (d) => { const x = L.addDays(ref, -d); return x < season.start_date ? season.start_date : x; };
    const plan = [[0, 4, 40], [0, 1, 38], [1, 8, 33], [2, 13, 30], [3, 5, 27], [3, 19, 25], [4, 14, 21], [5, 2, 18], [1, 26, 14], [2, 4, 10], [4, 10, 7], [0, 27, 5], [3, 12, 3], [4, 6, 2]];
    const fineNos = [];
    for (const [pi, c, d] of plan) fineNos.push(await insertFine(db, user, season, { player_id: ids[pi], category_id: cat(c), issued_date: back(d), description: 'Exempelbot' }, { isDemo: true }));
    await insertFine(db, user, season, { player_id: ids[5], category_id: cat(18), issued_date: back(9), stick_value: '600', new_stick_cost: '650', description: 'Exempel: avslagen klubba' }, { isDemo: true });
    await insertFine(db, user, season, { player_id: ids[2], category_id: cat(28), issued_date: back(6), ref_fine_no: fineNos[3], description: 'Exempel: planterad bot' }, { isDemo: true });
    const pays = [[0, 75, 20], [1, 150, 12], [2, 50, 8], [3, 400, 4], [4, 100, 1]];
    for (const [pi, amt, d] of pays) {
      const body = { player_id: ids[pi], date: back(d) };
      const player = await getPlayer(db, body.player_id);
      const no = 'X-I' + String(await nextNumber(db, 'demo_payment')).padStart(4, '0');
      const p = await db.get(`INSERT INTO payments (payment_no, season_id, player_id, date, amount, method, reference, comment, registered_by, is_demo, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,1,?) RETURNING *`, no, season.id, player.id, body.date, amt * 100, 'Swish', 'Exempel', 'Exempelbetalning', user.username, now());
      await allocate(db, p, await autoItems(db, player.id, season.id, p.amount));
    }
    const ne = 'X-K' + String(await nextNumber(db, 'demo_cash')).padStart(4, '0');
    (await db.run("INSERT INTO cash_events (event_no, season_id, type, date, amount, description, registered_by, is_demo, created_at) VALUES (?,?,'expense',?,?,?,?,1,?)", ne, season.id, back(2), 30000, 'Exempel: fika till laget', user.username, now()));
    await audit(db, user, 'Exempeldata skapad', 'exempeldata', null, null, { spelare: ids.length });
    return { players: ids.length };
  });
}
async function removeDemo(db, user) {
  return tx(async (db) => {
    const n = (await db.get('SELECT COUNT(*)::int n FROM players WHERE is_demo = 1')).n;
    if (!n) fail('Det finns ingen exempeldata att ta bort.');
    // Säkerhetskontroll: inga riktiga poster får peka på exempeldata.
    const mixed = (await db.get(`SELECT COUNT(*)::int n FROM fines WHERE is_demo = 0 AND (player_id IN (SELECT id FROM players WHERE is_demo=1) OR ref_fine_id IN (SELECT id FROM fines WHERE is_demo=1))`)).n
      + (await db.get('SELECT COUNT(*)::int n FROM payments WHERE is_demo = 0 AND player_id IN (SELECT id FROM players WHERE is_demo=1)')).n;
    if (mixed) fail('Riktiga registreringar är kopplade till exempelspelare. Inget togs bort.', 409);
    (await db.run('DELETE FROM allocations WHERE payment_id IN (SELECT id FROM payments WHERE is_demo=1) OR fine_id IN (SELECT id FROM fines WHERE is_demo=1)'));
    (await db.run('UPDATE fines SET ref_fine_id = NULL WHERE is_demo = 1'));
    (await db.run('DELETE FROM fines WHERE is_demo = 1'));
    (await db.run('DELETE FROM payments WHERE is_demo = 1'));
    (await db.run('DELETE FROM cash_events WHERE is_demo = 1'));
    (await db.run('DELETE FROM players WHERE is_demo = 1'));
    for (const c of ['demo_fine', 'demo_payment', 'demo_player', 'demo_cash']) (await db.run('UPDATE counters SET value = 0 WHERE name = ?', c));
    await audit(db, user, 'Exempeldata borttagen', 'exempeldata', null, { spelare: n }, null);
    return { removed_players: n };
  });
}

// ---------- Bötesanmälningar ----------
// En anmälan är bara ett förslag. Den påverkar inte skuld, kassa eller leaderboard förrän den
// godkänts – då skapas exakt en officiell bot via insertFine (samma kod som vanliga böter).
const REPORT_KINDS = ['fixed', 'per_item'];
async function getReport(db, id) {
  const r = await db.get('SELECT * FROM fine_reports WHERE id = ?', Number(id));
  if (!r) fail('Anmälan finns inte.', 404);
  return r;
}
async function createReport(db, user, season, body) {
  return tx(async (db) => {
    if (user.role !== 'player' || !user.player_id) fail('Endast spelarkonton kan anmäla böter.', 403);
    const reporter = await getPlayer(db, user.player_id);
    const target = await getPlayer(db, body.player_id);
    if (target.id === reporter.id) fail('Du kan inte anmäla dig själv.');
    if (target.is_demo) fail('Exempelspelare kan inte anmälas.');
    if (!target.active) fail(`${target.first_name} ${target.last_name} är inaktiv och kan inte anmälas.`);
    const cat = await db.get('SELECT * FROM categories WHERE id = ?', Number(body.category_id));
    if (!cat) fail('Välj en böteskategori.');
    if (!cat.active) fail(`Kategorin "${cat.name}" är inaktiverad.`);
    if (!REPORT_KINDS.includes(cat.kind)) fail(`Bot nr ${cat.number} kan inte anmälas – den hanteras av administratören.`);
    let quantity = 1;
    if (cat.kind === 'per_item') {
      quantity = Number(body.quantity || 1);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 30) fail('Antal måste vara ett heltal mellan 1 och 30.');
    }
    const incident = date(body.incident_date || L.todayStr(), 'Datum för händelsen');
    notFuture(incident, 'Datum för händelsen');
    inSeason(season, incident, 'Datum för händelsen');
    const comment = str(body.comment, 'Kommentar', { max: 300 });
    const key = body.idempotency_key ? str(body.idempotency_key, 'Nyckel', { max: 80 }) : null;
    if (key) {
      const ex = await db.get('SELECT report_no FROM fine_reports WHERE idempotency_key = ?', key);
      if (ex) fail(`Anmälan är redan skickad (${ex.report_no}).`, 409, 'already_registered');
    }
    const dup = await db.get(`SELECT report_no FROM fine_reports WHERE reporter_user_id = ? AND player_id = ? AND category_id = ?
      AND incident_date = ? AND status IN ('pending','disputed')`, user.id, target.id, cat.id, incident);
    if (dup) fail(`Du har redan en öppen anmälan av ${target.first_name} för samma bot och dag (${dup.report_no}).`, 409, 'duplicate_report');
    const amount = cat.default_amount * quantity;
    if (amount <= 0) fail('Kategorin saknar standardbelopp.');
    const no = 'A-' + String(await nextNumber(db, 'report')).padStart(4, '0');
    const reporterName = `${reporter.first_name} ${reporter.last_name}`;
    const r = await db.get(`INSERT INTO fine_reports (report_no, season_id, player_id, category_id, category_name, category_number, quantity, amount,
      incident_date, comment, reporter_user_id, reporter_player_id, reporter_name, reporter_jersey, status, idempotency_key, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?) RETURNING *`, no, season.id, target.id, cat.id, cat.name, cat.number, quantity, amount,
      incident, comment, user.id, reporter.id, reporterName, reporter.jersey, key, now());
    await audit(db, user, 'Bot anmäld', 'anmälan', no, null, { anmäld: `${target.first_name} ${target.last_name}`, kategori: `${cat.number}. ${cat.name}`, belopp: kr(amount), datum: incident, kommentar: comment, anmälare: reporterName });
    return r;
  });
}
// Godkänner EN anmälan, identifierad av sitt id. Klienten skickar även anmälningsnumret och den status
// den såg; stämmer de inte (inaktuell sida, fel kort) görs ingenting. Allt sker i en transaktion under
// lås, och databasen (unikt report_id på böter + trigger) stoppar dubbla böter och statusbyten.
function assertSameReport(r, expect) {
  if (expect?.report_no && expect.report_no !== r.report_no) fail('Fel anmälan – ladda om sidan.', 409, 'stale');
  if (expect?.status && expect.status !== r.status) fail(`${r.report_no} har redan hanterats (status ändrad). Sidan uppdateras.`, 409, 'stale');
}
async function approveReport(db, user, season, id, { asPlayer = false, note = '', expect = null } = {}) {
  return tx(async (db) => {
    const r = await getReport(db, id);
    assertSameReport(r, expect);
    if (asPlayer) {
      if (user.player_id !== r.player_id) fail('Bara den anmälda spelaren kan godkänna sin anmälan.', 403);
      if (r.status !== 'pending') fail(r.status === 'disputed' ? 'Du har bestridit anmälan – administratören avgör den nu.' : 'Anmälan är redan avgjord.', 409, 'already_decided');
    } else if (!['pending', 'disputed'].includes(r.status)) fail('Anmälan är redan avgjord.', 409, 'already_decided');
    if (r.fine_id) fail('Anmälan har redan blivit en bot.', 409, 'already_decided');
    const desc = `Anmälan ${r.report_no} av ${r.reporter_jersey ? `#${r.reporter_jersey} ` : ''}${r.reporter_name} (händelse ${r.incident_date})${r.comment ? `: ${r.comment}` : ''}`.slice(0, 500);
    const fineNo = await insertFine(db, user, season, { player_id: r.player_id, category_id: r.category_id, quantity: r.quantity, issued_date: L.todayStr(), description: desc },
      { fixedAmount: r.amount, reportId: r.id });
    const fine = await db.get('SELECT id FROM fines WHERE fine_no = ?', fineNo);
    const decisionNote = str(note, 'Kommentar', { max: 300 });
    const upd = await db.run(`UPDATE fine_reports SET status = 'approved', fine_id = ?, decided_by = ?, decided_at = ?, decision_note = ?, approved_by_player = ? WHERE id = ? AND status IN ('pending','disputed') AND fine_id IS NULL`,
      fine.id, who(user), now(), decisionNote || null, asPlayer ? 1 : 0, r.id);
    if (upd.changes !== 1) fail('Anmälan är redan avgjord.', 409, 'already_decided'); // transaktionen rullas tillbaka – ingen bot skapas
    await audit(db, user, asPlayer ? 'Anmälan godkänd av den anmälde' : 'Anmälan godkänd', 'anmälan', r.report_no, { status: r.status }, { status: 'godkänd', bot: fineNo });
    return { fine_no: fineNo, report: { id: r.id, report_no: r.report_no, status: 'approved' } };
  });
}
async function disputeReport(db, user, id, body) {
  return tx(async (db) => {
    const r = await getReport(db, id);
    assertSameReport(r, body.expect);
    if (user.player_id !== r.player_id) fail('Bara den anmälda spelaren kan bestrida sin anmälan.', 403);
    if (r.status !== 'pending') fail('Anmälan kan inte bestridas i nuvarande status.', 409, 'already_decided');
    const reason = str(body.reason, 'Varför du bestrider', { required: true, max: 300 });
    (await db.run("UPDATE fine_reports SET status = 'disputed', dispute_reason = ?, disputed_at = ? WHERE id = ?", reason, now(), r.id));
    await audit(db, user, 'Anmälan bestriden', 'anmälan', r.report_no, { status: 'väntar' }, { status: 'bestriden' }, reason);
  });
}
async function rejectReport(db, user, id, body) {
  return tx(async (db) => {
    const r = await getReport(db, id);
    assertSameReport(r, body.expect);
    if (!['pending', 'disputed'].includes(r.status)) fail('Anmälan är redan avgjord.', 409, 'already_decided');
    const reason = str(body.reason, 'Anledning', { required: true, max: 300 });
    (await db.run("UPDATE fine_reports SET status = 'rejected', decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?", who(user), now(), reason, r.id));
    await audit(db, user, 'Anmälan avslagen', 'anmälan', r.report_no, { status: r.status }, { status: 'avslagen' }, reason);
  });
}

module.exports = {
  AppError, fail, parseKr, kr, audit, METHODS,
  createPlayer: (db, user, body) => tx(async (db) => await createPlayer(db, user, body)),
  updatePlayer, setPlayerActive, deletePlayer, importPlayers, updateCategory, setJuniorDiscount, assertJerseyFreeForLogin,
  createReport, approveReport, disputeReport, rejectReport, getPlayer, who,
  createVerifiedPayment: (db, user, season, body) => tx(async (t) => createVerifiedPaymentTx(t, user, season, body)),
  setPaymentPermission, swishNumber, juniorDiscount,
  createFines, editFine, voidFine, createPayment, allocateCredit, reversePayment,
  createCashEvent, voidCashEvent, applyRule, closeMonth, updateSettings, updateSeason, seedDemo, removeDemo, playerCredit,
};
