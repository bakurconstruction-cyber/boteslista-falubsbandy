// Böteskassan 26/27 – API. Tar emot en Web-standard Request och returnerar en Response,
// så samma kod körs som Netlify Function i drift och som vanlig Node-server lokalt.
'use strict';
const crypto = require('crypto');
const { db: getDb, tx } = require('./db');
const L = require('./logic');
const O = require('./ops');

const SESSION_DAYS = 30;
const COOKIE = 'bk_session';

// ---------- Lösenord ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex'); const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) O.fail('Lösenordet måste vara minst 8 tecken.');
  if (pw.length > 200) O.fail('Lösenordet är för långt.');
}
function validUsername(u) {
  const s = String(u || '').trim();
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(s)) O.fail('Användarnamn: 3–30 tecken, bokstäver a–z, siffror, punkt, bindestreck eller understreck.');
  if (/^\d+$/.test(s)) O.fail('Användarnamn får inte bara vara siffror – siffror används när spelare loggar in med tröjnummer.');
  return s;
}

// ---------- CSV ----------
const krCsv = (ore) => (ore / 100).toFixed(2).replace('.', ',');
function csv(headers, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
}
const ROLE_SV = { admin: 'Administratör', viewer: 'Läsbehörighet', player: 'Spelare' };
const STATUS_SV = { obetald: 'Obetald', delvis: 'Delvis betald', betald: 'Betald', makulerad: 'Makulerad' };
const TYPE_SV = { income: 'Övrig inkomst', expense: 'Utgift', refund: 'Återbetalning', payment: 'Inbetalning', payment_reversed: 'Återförd inbetalning' };

// ---------- Svar ----------
const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Cache-Control': 'no-store' };
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC_HEADERS, ...extra } });
}
function file(body, filename, type) {
  return new Response(body, { status: 200, headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"`, ...SEC_HEADERS } });
}

// ---------- Routing ----------
const routes = [];
const route = (method, path, level, fn) => {
  const keys = [];
  const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, level, fn });
};
const GET = (p, l, f) => route('GET', p, l, f);
const POST = (p, l, f) => route('POST', p, l, f);
const PUT = (p, l, f) => route('PUT', p, l, f);
const DEL = (p, l, f) => route('DELETE', p, l, f);

// Inloggningsförsök per IP (per serverinstans).
const failures = new Map();

