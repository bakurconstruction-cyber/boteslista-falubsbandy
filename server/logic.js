// Beräkningslogik. Alla summor räknas fram från grunddata (böter, inbetalningar, fördelningar,
// kassahändelser) på ett och samma ställe, så att dashboard, spelarsidor, leaderboard och kassa
// alltid visar samma siffror.
'use strict';

const TZ = 'Europe/Stockholm';

// ---------- Datum (svensk tid) ----------
function todayStr(now) {
  if (!now && process.env.BK_TODAY) return process.env.BK_TODAY; // endast för tester
  now = now || new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function isMonth(s) { return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s); }
function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }
function monthOf(s) { return s.slice(0, 7); }
function monthEnd(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
function monthStart(ym) { return ym + '-01'; }
function nextMonth(ym) { return monthOf(addDays(monthEnd(ym), 1)); }
function weekStart(s) { // måndag i veckan
  const d = new Date(s + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(s, -dow);
}
function isoWeek(s) {
  const d = new Date(s + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const w = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-V${String(w).padStart(2, '0')}`;
}
function monthsBetween(fromYm, toYm) {
  const out = [];
  for (let m = fromYm; m <= toYm; m = nextMonth(m)) out.push(m);
  return out;
}
// Standard: en bot ska vara betald senast sista kalenderdagen i den månad den utfärdades.
function defaultDueDate(issued) { return monthEnd(monthOf(issued)); }

// ---------- Inläsning ----------
async function activeSeason(db) { return db.get('SELECT * FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1'); }
async function getSettings(db) {
  const s = {};
  for (const r of await db.all('SELECT key, value FROM settings')) s[r.key] = r.value;
  return s;
}

async function loadState(db, season, today = todayStr()) {
  const [players, fines, payments, allocs, cash] = await Promise.all([
    db.all('SELECT * FROM players ORDER BY last_name, first_name'),
    db.all('SELECT * FROM fines WHERE season_id = ? ORDER BY id', season.id),
    db.all('SELECT * FROM payments WHERE season_id = ? ORDER BY id', season.id),
    db.all(`SELECT a.*, p.date AS payment_date FROM allocations a
    JOIN payments p ON p.id = a.payment_id WHERE a.active = 1 AND p.season_id = ?`, season.id),
    db.all('SELECT * FROM cash_events WHERE season_id = ? ORDER BY date, id', season.id),
  ]);

  const allocByFine = new Map();
  const allocByPayment = new Map();
  for (const a of allocs) {
    if (!allocByFine.has(a.fine_id)) allocByFine.set(a.fine_id, []);
    allocByFine.get(a.fine_id).push(a);
    allocByPayment.set(a.payment_id, (allocByPayment.get(a.payment_id) || 0) + a.amount);
  }
  const fineById = new Map();
  for (const f of fines) {
    const list = allocByFine.get(f.id) || [];
    f.paid = f.voided ? 0 : list.reduce((s, a) => s + a.amount, 0);
    f.remaining = f.voided ? 0 : f.amount - f.paid;
    f.status = f.voided ? 'makulerad' : f.paid >= f.amount ? 'betald' : f.paid > 0 ? 'delvis' : 'obetald';
    f.paid_date = f.status === 'betald' ? list.reduce((m, a) => (a.payment_date > m ? a.payment_date : m), '') : null;
    f.overdue = !f.voided && f.remaining > 0 && f.due_date < today;
    fineById.set(f.id, f);
  }
  for (const p of payments) {
    p.allocated = p.reversed ? 0 : allocByPayment.get(p.id) || 0;
    p.unallocated = p.reversed ? 0 : p.amount - p.allocated;
  }
  const playerById = new Map(players.map((p) => [p.id, p]));
  for (const p of players) {
    Object.assign(p, {
      name: `${p.first_name} ${p.last_name}`, fine_count: 0, issued: 0, allocated: 0, paid: 0,
      refunded: 0, discounted: 0, unpaid_count: 0, overdue_count: 0, overdue_amount: 0, last_payment: null,
    });
  }
  for (const f of fines) {
    const p = playerById.get(f.player_id);
    f.player_name = p ? p.name : f.player_id;
    if (!p || f.voided) continue;
    p.fine_count++; p.issued += f.amount; p.allocated += f.paid; p.discounted += f.discount_amount || 0;
    if (f.remaining > 0) p.unpaid_count++;
    if (f.overdue) { p.overdue_count++; p.overdue_amount += f.remaining; }
  }
  for (const pay of payments) {
    const p = playerById.get(pay.player_id);
    pay.player_name = p ? p.name : pay.player_id;
    if (!p || pay.reversed) continue;
    p.paid += pay.amount;
    if (!p.last_payment || pay.date > p.last_payment) p.last_payment = pay.date;
  }
  for (const c of cash) {
    const p = c.player_id ? playerById.get(c.player_id) : null;
    c.player_name = p ? p.name : null;
    if (p && c.type === 'refund' && !c.voided) p.refunded += c.amount;
  }
  for (const p of players) {
    p.debt = p.issued - p.allocated;
    p.credit = p.paid - p.refunded - p.allocated;
  }
  return { season, today, players, playerById, fines, fineById, payments, allocs, cash };
}

// ---------- Rangordning med delade placeringar (1, 1, 3 ...) ----------
function rank(rows, valueFn, dir = 'desc', tieFn) {
  const sorted = [...rows].sort((a, b) => {
    const d = dir === 'desc' ? valueFn(b) - valueFn(a) : valueFn(a) - valueFn(b);
    return d !== 0 ? d : (tieFn ? tieFn(a, b) : a.name.localeCompare(b.name, 'sv'));
  });
  let prev = null; let place = 0;
  return sorted.map((r, i) => {
    const v = valueFn(r);
    if (prev === null || v !== prev) { place = i + 1; prev = v; }
    return { ...r, place, value: v };
  });
}
const sharesTop = (ranked) => ranked.filter((r) => r.place === 1);

// ---------- Dashboard ----------
function dashboard(st, settings) {
  const month = monthOf(st.today);
  const active = st.players.filter((p) => p.active);
  const liveFines = st.fines.filter((f) => !f.voided);
  const livePays = st.payments.filter((p) => !p.reversed);
  const monthPayers = new Map();
  for (const p of livePays) if (monthOf(p.date) === month) monthPayers.set(p.player_id, (monthPayers.get(p.player_id) || 0) + p.amount);
  const payerRows = [...monthPayers].map(([id, v]) => ({ id, name: st.playerById.get(id).name, v }));
  const topPayers = payerRows.length ? sharesTop(rank(payerRows, (r) => r.v)) : [];
  const byCount = rank(active, (p) => p.fine_count);
  const cashSum = cashSummary(st, settings);
  return {
    season: st.season, today: st.today, month,
    players_total: st.players.length, players_active: active.length,
    fines_count: liveFines.length, fines_voided: st.fines.length - liveFines.length,
    fines_amount: liveFines.reduce((s, f) => s + f.amount, 0),
    paid_in: livePays.reduce((s, p) => s + p.amount, 0),
    unpaid: st.players.reduce((s, p) => s + p.debt, 0),
    credit_total: st.players.reduce((s, p) => s + Math.max(0, p.credit), 0),
    players_with_debt: st.players.filter((p) => p.debt > 0).length,
    overdue_count: liveFines.filter((f) => f.overdue).length,
    overdue_amount: liveFines.filter((f) => f.overdue).reduce((s, f) => s + f.remaining, 0),
    month_top_payer: topPayers.map((r) => ({ id: r.id, name: r.name, amount: r.v })),
    most_fines: byCount.length && byCount[0].value > 0 ? sharesTop(byCount).map(slimPlayer) : [],
    least_fines: active.length ? sharesTop(rank(active, (p) => p.fine_count, 'asc')).map(slimPlayer) : [],
    leaderboard: rank(active, (p) => p.issued).slice(0, 8).map((p) => ({ ...slimPlayer(p), place: p.place })),
    recent_fines: [...st.fines].sort((a, b) => b.id - a.id).slice(0, 8).map(slimFine),
    recent_payments: [...st.payments].sort((a, b) => b.id - a.id).slice(0, 8).map(slimPayment),
    cash: cashSum.totals,
    chart: monthlyChart(st),
  };
}
function slimPlayer(p) {
  return { id: p.id, name: p.name, jersey: p.jersey, fine_count: p.fine_count, issued: p.issued, debt: p.debt, paid: p.paid, credit: p.credit, is_demo: p.is_demo, active: p.active, junior_discount: p.junior_discount };
}
function slimFine(f) {
  return { id: f.id, fine_no: f.fine_no, player_id: f.player_id, player_name: f.player_name, category_number: f.category_number, category_name: f.category_name, issued_date: f.issued_date, amount: f.amount, base_amount: f.base_amount, discount_amount: f.discount_amount, discount_pct: f.discount_pct, status: f.status, is_demo: f.is_demo };
}
function slimPayment(p) {
  return { id: p.id, payment_no: p.payment_no, player_id: p.player_id, player_name: p.player_name, date: p.date, amount: p.amount, method: p.method, reversed: p.reversed, is_demo: p.is_demo };
}
function seasonMonths(st) {
  const end = st.today < st.season.end_date ? st.today : st.season.end_date;
  return monthsBetween(monthOf(st.season.start_date), monthOf(end < st.season.start_date ? st.season.start_date : end));
}
function monthlyChart(st) {
  return seasonMonths(st).map((m) => ({
    month: m,
    fines: st.fines.filter((f) => !f.voided && monthOf(f.issued_date) === m).reduce((s, f) => s + f.amount, 0),
    payments: st.payments.filter((p) => !p.reversed && monthOf(p.date) === m).reduce((s, p) => s + p.amount, 0),
  }));
}

// ---------- Kassa ----------
function cashSummary(st, settings) {
  const start = parseInt(settings.start_balance || '0', 10) || 0;
  const pays = st.payments.filter((p) => !p.reversed);
  const live = st.cash.filter((c) => !c.voided);
  const sum = (arr) => arr.reduce((s, x) => s + x.amount, 0);
  const received = sum(pays);
  const income = sum(live.filter((c) => c.type === 'income'));
  const refunds = sum(live.filter((c) => c.type === 'refund'));
  const expenses = sum(live.filter((c) => c.type === 'expense'));
  const events = [
    ...pays.map((p) => ({ kind: 'payment', no: p.payment_no, date: p.date, amount: p.amount, sign: 1, text: `Inbetalning – ${p.player_name} (${p.method})`, is_demo: p.is_demo, created_at: p.created_at })),
    ...st.payments.filter((p) => p.reversed).map((p) => ({ kind: 'payment_reversed', no: p.payment_no, date: p.date, amount: p.amount, sign: 0, text: `Återförd inbetalning – ${p.player_name}: ${p.reverse_reason}`, is_demo: p.is_demo, created_at: p.reversed_at })),
    ...st.cash.map((c) => ({ kind: c.type, id: c.id, no: c.event_no, date: c.date, amount: c.amount, sign: c.voided ? 0 : c.type === 'income' ? 1 : -1, voided: c.voided, void_reason: c.void_reason, text: c.description + (c.player_name ? ` – ${c.player_name}` : ''), is_demo: c.is_demo, created_at: c.created_at })),
  ].sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at));
  const monthly = seasonMonths(st).map((m) => {
    const inM = (d) => monthOf(d) === m;
    const r = {
      month: m,
      payments: sum(pays.filter((p) => inM(p.date))),
      income: sum(live.filter((c) => c.type === 'income' && inM(c.date))),
      refunds: sum(live.filter((c) => c.type === 'refund' && inM(c.date))),
      expenses: sum(live.filter((c) => c.type === 'expense' && inM(c.date))),
      fines_issued: st.fines.filter((f) => !f.voided && inM(f.issued_date)).reduce((s, f) => s + f.amount, 0),
    };
    r.net = r.payments + r.income - r.refunds - r.expenses;
    return r;
  });
  let running = start;
  for (const r of monthly) { running += r.net; r.balance = running; }
  return {
    totals: { start_balance: start, received, income, refunds, expenses, balance: start + received + income - refunds - expenses,
      issued: st.fines.filter((f) => !f.voided).reduce((s, f) => s + f.amount, 0),
      outstanding: st.players.reduce((s, p) => s + p.debt, 0),
      credits: st.players.reduce((s, p) => s + Math.max(0, p.credit), 0) },
    events, monthly,
  };
}

// ---------- Leaderboard ----------
function periodRange(st, q) {
  if (q.period === 'month' && isMonth(q.month)) return { from: monthStart(q.month), to: monthEnd(q.month), label: q.month };
  if (q.period === 'range' && isDate(q.from) && isDate(q.to) && q.from <= q.to) return { from: q.from, to: q.to, label: `${q.from} – ${q.to}` };
  return { from: st.season.start_date, to: st.season.end_date, label: `Säsong ${st.season.name}` };
}
function leaderboard(st, q) {
  const { from, to, label } = periodRange(st, q);
  const inR = (d) => d >= from && d <= to;
  const fines = st.fines.filter((f) => !f.voided && inR(f.issued_date));
  const pays = st.payments.filter((p) => !p.reversed && inR(p.date));
  const includeInactive = q.inactive === '1';
  const rows = st.players.filter((p) => p.active || includeInactive).map((p) => {
    const pf = fines.filter((f) => f.player_id === p.id);
    const amount = pf.reduce((s, f) => s + f.amount, 0);
    const paidOnThose = pf.reduce((s, f) => s + f.paid, 0);
    return {
      id: p.id, name: p.name, jersey: p.jersey, is_demo: p.is_demo, active: p.active,
      count: pf.length, amount, debt: p.debt,
      paid_in: pays.filter((x) => x.player_id === p.id).reduce((s, x) => s + x.amount, 0),
      paid_share: amount > 0 ? paidOnThose / amount : null,
      categories: new Set(pf.map((f) => f.category_number)).size,
    };
  });
  const sortKey = ['count', 'amount', 'debt'].includes(q.sort) ? q.sort : 'count';
  const tie = (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'sv');
  const most = rank(rows, (r) => r[sortKey], 'desc', tie);
  const payLeague = {
    paid_in: rank(rows, (r) => r.paid_in),
    paid_share: rank(rows.filter((r) => r.paid_share !== null), (r) => Math.round(r.paid_share * 1000)),
    lowest_debt: rank(rows, (r) => r.debt, 'asc'),
  };
  // Säsongsstatistik (skämtsamma tävlingskategorier – hålls åtskilda från skulder)
  const ref = st.today < to ? (st.today < from ? from : st.today) : to;
  const ws = weekStart(ref); const we = addDays(ws, 6);
  const weekFines = st.fines.filter((f) => !f.voided && f.issued_date >= ws && f.issued_date <= we);
  const maxWeek = weekFines.reduce((m, f) => Math.max(m, f.amount), 0);
  const refMonth = monthOf(ref);
  const monthPay = new Map();
  for (const p of st.payments) if (!p.reversed && monthOf(p.date) === refMonth) monthPay.set(p.player_id, (monthPay.get(p.player_id) || 0) + p.amount);
  const weekCounts = new Map();
  for (const f of fines) { const k = f.player_id + '|' + isoWeek(f.issued_date); weekCounts.set(k, (weekCounts.get(k) || 0) + 1); }
  let maxWeekCount = 0; for (const v of weekCounts.values()) maxWeekCount = Math.max(maxWeekCount, v);
  const catCounts = new Map();
  for (const f of fines) catCounts.set(f.category_number, { n: (catCounts.get(f.category_number)?.n || 0) + 1, name: f.category_name });
  let maxCat = 0; for (const v of catCounts.values()) maxCat = Math.max(maxCat, v.n);
  const maxCats = rows.reduce((m, r) => Math.max(m, r.categories), 0);
  const monthPayRows = [...monthPay].map(([id, v]) => ({ id, name: st.playerById.get(id).name, v }));
  const topMonthPay = monthPayRows.length ? sharesTop(rank(monthPayRows, (r) => r.v)) : [];
  const fun = {
    week: { from: ws, to: we, label: isoWeek(ref) },
    week_biggest: maxWeek ? weekFines.filter((f) => f.amount === maxWeek).map(slimFine) : [],
    month: refMonth,
    month_top_payer: topMonthPay.map((r) => ({ id: r.id, name: r.name, amount: r.v })),
    most_in_week: maxWeekCount ? [...weekCounts].filter(([, v]) => v === maxWeekCount).map(([k, v]) => { const [id, w] = k.split('|'); return { id, name: st.playerById.get(id).name, week: w, count: v }; }) : [],
    common_category: maxCat ? [...catCounts].filter(([, v]) => v.n === maxCat).map(([num, v]) => ({ number: num, name: v.name, count: v.n })) : [],
    most_categories: maxCats ? rows.filter((r) => r.categories === maxCats).map((r) => ({ id: r.id, name: r.name, count: r.categories })) : [],
  };
  return { range: { from, to, label }, sort: sortKey, most, pay: payLeague, fun };
}

// ---------- Specialregler ----------
// Regel 29: förseningsbot. Skuld kvar efter sista kalenderdagen i månaden (enligt betalningsdatum).
function rule29Candidates(st, ym, settings) {
  const end = monthEnd(ym);
  const ended = end < st.today;
  const lateCat = 29;
  const rows = [];
  for (const p of st.players) {
    const due = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.due_date <= end);
    let owed = 0; const items = [];
    for (const f of due) {
      const paidByEnd = st.allocs.filter((a) => a.fine_id === f.id && a.payment_date <= end).reduce((s, a) => s + a.amount, 0);
      const left = f.amount - paidByEnd;
      if (left > 0) { owed += left; items.push({ fine_no: f.fine_no, left, due_date: f.due_date }); }
    }
    if (owed <= 0) continue;
    const existing = st.fines.find((f) => f.player_id === p.id && !f.voided && f.rule_key === `R29:${ym}`);
    rows.push({ player_id: p.id, name: p.name, is_demo: p.is_demo, owed, items, existing: existing ? existing.fine_no : null, current_debt: p.debt });
  }
  void lateCat;
  return { period: ym, deadline: end, ended, enabled: settings.rule29_enabled === '1', rows };
}

// Regel 22: inga böter under en sammanhängande period (standard 14 dagar).
function rule22Candidates(st, settings) {
  const days = Math.max(1, parseInt(settings.rule22_days || '14', 10));
  const rows = [];
  for (const p of st.players.filter((x) => x.active)) {
    const created = todayStr(new Date(p.created_at));
    const fines = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.issued_date <= st.today);
    const lastFine = fines.reduce((m, f) => (f.issued_date > m ? f.issued_date : m), '');
    const base = [addDays(st.season.start_date, -1), addDays(created, -1), lastFine].sort().pop();
    const periodStart = addDays(base, 1); const periodEnd = addDays(base, days);
    const eligible = periodEnd < st.today && periodEnd <= st.season.end_date;
    rows.push({ player_id: p.id, name: p.name, is_demo: p.is_demo, last_fine: lastFine || null, days_without: daysBetween(base, st.today) - 1, period_start: periodStart, period_end: periodEnd, eligible, rule_key: `R22:${periodStart}` });
  }
  return { enabled: settings.rule22_enabled === '1', days, rows: rows.sort((a, b) => b.days_without - a.days_without) };
}

// Regel 23: minst böter efter säsong. Endast förslag – administratören väljer och registrerar manuellt.
function rule23Ranking(st, settings) {
  const rows = st.players.filter((p) => p.active).map((p) => {
    const amount = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.kind !== 'least_fines').reduce((s, f) => s + f.amount, 0);
    const existing = st.fines.find((f) => f.player_id === p.id && !f.voided && f.rule_key === `R23:${st.season.id}`);
    return { id: p.id, name: p.name, is_demo: p.is_demo, amount, existing: existing ? existing.fine_no : null };
  });
  return { enabled: settings.rule23_enabled === '1', season_end: st.season.end_date, season_over: st.today >= st.season.end_date, ranking: rank(rows, (r) => r.amount, 'asc') };
}

// ---------- Månadsvy ----------
async function monthView(db, st, ym, settings) {
  const end = monthEnd(ym); const start = monthStart(ym);
  const closing = await db.get('SELECT * FROM month_closings WHERE season_id = ? AND period = ?', st.season.id, ym);
  const openRows = st.players.map((p) => {
    const open = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.remaining > 0 && f.due_date <= end);
    if (!open.length) return null;
    return {
      player_id: p.id, name: p.name, is_demo: p.is_demo, credit: p.credit,
      amount: open.reduce((s, f) => s + f.remaining, 0),
      overdue_amount: open.filter((f) => f.overdue).reduce((s, f) => s + f.remaining, 0),
      earliest_due: open.reduce((m, f) => (!m || f.due_date < m ? f.due_date : m), null),
      fines: open.map((f) => ({ fine_no: f.fine_no, category: f.category_name, remaining: f.remaining, due_date: f.due_date, overdue: f.overdue })),
    };
  }).filter(Boolean).sort((a, b) => b.amount - a.amount);
  const issued = st.fines.filter((f) => !f.voided && f.issued_date >= start && f.issued_date <= end);
  const pays = st.payments.filter((p) => !p.reversed && p.date >= start && p.date <= end);
  return {
    period: ym, start, end, ended: end < st.today, closing, payment_info: settings.payment_info, team_name: settings.team_name,
    open: openRows,
    total_open: openRows.reduce((s, r) => s + r.amount, 0),
    overdue: st.fines.filter((f) => f.overdue && f.due_date <= end).map((f) => ({ ...slimFine(f), due_date: f.due_date, remaining: f.remaining })),
    late: rule29Candidates(st, ym, settings),
    summary: {
      fines_count: issued.length, fines_amount: issued.reduce((s, f) => s + f.amount, 0),
      payments_count: pays.length, payments_amount: pays.reduce((s, p) => s + p.amount, 0),
      voided: st.fines.filter((f) => f.voided && f.issued_date >= start && f.issued_date <= end).length,
    },
  };
}

module.exports = {
  TZ, todayStr, isDate, isMonth, addDays, daysBetween, monthOf, monthEnd, monthStart, defaultDueDate, weekStart, isoWeek,
  activeSeason, getSettings, loadState, rank, dashboard, cashSummary, leaderboard, rule29Candidates, rule22Candidates,
  rule23Ranking, monthView, slimFine, slimPayment,
};