async function userFromToken(db, token) {
  if (!token) return null;
  const row = await db.get(`SELECT u.*, s.expires_at, p.first_name, p.last_name, p.jersey, p.active AS player_active
    FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN players p ON p.id = u.player_id WHERE s.token = ?`, token);
  if (!row || !row.active || row.expires_at < new Date().toISOString()) return null;
  const user = { id: row.id, username: row.username, display_name: row.display_name, role: row.role, token };
  if (row.role === 'player') {
    if (!row.player_id || !row.player_active) return null; // inaktiv spelare → kontot spärras
    Object.assign(user, { player_id: row.player_id, jersey: row.jersey, display_name: `${row.first_name} ${row.last_name}`,
      label: `${row.jersey ? `#${row.jersey} ` : ''}${row.first_name} ${row.last_name}` });
  }
  return user;
}
const publicUser = (u) => (u ? { username: u.username, display_name: u.display_name, role: u.role, player_id: u.player_id || null, jersey: u.jersey || null } : null);
function readCookie(request) {
  const m = (request.headers.get('cookie') || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
}
function isSecure(request) {
  return process.env.COOKIE_SECURE === '1' || request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https';
}
async function newSession(db, request, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', token, userId, exp.toISOString());
  await db.run('DELETE FROM sessions WHERE expires_at < ?', new Date().toISOString());
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${isSecure(request) ? '; Secure' : ''}`;
}

const season = (db) => L.activeSeason(db);
const state = async (db) => L.loadState(db, await season(db));

// ---------- Inloggning ----------
GET('/api/status', 'public', async ({ db, user }) => ({
  needs_setup: !(await db.get('SELECT 1 AS x FROM users LIMIT 1')),
  user: publicUser(user),
}));
POST('/api/setup', 'public', async ({ body, request }) => {
  validatePassword(body.password);
  const username = validUsername(body.username);
  const display = String(body.display_name || username).trim().slice(0, 60) || username;
  const cookie = await tx(async (t) => {
    if (await t.get('SELECT 1 AS x FROM users LIMIT 1')) O.fail('Appen är redan konfigurerad.', 409);
    const u = await t.get("INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?,?,?,'admin',?) RETURNING id",
      username, display, hashPassword(body.password), new Date().toISOString());
    await O.audit(t, { username }, 'Första administratör skapad', 'användare', username, null, { role: 'admin' });
    return newSession(t, request, u.id);
  });
  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
});
POST('/api/login', 'public', async ({ db, body, request, ip }) => {
  const f = failures.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 15 * 60000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 10) O.fail('För många misslyckade försök. Vänta 15 minuter.', 429);
  const name = String(body.username || '').trim().replace(/^#/, '');
  // Spelare loggar in med sitt tröjnummer; övriga konton med användarnamn.
  const u = /^\d{1,3}$/.test(name)
    ? await db.get(`SELECT u.* FROM users u JOIN players p ON p.id = u.player_id
        WHERE u.role = 'player' AND p.jersey = ? AND p.is_demo = 0 AND p.active = 1`, name)
    : await db.get("SELECT * FROM users WHERE lower(username) = lower(?) AND role <> 'player'", name);
  if (!u || !u.active || !checkPassword(String(body.password || ''), u.password_hash)) {
    f.n++; failures.set(ip, f);
    O.fail('Fel användarnamn eller lösenord.', 401);
  }
  failures.delete(ip);
  return json({ ok: true }, 200, { 'Set-Cookie': await newSession(db, request, u.id) });
});
POST('/api/logout', 'public', async ({ db, user }) => {
  if (user) await db.run('DELETE FROM sessions WHERE token = ?', user.token);
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
});
POST('/api/me/password', 'auth', async ({ db, user, body }) => {
  const u = await db.get('SELECT * FROM users WHERE id = ?', user.id);
  if (!checkPassword(String(body.current || ''), u.password_hash)) O.fail('Nuvarande lösenord stämmer inte.');
  validatePassword(body.password);
  await tx(async (t) => {
    await t.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), u.id);
    await t.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', u.id, user.token);
    await O.audit(t, user, 'Lösenord bytt', 'användare', u.username, null, null);
  });
  return { ok: true };
});

// ---------- Läsning (alla inloggade) ----------
GET('/api/dashboard', 'auth', async ({ db, user }) => ({ ...L.dashboard(await state(db), await L.getSettings(db)), reports: await reportTodo(db, user) }));
GET('/api/categories', 'auth', ({ db }) => db.all('SELECT * FROM categories ORDER BY number'));
GET('/api/players', 'auth', async ({ db }) => (await state(db)).players);
GET('/api/players/:id', 'auth', async ({ db, params, user }) => {
  const st = await state(db);
  const p = st.playerById.get(params.id);
  if (!p) O.fail('Spelaren finns inte.', 404);
  const fines = st.fines.filter((f) => f.player_id === p.id).sort((a, b) => b.issued_date.localeCompare(a.issued_date) || b.id - a.id);
  const payments = st.payments.filter((x) => x.player_id === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const refunds = st.cash.filter((c) => c.player_id === p.id);
  const history = [
    ...fines.map((f) => ({ date: f.issued_date, ts: f.created_at, text: `${f.fine_no} – ${f.category_name}`, amount: f.amount, type: 'fine', status: f.status })),
    ...fines.filter((f) => f.voided).map((f) => ({ date: f.voided_at.slice(0, 10), ts: f.voided_at, text: `${f.fine_no} makulerad: ${f.void_reason}`, amount: f.amount, type: 'void' })),
    ...payments.map((x) => ({ date: x.date, ts: x.created_at, text: `${x.payment_no} – inbetalning via ${x.method}`, amount: x.amount, type: 'payment' })),
    ...payments.filter((x) => x.reversed).map((x) => ({ date: x.reversed_at.slice(0, 10), ts: x.reversed_at, text: `${x.payment_no} återförd: ${x.reverse_reason}`, amount: x.amount, type: 'reverse' })),
    ...refunds.map((c) => ({ date: c.date, ts: c.created_at, text: `${c.event_no} – återbetalning${c.voided ? ' (makulerad)' : ''}`, amount: c.amount, type: 'refund' })),
  ].sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts));
  const cats = {};
  for (const f of fines.filter((x) => !x.voided)) { cats[f.category_name] = cats[f.category_name] || { count: 0, amount: 0 }; cats[f.category_name].count++; cats[f.category_name].amount += f.amount; }
  const lb = L.rank(st.players.filter((x) => x.active), (x) => x.issued);
  const reports = (await reportsFor(db, user)).filter((r) => r.player_id === p.id);
  const account = user.role === 'admin' ? await db.get('SELECT id, active FROM users WHERE player_id = ?', p.id) : undefined;
  return { player: p, fines, payments, refunds, history, categories: cats, place: lb.find((x) => x.id === p.id)?.place || null, of: lb.length, reports, account: account || null };
});
GET('/api/fines', 'auth', async ({ db }) => (await state(db)).fines.sort((a, b) => b.id - a.id));
GET('/api/fines/lookup', 'auth', async ({ db, query }) => {
  const no = String(query.get('no') || '').trim().toUpperCase();
  const f = (await state(db)).fines.find((x) => x.fine_no === no);
  if (!f) O.fail(`Bötesnummer ${no || '?'} finns inte.`, 404);
  return { id: f.id, fine_no: f.fine_no, player_name: f.player_name, category_name: f.category_name, amount: f.amount, voided: f.voided, kind: f.kind, is_demo: f.is_demo, issued_date: f.issued_date };
});
GET('/api/fines/:id', 'auth', async ({ db, params, user }) => {
  const st = await state(db);
  const f = st.fineById.get(Number(params.id));
  if (!f) O.fail('Boten finns inte.', 404);
  const allocs = await db.all('SELECT a.*, p.payment_no, p.date AS payment_date, p.method FROM allocations a JOIN payments p ON p.id = a.payment_id WHERE a.fine_id = ? ORDER BY a.id', f.id);
  const history = user.role === 'admin' ? await db.all("SELECT * FROM audit_log WHERE entity = 'bot' AND entity_id = ? ORDER BY id DESC", f.fine_no) : [];
  const ref = f.ref_fine_id ? st.fineById.get(f.ref_fine_id) : null;
  const plantedBy = st.fines.filter((x) => x.ref_fine_id === f.id).map((x) => ({ fine_no: x.fine_no, player_name: x.player_name, voided: x.voided }));
  const report = f.report_id ? await db.get('SELECT report_no, reporter_name, reporter_jersey, incident_date, comment, decided_by, approved_by_player, dispute_reason FROM fine_reports WHERE id = ?', f.report_id) : null;
  return { fine: f, allocations: allocs, history, ref: ref ? { fine_no: ref.fine_no, player_name: ref.player_name } : null, planted_by: plantedBy, report };
});
GET('/api/payments', 'auth', async ({ db }) => (await state(db)).payments.sort((a, b) => b.id - a.id));
GET('/api/payments/:id', 'auth', async ({ db, params }) => {
  const p = (await state(db)).payments.find((x) => x.id === Number(params.id));
  if (!p) O.fail('Betalningen finns inte.', 404);
  const allocs = await db.all('SELECT a.*, f.fine_no, f.category_name FROM allocations a JOIN fines f ON f.id = a.fine_id WHERE a.payment_id = ? ORDER BY a.id', p.id);
  return { payment: p, allocations: allocs };
});
GET('/api/leaderboard', 'auth', async ({ db, query }) => L.leaderboard(await state(db), Object.fromEntries(query)));
GET('/api/month', 'auth', async ({ db, query }) => {
  const st = await state(db);
  const q = query.get('period');
  const period = L.isMonth(q) ? q : L.monthOf(st.today);
  return L.monthView(db, st, period, await L.getSettings(db));
});
GET('/api/cash', 'auth', async ({ db }) => L.cashSummary(await state(db), await L.getSettings(db)));
GET('/api/rules', 'auth', async ({ db, query }) => {
  const st = await state(db); const s = await L.getSettings(db);
  const prev = L.monthOf(L.addDays(L.monthStart(L.monthOf(st.today)), -1));
  const q = query.get('period');
  const period = L.isMonth(q) ? q : prev;
  return { r22: L.rule22Candidates(st, s), r23: L.rule23Ranking(st, s), r29: L.rule29Candidates(st, period, s), today: st.today };
});
GET('/api/settings', 'auth', async ({ db, user }) => {
  const s = await L.getSettings(db);
  const out = { team_name: s.team_name, payment_info: s.payment_info, season: await season(db), today: L.todayStr(), demo: !!(await db.get('SELECT 1 AS x FROM players WHERE is_demo=1 LIMIT 1')), methods: O.METHODS };
  if (user.role === 'admin') Object.assign(out, s, { start_balance: Number(s.start_balance) });
  return out;
});

// ---------- Ändringar (administratör) ----------
const ok = { ok: true };
POST('/api/players', 'admin', async ({ db, user, body }) => ({ id: await O.createPlayer(db, user, body) }));
PUT('/api/players/:id', 'admin', async ({ db, user, params, body }) => { await O.updatePlayer(db, user, params.id, body); return ok; });
POST('/api/players/import', 'admin', ({ db, user, body }) => O.importPlayers(db, user, body.csv));
POST('/api/players/:id/active', 'admin', async ({ db, user, params, body }) => { await O.setPlayerActive(db, user, params.id, !!body.active); return ok; });
DEL('/api/players/:id', 'admin', async ({ db, user, params }) => { await O.deletePlayer(db, user, params.id); return ok; });
POST('/api/players/:id/allocate-credit', 'admin', async ({ db, user, params, body }) => O.allocateCredit(db, user, await season(db), params.id, body));
PUT('/api/categories/:id', 'admin', async ({ db, user, params, body }) => { await O.updateCategory(db, user, params.id, body); return ok; });
POST('/api/fines', 'admin', async ({ db, user, body }) => ({ fine_nos: await O.createFines(db, user, await season(db), body.items) }));
PUT('/api/fines/:id', 'admin', async ({ db, user, params, body }) => { await O.editFine(db, user, await season(db), params.id, body); return ok; });
POST('/api/fines/:id/void', 'admin', ({ db, user, params, body }) => O.voidFine(db, user, params.id, body));
POST('/api/payments', 'admin', async ({ db, user, body }) => O.createPayment(db, user, await season(db), body));
POST('/api/payments/:id/reverse', 'admin', async ({ db, user, params, body }) => { await O.reversePayment(db, user, await season(db), params.id, body); return ok; });
POST('/api/cash', 'admin', async ({ db, user, body }) => ({ event_no: await O.createCashEvent(db, user, await season(db), body) }));
POST('/api/cash/:id/void', 'admin', async ({ db, user, params, body }) => { await O.voidCashEvent(db, user, params.id, body); return ok; });
POST('/api/rules/:rule', 'admin', async ({ db, user, params, body }) => ({ fine_nos: await O.applyRule(db, user, await season(db), params.rule, body) }));
POST('/api/month/:period/close', 'admin', async ({ db, user, params, body }) => { await O.closeMonth(db, user, await season(db), params.period, body); return ok; });
PUT('/api/settings', 'admin', async ({ db, user, body }) => { await O.updateSettings(db, user, body); return ok; });
PUT('/api/season', 'admin', async ({ db, user, body }) => { await O.updateSeason(db, user, body); return ok; });
POST('/api/demo', 'admin', async ({ db, user }) => O.seedDemo(db, user, await season(db)));
DEL('/api/demo', 'admin', ({ db, user }) => O.removeDemo(db, user));
GET('/api/audit', 'admin', ({ db, query }) => db.all('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', Math.min(Number(query.get('limit')) || 300, 2000)));

POST('/api/players/:id/junior-discount', 'admin', async ({ db, user, params, body }) => { await O.setJuniorDiscount(db, user, params.id, !!body.enabled); return ok; });

// ---------- Bötesanmälningar ----------
// Admin och läskonto ser alla anmälningar; en spelare ser de hon/han skickat och de som gäller henne/honom.
async function reportsFor(db, user) {
  const s = await season(db);
  const rows = await db.all(`SELECT r.*, p.first_name || ' ' || p.last_name AS player_name, p.jersey AS player_jersey, f.fine_no, f.amount AS fine_amount,
    f.base_amount AS fine_base_amount, f.discount_amount AS fine_discount_amount, f.voided AS fine_voided, p.junior_discount
    FROM fine_reports r JOIN players p ON p.id = r.player_id LEFT JOIN fines f ON f.id = r.fine_id WHERE r.season_id = ? ORDER BY r.id DESC`, s.id);
  return user.role === 'player' ? rows.filter((r) => r.player_id === user.player_id || r.reporter_user_id === user.id).map(({ idempotency_key, ...r }) => r)
    : rows.map(({ idempotency_key, ...r }) => r);
}
async function reportTodo(db, user) {
  if (user.role === 'admin') {
    const r = await db.get("SELECT COUNT(*) FILTER (WHERE status = 'pending')::int pending, COUNT(*) FILTER (WHERE status = 'disputed')::int disputed FROM fine_reports");
    return { pending: r.pending, disputed: r.disputed, todo: r.pending + r.disputed };
  }
  if (user.role === 'player') {
    const r = await db.get("SELECT COUNT(*)::int n FROM fine_reports WHERE player_id = ? AND status = 'pending'", user.player_id);
    return { pending: r.n, disputed: 0, todo: r.n };
  }
  return { pending: 0, disputed: 0, todo: 0 };
}
GET('/api/reports', 'auth', ({ db, user }) => reportsFor(db, user));
GET('/api/reports/todo', 'auth', ({ db, user }) => reportTodo(db, user));
POST('/api/reports', 'player', async ({ db, user, body }) => {
  const r = await O.createReport(db, user, await season(db), body);
  return { id: r.id, report_no: r.report_no };
});
POST('/api/reports/:id/accept', 'player', ({ db, user, params }) => season(db).then((s) => O.approveReport(db, user, s, params.id, { asPlayer: true })));
POST('/api/reports/:id/dispute', 'player', async ({ db, user, params, body }) => { await O.disputeReport(db, user, params.id, body); return ok; });
POST('/api/reports/:id/approve', 'admin', async ({ db, user, params, body }) => O.approveReport(db, user, await season(db), params.id, { note: body.note }));
POST('/api/reports/:id/reject', 'admin', async ({ db, user, params, body }) => { await O.rejectReport(db, user, params.id, body); return ok; });

// ---------- Spelarkonton (administratör) ----------
// Kontot kopplas till spelar-ID. Spelaren loggar in med sitt tröjnummer.
POST('/api/players/:id/account', 'admin', async ({ user, params, body }) => {
  validatePassword(body.password);
  return tx(async (t) => {
    const p = await O.getPlayer(t, params.id);
    if (p.is_demo) O.fail('Exempelspelare kan inte få konto.');
    if (!p.active) O.fail('Spelaren är inaktiv. Aktivera spelaren först.');
    if (!p.jersey) O.fail('Spelaren måste ha ett tröjnummer – det är användarnamnet vid inloggning.');
    if (await t.get('SELECT 1 AS x FROM users WHERE player_id = ?', p.id)) O.fail('Spelaren har redan ett konto. Byt lösenord i stället.', 409);
    const clash = await t.get(`SELECT pl.first_name, pl.last_name FROM users u JOIN players pl ON pl.id = u.player_id WHERE pl.jersey = ? AND pl.is_demo = 0`, p.jersey);
    if (clash) O.fail(`Tröjnummer ${p.jersey} används redan för inloggning av ${clash.first_name} ${clash.last_name}.`, 409);
    const username = `spelare-${p.id.toLowerCase()}`;
    const u = await t.get("INSERT INTO users (username, display_name, password_hash, role, player_id, created_at) VALUES (?,?,?,'player',?,?) RETURNING id",
      username, `${p.first_name} ${p.last_name}`, hashPassword(body.password), p.id, new Date().toISOString());
    await O.audit(t, user, 'Spelarkonto skapat', 'användare', `#${p.jersey} ${p.first_name} ${p.last_name}`, null, { spelare: p.id, inloggning: `tröjnummer ${p.jersey}` });
    return { id: u.id, login: p.jersey };
  });
});

// Användare
GET('/api/users', 'admin', ({ db }) => db.all(`SELECT u.id, u.username, u.display_name, u.role, u.active, u.created_at, u.player_id, p.jersey, p.active AS player_active,
  p.first_name || ' ' || p.last_name AS player_name FROM users u LEFT JOIN players p ON p.id = u.player_id ORDER BY u.id`));
POST('/api/users', 'admin', async ({ user, body }) => {
  const username = validUsername(body.username);
  const role = body.role === 'admin' ? 'admin' : 'viewer';
  validatePassword(body.password);
  const display = String(body.display_name || username).trim().slice(0, 60) || username;
  await tx(async (t) => {
    if (await t.get('SELECT 1 AS x FROM users WHERE lower(username) = lower(?)', username)) O.fail('Användarnamnet är upptaget.');
    await t.run('INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?,?,?,?,?)', username, display, hashPassword(body.password), role, new Date().toISOString());
    await O.audit(t, user, 'Användare skapad', 'användare', username, null, { role, display_name: display });
  });
  return ok;
});
PUT('/api/users/:id', 'admin', async ({ user, params, body }) => {
  if (body.password) validatePassword(body.password);
  await tx(async (t) => {
    const u = await t.get('SELECT * FROM users WHERE id = ?', Number(params.id));
    if (!u) O.fail('Användaren finns inte.', 404);
    if (body.role && u.role === 'player') O.fail('Ett spelarkonto kan inte byta roll. Skapa ett separat konto för administratör eller läsbehörighet.');
    const role = body.role ? (body.role === 'admin' ? 'admin' : 'viewer') : u.role;
    const active = body.active == null ? u.active : body.active ? 1 : 0;
    const admins = (await t.get("SELECT COUNT(*)::int n FROM users WHERE role = 'admin' AND active = 1 AND id != ?", u.id)).n;
    if ((role !== 'admin' || !active) && u.role === 'admin' && u.active && admins === 0) O.fail('Det måste finnas minst en aktiv administratör.');
    await t.run('UPDATE users SET role = ?, active = ? WHERE id = ?', role, active, u.id);
    if (!active) await t.run('DELETE FROM sessions WHERE user_id = ?', u.id);
    if (body.password) {
      await t.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), u.id);
      await t.run('DELETE FROM sessions WHERE user_id = ?', u.id);
    }
    await O.audit(t, user, 'Användare ändrad', 'användare', u.username, { role: u.role, active: u.active }, { role, active, nytt_lösenord: !!body.password });
  });
  return ok;
});

// ---------- Export & säkerhetskopia ----------
GET('/api/export/:name', 'admin', async ({ db, user, params, query }) => {
  const st = await state(db); const s = await L.getSettings(db);
  const name = params.name;
  const CSV = 'text/csv; charset=utf-8';
  if (name === 'boter.csv') {
    return file(csv(['Bötesnummer', 'Spelar-ID', 'Spelare', 'Datum', 'Kategori nr', 'Kategori', 'Beskrivning', 'Antal', 'Belopp (kr)', 'Betalt (kr)', 'Kvar (kr)', 'Status', 'Sista betalningsdag', 'Betaldatum', 'Försenad', 'Beräkning', 'Makuleringsorsak', 'Registrerad av', 'Exempeldata', 'Ordinarie belopp (kr)', 'Juniorrabatt (kr)'],
      [...st.fines].sort((a, b) => a.id - b.id).map((f) => [f.fine_no, f.player_id, f.player_name, f.issued_date, f.category_number, f.category_name, f.description, f.quantity, krCsv(f.amount), krCsv(f.paid), krCsv(f.remaining), STATUS_SV[f.status], f.due_date, f.paid_date || '', f.overdue ? 'Ja' : '', f.calc || '', f.void_reason || '', f.registered_by, f.is_demo ? 'Ja' : '', krCsv(f.base_amount ?? f.amount), f.discount_amount ? krCsv(f.discount_amount) : ''])), 'boter.csv', CSV);
  }
  if (name === 'anmalningar.csv') {
    const REP_SV = { pending: 'Väntar på godkännande', disputed: 'Bestriden', approved: 'Godkänd', rejected: 'Avslagen' };
    return file(csv(['Anmälnings-ID', 'Skickad', 'Anmäld spelare', 'Kategori nr', 'Kategori', 'Antal', 'Standardbelopp (kr)', 'Händelsedatum', 'Kommentar', 'Anmälare', 'Anmälarens tröjnr', 'Status', 'Bestridd: orsak', 'Avgjord av', 'Avgjord', 'Beslutskommentar', 'Bötesnummer'],
      [...(await reportsFor(db, user))].reverse().map((r) => [r.report_no, r.created_at, r.player_name, r.category_number, r.category_name, r.quantity, krCsv(r.amount), r.incident_date, r.comment, r.reporter_name, r.reporter_jersey || '', REP_SV[r.status], r.dispute_reason || '', r.decided_by || '', r.decided_at || '', r.decision_note || '', r.fine_no || ''])), name, CSV);
  }
  if (name === 'inbetalningar.csv') {
    return file(csv(['Betalnings-ID', 'Spelar-ID', 'Spelare', 'Datum', 'Belopp (kr)', 'Fördelat (kr)', 'Ofördelat (kr)', 'Metod', 'Referens', 'Kommentar', 'Status', 'Återföringsorsak', 'Registrerad av', 'Exempeldata'],
      st.payments.map((p) => [p.payment_no, p.player_id, p.player_name, p.date, krCsv(p.amount), krCsv(p.allocated), krCsv(p.unallocated), p.method, p.reference, p.comment, p.reversed ? 'Återförd' : 'Aktiv', p.reverse_reason || '', p.registered_by, p.is_demo ? 'Ja' : ''])), name, CSV);
  }
  if (name === 'spelare.csv') {
    return file(csv(['Spelar-ID', 'Förnamn', 'Efternamn', 'Tröjnummer', 'Position', 'Status', 'Antal böter', 'Utfärdat (kr)', 'Inbetalt (kr)', 'Skuld (kr)', 'Tillgodo (kr)', 'Obetalda böter', 'Senaste inbetalning', 'Anteckningar', 'Exempeldata', 'Juniorrabatt'],
      st.players.map((p) => [p.id, p.first_name, p.last_name, p.jersey || '', p.position || '', p.active ? 'Aktiv' : 'Inaktiv', p.fine_count, krCsv(p.issued), krCsv(p.paid), krCsv(p.debt), krCsv(Math.max(0, p.credit)), p.unpaid_count, p.last_payment || '', p.notes, p.is_demo ? 'Ja' : '', p.junior_discount ? `${p.junior_discount} %` : ''])), name, CSV);
  }
  if (name === 'kassa.csv') {
    const c = L.cashSummary(st, s);
    return file(csv(['Nummer', 'Datum', 'Typ', 'Beskrivning', 'In (kr)', 'Ut (kr)', 'Status'],
      [...c.events].reverse().map((e) => [e.no, e.date, TYPE_SV[e.kind], e.text, e.sign > 0 ? krCsv(e.amount) : '', e.sign < 0 ? krCsv(e.amount) : '', e.voided ? `Makulerad: ${e.void_reason}` : e.kind === 'payment_reversed' ? 'Återförd' : ''])), name, CSV);
  }
  if (name === 'andringslogg.csv') {
    return file(csv(['Tid (UTC)', 'Användare', 'Ändring', 'Objekt', 'ID', 'Tidigare värde', 'Nytt värde', 'Orsak'],
      (await db.all('SELECT * FROM audit_log ORDER BY id')).map((a) => [a.ts, a.username, a.action, a.entity, a.entity_id || '', a.old_value || '', a.new_value || '', a.reason || ''])), name, CSV);
  }
  if (name === 'manadsrapport.csv') {
    const q = query.get('period');
    const period = L.isMonth(q) ? q : L.monthOf(st.today);
    const mv = await L.monthView(db, st, period, s);
    const cm = L.cashSummary(st, s).monthly.find((m) => m.month === period) || { payments: 0, income: 0, refunds: 0, expenses: 0, net: 0, balance: '' };
    const rows = [
      ['Månadsrapport', period], ['Lag', s.team_name], ['Säsong', st.season.name], ['Avstämd', mv.closing ? `${mv.closing.closed_at.slice(0, 10)} av ${mv.closing.closed_by}` : 'Nej'], [],
      ['Utfärdade böter (antal)', mv.summary.fines_count], ['Utfärdade böter (kr)', krCsv(mv.summary.fines_amount)], ['Makulerade böter (antal)', mv.summary.voided],
      ['Inbetalningar (antal)', mv.summary.payments_count], ['Inbetalningar (kr)', krCsv(cm.payments)], ['Övriga inkomster (kr)', krCsv(cm.income)],
      ['Återbetalningar (kr)', krCsv(cm.refunds)], ['Utgifter (kr)', krCsv(cm.expenses)], ['Netto (kr)', krCsv(cm.net)], ['Kassasaldo vid månadens slut (kr)', cm.balance === '' ? '' : krCsv(cm.balance)], [],
      ['Obetalt per spelare', 'Belopp (kr)', 'Varav förfallet (kr)', 'Tidigaste förfallodag'],
      ...mv.open.map((r) => [r.name, krCsv(r.amount), krCsv(r.overdue_amount), r.earliest_due]),
    ];
    return file(csv(rows[0], rows.slice(1)), `manadsrapport-${period}.csv`, CSV);
  }
  if (name === 'sasongsrapport.csv') {
    const c = L.cashSummary(st, s);
    const rows = [
      ['Lag', s.team_name], ['Period', `${st.season.start_date} – ${st.season.end_date}`], ['Skapad', L.todayStr()], [],
      ['Startsaldo (kr)', krCsv(c.totals.start_balance)], ['Mottagna inbetalningar (kr)', krCsv(c.totals.received)], ['Övriga inkomster (kr)', krCsv(c.totals.income)],
      ['Återbetalningar (kr)', krCsv(c.totals.refunds)], ['Utgifter (kr)', krCsv(c.totals.expenses)], ['Kassasaldo (kr)', krCsv(c.totals.balance)],
      ['Utfärdade böter (kr)', krCsv(c.totals.issued)], ['Utestående skulder (kr)', krCsv(c.totals.outstanding)], ['Tillgodohavanden (kr)', krCsv(c.totals.credits)], [],
      ['Månad', 'Utfärdat (kr)', 'Inbetalt (kr)', 'Övr. inkomst (kr)', 'Återbetalt (kr)', 'Utgifter (kr)', 'Netto (kr)', 'Saldo (kr)'],
      ...c.monthly.map((m) => [m.month, krCsv(m.fines_issued), krCsv(m.payments), krCsv(m.income), krCsv(m.refunds), krCsv(m.expenses), krCsv(m.net), krCsv(m.balance)]), [],
      ['Spelare', 'Antal böter', 'Utfärdat (kr)', 'Inbetalt (kr)', 'Skuld (kr)', 'Tillgodo (kr)'],
      ...st.players.map((p) => [p.name + (p.is_demo ? ' (EXEMPEL)' : ''), p.fine_count, krCsv(p.issued), krCsv(p.paid), krCsv(p.debt), krCsv(Math.max(0, p.credit))]),
    ];
    return file(csv(['Säsongsrapport', st.season.name], rows), `sasongsrapport-${st.season.name.replace('/', '-')}.csv`, CSV);
  }
  if (name === 'sakerhetskopia.json') {
    const dump = {};
    for (const t of ['seasons', 'settings', 'counters', 'players', 'categories', 'fines', 'payments', 'allocations', 'cash_events', 'month_closings', 'audit_log', 'fine_reports']) dump[t] = await db.all(`SELECT * FROM ${t} ORDER BY 1`);
    dump.users = await db.all('SELECT id, username, display_name, role, active, created_at, player_id FROM users ORDER BY id');
    return file(JSON.stringify({ app: 'Böteskassan 26/27', exported_at: new Date().toISOString(), data: dump }, null, 2), `boteskassan-backup-${L.todayStr()}.json`, 'application/json; charset=utf-8');
  }
  O.fail('Okänd export.', 404);
});

// ---------- Huvudhanterare ----------
async function handle(request, { ip = '' } = {}) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (!url.pathname.startsWith('/api/')) return json({ error: 'Okänd adress.' }, 404);
  // CSRF-skydd: ändrande anrop måste komma från appens egen JavaScript.
  if (!['GET', 'HEAD'].includes(method) && request.headers.get('x-requested-with') !== 'boteskassan') return json({ error: 'Ogiltig förfrågan.' }, 403);
  let r; let params = {};
  for (const x of routes) {
    if (x.method !== method) continue;
    const m = url.pathname.match(x.re);
    if (m) { r = x; x.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; }
  }
  if (!r) return json({ error: 'Okänd adress.' }, 404);
  try {
    const db = getDb();
    const user = await userFromToken(db, readCookie(request));
    if (r.level !== 'public' && !user) return json({ error: 'Du måste logga in.' }, 401);
    if (r.level === 'admin' && user.role !== 'admin') return json({ error: user.role === 'player' ? 'Spelarkonton kan läsa och anmäla böter men inte ändra uppgifter.' : 'Du har läsbehörighet och kan inte ändra uppgifter.' }, 403);
    if (r.level === 'player' && user.role !== 'player') return json({ error: 'Det här kan bara göras med ett spelarkonto.' }, 403);
    let body = {};
    if (!['GET', 'HEAD', 'DELETE'].includes(method)) {
      const text = await request.text();
      if (text.length > 500_000) return json({ error: 'För stor förfrågan.' }, 413);
      if (text) { try { body = JSON.parse(text); } catch { return json({ error: 'Ogiltig JSON.' }, 400); } }
      if (!body || typeof body !== 'object') body = {};
    }
    const out = await r.fn({ db, user, body, params, query: url.searchParams, request, ip });
    return out instanceof Response ? out : json(out === undefined ? ok : out);
  } catch (e) {
    if (e instanceof O.AppError) return json({ error: e.message, code: e.code }, e.status);
    console.error(e);
    return json({ error: 'Ett oväntat fel uppstod. Inget har sparats.' }, 500);
  }
}

// Första start: skapa administratör från miljövariabler om sådana finns (valfritt).
async function bootstrapAdmin() {
  const u = process.env.ADMIN_USERNAME; const p = process.env.ADMIN_PASSWORD;
  if (!u || !p) return;
  await tx(async (t) => {
    if (await t.get('SELECT 1 AS x FROM users LIMIT 1')) return;
    await t.run("INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?,?,?,'admin',?)", u, u, hashPassword(p), new Date().toISOString());
  });
}

module.exports = { handle, bootstrapAdmin };
