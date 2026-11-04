// Sidor: Översikt, Spelare, Spelarprofil, Böter, Inbetalningar
import { S, get, post, put, del, esc, kr, num, fmtDate, monthName, statusPill, demoTag, placeBadge, icon, isAdmin, isPlayer, canPay, barChart, empty, confirmDialog, toast, fail, copyText, reminderText, playerOpts, fineAmt, juniorTag } from './core.js';
import { fineForm, paymentForm, playerForm, importForm, fineDetail, paymentDetail, cashForm, reportForm, reportCard, decideReport, accountForm, swishCard, bindSwish, rule22AllFlow } from './forms.js';
import { refresh, loadSettings } from './app.js';

const kpi = (label, value, { cls = '', sub = '', href = '' } = {}) =>
  `<${href ? `a href="${href}"` : 'div'} class="kpi ${cls}"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</${href ? 'a' : 'div'}>`;

// ---------- Översikt ----------
async function playerDebtNotice() {
  const me = (await get(`/api/players/${encodeURIComponent(S.me.player_id)}`)).player;
  return me.debt > 0 ? `<div class="notice warn-notice">${icon('phone')}<div><b>Din skuld: ${kr(me.debt)}.</b> Betala enkelt med Swish från din sida.</div><a class="btn small primary" href="#/spelare/${esc(me.id)}">Betala din skuld</a></div>` : '';
}
export async function dashboard(el) {
  const d = await get('/api/dashboard');
  const admin = isAdmin();
  const am = d.active_month;
  const months = S.settings.season_months || [am];
  // Tre stora kort: allt hämtas från databasen via /api/dashboard.
  const hero = (cls, ic, label, value, sub, href, extra = '') => `<${href ? `a href="${href}"` : 'div'} class="hero-card ${cls}">
      <span class="hero-ic">${icon(ic)}</span><small>${label}</small><b>${value}</b><span class="hero-sub">${sub}</span>${extra}</${href ? 'a' : 'div'}>`;
  const monthPicker = admin ? `<label class="hero-month" title="Byt aktiv månad"><span class="sr-only">Aktiv månad</span><select data-active-month>${months.map((m) => `<option value="${m}" ${m === am ? 'selected' : ''}>${monthName(m)}</option>`).join('')}</select></label>` : '';
  el.innerHTML = `<div class="dash">
  <div class="dash-h"><h1>Översikt</h1><p class="muted">Säsong ${esc(d.season.name)} · aktiv månad <b class="am-chip">${esc(d.active_month_name)}</b></p></div>
    ${admin ? `<div class="btns dash-actions"><button class="btn primary" data-act="fine">${icon('plus')} Ny bot</button><button class="btn ghost" data-act="pay">${icon('coin')} Inbetalning</button><button class="btn ghost" data-act="r22all">${icon('check')} Registrera 2 veckor utan böter</button></div>`
    : isPlayer() ? `<div class="btns dash-actions"><button class="btn primary" data-act="report">${icon('flag')} Anmäl bot</button><a class="btn ghost" href="#/spelare/${esc(S.me.player_id)}">Min sida</a></div>` : ''}
  <section class="hero" aria-label="Böteskassan i siffror">
    ${hero('h-cash', 'wallet', 'Total kassa', kr(d.cash.balance), 'Pengar som faktiskt finns i kassan', '#/kassa')}
    ${hero('h-unpaid', 'alert', 'Obetalda böter', kr(d.unpaid_fines.amount), d.unpaid_fines.count ? `${num(d.unpaid_fines.count)} ${d.unpaid_fines.count === 1 ? 'obetald bot' : 'obetalda böter'} · ${d.unpaid_fines.players} ${d.unpaid_fines.players === 1 ? 'spelare' : 'spelare'}` : 'Alla böter är betalda 👏', '#/manad')}
    ${hero('h-month', 'calendar', `Böter ${esc(d.active_month_name)}`, kr(d.active_month_fines.amount), `${num(d.active_month_fines.count)} ${d.active_month_fines.count === 1 ? 'registrerad bot' : 'registrerade böter'} i ${esc(monthName(am))}`, admin ? '' : '#/boter', monthPicker)}
  </section>
  <div class="dash-rest">
  ${isPlayer() ? await playerDebtNotice() : ''}
  ${!isAdmin() && canPay() ? `<div class="notice">${icon('shield')}<div><b>Du har kassabehörighet.</b> Registrera betalningar som har kommit in.</div><a class="btn small ghost" href="#/registrera-betalning">Registrera betalningar</a></div>` : ''}
  ${d.reports.todo ? `<div class="notice warn-notice">${icon('flag')}<div>${admin ? `<b>${d.reports.todo} ${d.reports.todo === 1 ? 'anmälan' : 'anmälningar'} att hantera</b>${d.reports.disputed ? ` – varav ${d.reports.disputed} bestridda` : ''}.` : `<b>Du har ${d.reports.todo} ${d.reports.todo === 1 ? 'anmälan' : 'anmälningar'} att svara på.</b> Godkänn eller bestrid.`}</div><a class="btn small primary" href="#/anmalningar">Visa</a></div>` : ''}
  ${!d.players_total && admin ? `<div class="notice">${icon('info')}<div><b>Kom igång:</b> lägg till lagets spelare under <a href="#/spelare">Spelare</a> (en i taget eller via CSV-import). Böteslistan 2026/2027 är redan inlagd.</div></div>` : ''}
  <div class="cols dash-cols">
    <section class="card"><header><h2>Senaste böter</h2><a href="#/boter" class="link">Alla →</a></header>
      ${d.recent_fines.length ? `<ul class="feed">${d.recent_fines.slice(0, 6).map((f) => `<li data-fine="${f.id}"><span class="no">${esc(f.fine_no)}</span><span class="tx"><b>${esc(f.player_name)}</b><small>${esc(f.category_name)} · ${fmtDate(f.issued_date)}</small></span><span class="am">${kr(f.amount)}${f.discount_amount ? '<small class="jr">junior</small>' : ''}${statusPill(f.status)}</span></li>`).join('')}</ul>` : empty('Inga böter registrerade ännu.')}</section>
    <section class="card"><header><h2>Senaste betalningar</h2><a href="#/betalningar" class="link">Alla →</a></header>
      ${d.recent_payments.length ? `<ul class="feed">${d.recent_payments.slice(0, 6).map((p) => `<li data-pay="${p.id}"><span class="no">${esc(p.payment_no)}</span><span class="tx"><b>${esc(p.player_name)}</b><small>${esc(p.method)} · ${fmtDate(p.date)}</small></span><span class="am ${p.reversed ? 'struck' : 'pos'}">${kr(p.amount)}</span></li>`).join('')}</ul>` : empty('Inga betalningar ännu.')}</section>
    <section class="card"><header><h2>Obetalda böter</h2><a href="#/manad" class="link">Månadsskifte →</a></header>
      ${d.debtors.length ? `<ul class="feed debtors">${d.debtors.slice(0, 8).map((p) => `<li data-player="${esc(p.id)}"><span class="jno-badge">${esc(p.jersey || '–')}</span><span class="tx"><b>${esc(p.name)}</b>${demoTag(p.is_demo)}<small>${p.unpaid_count} ${p.unpaid_count === 1 ? 'obetald bot' : 'obetalda böter'}${p.overdue_amount ? ` · <span class="warn">${kr(p.overdue_amount)} försenat</span>` : ''}</small></span><span class="am neg">${kr(p.debt)}</span></li>`).join('')}</ul>${d.debtors.length > 8 ? `<p class="muted small more">+ ${d.debtors.length - 8} till – se Månadsskifte.</p>` : ''}` : empty('Ingen har obetalda böter. 👏')}</section>
  </div></div></div>`;
  el.onclick = (e) => {
    const a = e.target.closest('[data-act],[data-fine],[data-pay],[data-player]'); if (!a) return;
    if (a.dataset.act === 'fine') fineForm(); else if (a.dataset.act === 'pay') paymentForm(); else if (a.dataset.act === 'report') reportForm();
    else if (a.dataset.act === 'r22all') rule22AllFlow();
    else if (a.dataset.fine) fineDetail(a.dataset.fine); else if (a.dataset.pay) paymentDetail(a.dataset.pay);
    else if (a.dataset.player) location.hash = `#/spelare/${a.dataset.player}`;
  };
  el.querySelector('[data-active-month]')?.addEventListener('change', async (e) => {
    const sel = e.target; const prev = am;
    try {
      await put('/api/settings', { active_month: sel.value });
      await loadSettings();
      toast(`Aktiv månad: ${monthName(sel.value)}. Swish-meddelandet är nu "${S.settings.swish_message}".`);
      refresh();
    } catch (err) { sel.value = prev; fail(err); }
  });
}

// ---------- Spelare ----------
const pf = { q: '', status: 'active', debt: 'all', sort: 'name' };
export async function players(el) {
  const list = await get('/api/players');
  const admin = isAdmin();
  el.innerHTML = `
  <div class="page-h"><div><h1>Spelare</h1><p class="muted">${list.filter((p) => p.active).length} aktiva · ${list.filter((p) => !p.active).length} inaktiva</p></div>
    ${admin ? `<div class="btns"><button class="btn ghost" data-act="import">${icon('upload')} Importera CSV</button><a class="btn ghost" href="/api/export/spelare.csv">${icon('download')} Exportera</a><button class="btn primary" data-act="new">${icon('plus')} Ny spelare</button></div>` : ''}</div>
  <div class="toolbar">
    <input type="search" data-f="q" placeholder="Sök namn, nummer eller ID…" value="${esc(pf.q)}">
    <select data-f="status"><option value="all">Alla</option><option value="active">Aktiva</option><option value="inactive">Inaktiva</option></select>
    <select data-f="debt"><option value="all">Alla saldon</option><option value="debt">Med skuld</option><option value="nodebt">Utan skuld</option><option value="credit">Med tillgodo</option><option value="overdue">Med försenade</option></select>
    <select data-f="sort"><option value="name">Sortera: namn</option><option value="fines">Flest böter</option><option value="issued">Högst bötesbelopp</option><option value="debt">Högst skuld</option><option value="jersey">Tröjnummer</option></select>
  </div>
  <div data-list></div>`;
  el.querySelectorAll('[data-f]').forEach((i) => { i.value = pf[i.dataset.f]; i.oninput = () => { pf[i.dataset.f] = i.value; draw(); }; });
  function draw() {
    const q = pf.q.toLowerCase().trim();
    let rows = list.filter((p) => (pf.status === 'all' || (pf.status === 'active' ? p.active : !p.active))
      && (!q || `${p.name} ${p.jersey || ''} ${p.id} ${p.position || ''}`.toLowerCase().includes(q))
      && (pf.debt === 'all' || (pf.debt === 'debt' && p.debt > 0) || (pf.debt === 'nodebt' && p.debt === 0) || (pf.debt === 'credit' && p.credit > 0) || (pf.debt === 'overdue' && p.overdue_count > 0)));
    const sorters = { name: (a, b) => a.name.localeCompare(b.name, 'sv'), fines: (a, b) => b.fine_count - a.fine_count, issued: (a, b) => b.issued - a.issued, debt: (a, b) => b.debt - a.debt, jersey: (a, b) => (Number(a.jersey) || 999) - (Number(b.jersey) || 999) };
    rows = rows.sort((a, b) => sorters[pf.sort](a, b) || a.name.localeCompare(b.name, 'sv'));
    el.querySelector('[data-list]').innerHTML = !list.length
      ? empty('Inga spelare ännu. Lägg till lagets spelare för att börja.', admin ? '<button class="btn primary" data-act="new">Lägg till första spelaren</button>' : '')
      : !rows.length ? empty('Inga spelare matchar filtret.')
      : `<div class="tbl-wrap"><table class="tbl click players-tbl"><thead><tr><th>#</th><th>Spelare</th><th class="hide-m">Position</th><th class="r">Böter</th><th class="r hide-m">Utfärdat</th><th class="r hide-m">Inbetalt</th><th class="r">Skuld</th><th class="r hide-m">Obetalda</th><th class="hide-m">Senaste inbetalning</th></tr></thead><tbody>
        ${rows.map((p) => `<tr data-id="${esc(p.id)}" class="${p.active ? '' : 'dim'}"><td class="jersey">${esc(p.jersey || '')}</td><td><b>${esc(p.name)}</b> ${demoTag(p.is_demo)}${juniorTag(p)}${p.active ? '' : ' <span class="pill grey">Inaktiv</span>'}<br><small class="muted">${esc(p.id)}</small></td>
          <td class="hide-m">${esc(p.position || '')}</td><td class="r">${p.fine_count}</td><td class="r hide-m">${kr(p.issued)}</td><td class="r hide-m">${kr(p.paid)}</td>
          <td class="r"><b class="${p.debt ? 'neg' : ''}">${kr(p.debt)}</b>${p.credit > 0 ? `<br><small class="pos">+${kr(p.credit)} tillgodo</small>` : ''}${p.overdue_count ? `<br><small class="warn">${p.overdue_count} försenade</small>` : ''}</td>
          <td class="r hide-m">${p.unpaid_count}</td><td class="hide-m">${fmtDate(p.last_payment)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  draw();
  el.onclick = (e) => {
    const a = e.target.closest('[data-act]');
    if (a?.dataset.act === 'new') return playerForm();
    if (a?.dataset.act === 'import') return importForm();
    const tr = e.target.closest('tr[data-id]'); if (tr) location.hash = `#/spelare/${tr.dataset.id}`;
  };
}

// ---------- Spelarprofil ----------
let profileTab = 'fines';
export async function profile(el, [id]) {
  const d = await get(`/api/players/${encodeURIComponent(id)}`);
  const p = d.player; const admin = isAdmin();
  const own = isPlayer() && p.id === S.me.player_id;
  const swish = own ? await swishCard() : '';
  const overdue = d.fines.filter((f) => f.overdue);
  const canDelete = !d.fines.length && !d.payments.length && !d.refunds.length;
  const catRows = Object.entries(d.categories).sort((a, b) => b[1].amount - a[1].amount);
  const maxCat = Math.max(1, ...catRows.map(([, v]) => v.amount));
  el.innerHTML = `
  <a href="#/spelare" class="back">← Spelare</a>
  <div class="profile-h">
    <div class="avatar">${esc(p.jersey || (p.first_name[0] + p.last_name[0]))}</div>
    <div class="who"><h1>${esc(p.name)} ${demoTag(p.is_demo)}</h1>${juniorTag(p)}
      <p class="muted">${esc(p.id)}${p.position ? ` · ${esc(p.position)}` : ''}${p.jersey ? ` · #${esc(p.jersey)}` : ''} · ${p.active ? '<span class="pill green">Aktiv</span>' : '<span class="pill grey">Inaktiv</span>'}${d.place ? ` · Plats ${d.place} av ${d.of} i leaderboard` : ''}</p></div>
    ${admin ? `<div class="btns">
      ${p.active ? `<button class="btn primary" data-act="fine">${icon('plus')} Bot</button>` : ''}
      <button class="btn ghost" data-act="pay">${icon('coin')} Inbetalning</button>
      <button class="btn ghost" data-act="edit">${icon('edit')} Redigera</button>
      <button class="btn ghost" data-act="toggle">${p.active ? 'Inaktivera' : 'Aktivera'}</button>
      ${canDelete ? `<button class="btn ghost danger" data-act="delete">${icon('trash')} Ta bort</button>` : ''}</div>` : isPlayer() && p.active && p.id !== S.me.player_id && !p.is_demo ? `<div class="btns"><button class="btn primary" data-act="report">${icon('flag')} Anmäl bot</button></div>` : ''}
  </div>
  ${swish}
  ${admin && !p.is_demo ? `<section class="card admin-box"><div class="admin-row">
      <label class="switch sm-row"><input type="checkbox" data-junior ${p.junior_discount ? 'checked' : ''}><span></span><div><b>Juniorrabatt 50 %</b><small>Dras på alla nya böter när de blir officiella. Ordinarie belopp i böteslistan ändras inte, och befintliga böter ändras inte. Kopplad till spelaren – inte till tröjnumret.</small></div></label>
    </div><div class="admin-row">
      <div class="acc">${icon('key')}<div><b>Spelarkonto</b><small>${d.account ? (d.account.active ? `Aktivt – loggar in med tröjnummer <b>${esc(p.jersey || '?')}</b>` : 'Avstängt') : 'Inget konto ännu'}</small></div></div>
      ${d.account ? '<a class="btn small ghost" href="#/installningar" data-act="users">Hantera konton</a>' : `<button class="btn small ghost" data-act="account">${icon('plus')} Skapa konto</button>`}
    </div><div class="admin-row">
      <label class="switch sm-row"><input type="checkbox" data-paperm ${p.can_register_payments ? 'checked' : ''}><span></span><div><b>Kassabehörighet – får registrera verifierade betalningar</b><small>Ger tillgång till sidan Registrera betalningar (hel- och delbetalningar efter kontroll). Kan inte ändra böter, rabatter, inställningar eller behörigheter, och kan inte rätta betalningar. Kopplad till spelaren – inte tröjnumret.</small></div></label>
    </div></section>` : ''}
  <section class="kpis">
    ${kpi('Utfärdade böter', kr(p.issued), { sub: `${p.fine_count} st`, cls: 'accent' })}
    ${kpi('Totalt betalt', kr(p.paid), { cls: 'pos', sub: p.refunded ? `${kr(p.refunded)} återbetalt` : '' })}
    ${kpi('Återstående skuld', kr(p.debt), { cls: p.debt ? 'neg' : '', sub: `${p.unpaid_count} obetalda böter` })}
    ${kpi('Tillgodohavande', kr(Math.max(0, p.credit)), { cls: p.credit > 0 ? 'pos' : '', sub: p.discounted ? `juniorrabatt hittills ${kr(p.discounted)}` : '' })}
    ${kpi('Förfallet', kr(p.overdue_amount), { cls: p.overdue_count ? 'warn' : '', sub: `${p.overdue_count} försenade` })}
    ${kpi('Senaste betalning', fmtDate(p.last_payment))}
  </section>
  ${admin && p.credit > 0 ? `<div class="notice ok">${icon('info')}<div>${esc(p.first_name)} har <b>${kr(p.credit)}</b> i tillgodohavande som inte är fördelat.</div><div class="btns">${p.debt ? '<button class="btn small primary" data-act="alloc">Fördela mot obetalda böter</button>' : ''}<button class="btn small ghost" data-act="refund">Återbetala</button></div></div>` : ''}
  ${p.debt && admin ? `<div class="notice">${icon('chat')}<div>Skicka en påminnelse manuellt via lagets chatt.</div><button class="btn small ghost" data-act="remind">Kopiera påminnelse</button></div>` : ''}
  ${p.notes ? `<div class="card notes"><small>Anteckningar</small><p>${esc(p.notes)}</p></div>` : ''}
  <div class="tabs" role="tablist">${[['fines', `Böter (${d.fines.length})`], ['reports', `Anmälningar (${d.reports.length})`], ['payments', `Betalningar (${d.payments.length})`], ['history', 'Historik'], ['stats', 'Statistik']].map(([k, l]) => `<button role="tab" class="${profileTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
  <div data-tabbody></div>`;
  const bodies = {
    fines: () => (d.fines.length ? `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>Nr</th><th>Datum</th><th>Kategori</th><th class="r">Belopp</th><th class="r hide-m">Kvar</th><th>Status</th><th class="hide-m">Förfaller</th></tr></thead><tbody>
      ${d.fines.map((f) => `<tr data-fine="${f.id}" class="${f.voided ? 'struck' : ''}"><td><b>${esc(f.fine_no)}</b></td><td>${fmtDate(f.issued_date)}</td><td>${esc(f.category_name)}${f.description ? `<br><small class="muted">${esc(f.description)}</small>` : ''}</td><td class="r">${fineAmt(f)}</td><td class="r hide-m">${kr(f.remaining)}</td><td>${statusPill(f.status)}</td><td class="hide-m ${f.overdue ? 'neg' : ''}">${fmtDate(f.due_date)}</td></tr>`).join('')}</tbody></table></div>` : empty('Inga böter – ännu.')),
    payments: () => (d.payments.length || d.refunds.length ? `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>ID</th><th>Datum</th><th>Metod</th><th class="r">Belopp</th><th class="r hide-m">Fördelat</th><th>Status</th></tr></thead><tbody>
      ${d.payments.map((x) => `<tr data-pay="${x.id}" class="${x.reversed ? 'struck' : ''}"><td><b>${esc(x.payment_no)}</b></td><td>${fmtDate(x.date)}</td><td>${esc(x.method)}${x.reference ? `<br><small class="muted">${esc(x.reference)}</small>` : ''}</td><td class="r pos">${kr(x.amount)}</td><td class="r hide-m">${kr(x.allocated)}</td><td>${x.reversed ? '<span class="pill grey">Återförd</span>' : x.unallocated ? `<span class="pill ice">${kr(x.unallocated)} ofördelat</span>` : '<span class="pill green">Fördelad</span>'}</td></tr>`).join('')}
      ${d.refunds.map((c) => `<tr class="${c.voided ? 'struck' : ''}"><td><b>${esc(c.event_no)}</b></td><td>${fmtDate(c.date)}</td><td>Återbetalning</td><td class="r neg">−${kr(c.amount)}</td><td class="hide-m"></td><td>${c.voided ? '<span class="pill grey">Makulerad</span>' : '<span class="pill amber">Återbetald</span>'}</td></tr>`).join('')}</tbody></table></div>` : empty('Inga betalningar ännu.')),
    reports: () => (d.reports.length ? `<p class="muted small">Anmälningar mot ${esc(p.first_name)}. Bara godkända anmälningar blir böter och räknas i skulden.</p><div class="rep-list">${d.reports.map(reportCard).join('')}</div>` : empty('Inga anmälningar.')),
    history: () => (d.history.length ? `<ul class="timeline">${d.history.map((h) => `<li class="t-${h.type}"><span class="dot"></span><div><b>${esc(h.text)}</b><small>${fmtDate(h.date)} · ${kr(h.amount)}</small></div></li>`).join('')}</ul>` : empty('Ingen historik.')),
    stats: () => (catRows.length ? `<div class="card"><h3>Böter per kategori</h3><ul class="hbars">${catRows.map(([n, v]) => `<li><span>${esc(n)}</span><div class="hb"><i style="width:${(v.amount / maxCat) * 100}%"></i></div><b>${v.count} st · ${kr(v.amount)}</b></li>`).join('')}</ul>
      <p class="muted small">Andel betald: ${p.issued ? Math.round((p.allocated / p.issued) * 100) : 0} % · Snittbot: ${p.fine_count ? kr(Math.round(p.issued / p.fine_count)) : '–'} · ${overdue.length} försenade</p></div>` : empty('Ingen statistik ännu.')),
  };
  const drawTab = () => { el.querySelector('[data-tabbody]').innerHTML = bodies[profileTab](); el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === profileTab)); };
  drawTab();
  if (own) bindSwish(el);
  el.querySelector('[data-paperm]')?.addEventListener('change', async (e) => {
    const on = e.target.checked;
    const ok = await confirmDialog({ title: on ? `Ge ${p.name} kassabehörighet?` : `Återkalla kassabehörighet för ${p.name}?`, text: on ? `${esc(p.first_name)} får registrera betalningar som hen har kontrollerat har kommit in. Allt loggas med namn och tid.` : 'Sidan Registrera betalningar försvinner direkt för spelaren. Redan registrerade betalningar ändras inte.', confirm: on ? 'Ge behörighet' : 'Återkalla', danger: !on });
    if (!ok) { e.target.checked = !on; return; }
    try { await post(`/api/players/${encodeURIComponent(p.id)}/payment-permission`, { enabled: on }); toast(on ? 'Kassabehörighet given.' : 'Kassabehörighet återkallad.'); refresh(); } catch (err) { fail(err); e.target.checked = !on; }
  });
  el.querySelector('[data-junior]')?.addEventListener('change', async (e) => {
    const on = e.target.checked;
    const ok = await confirmDialog({ title: on ? `Aktivera juniorrabatt för ${p.name}?` : `Stäng av juniorrabatt för ${p.name}?`, text: on ? '50 % dras automatiskt på alla böter som blir officiella från och med nu. Befintliga böter ändras inte.' : 'Nya böter blir fullt pris. Befintliga böter med rabatt ändras inte.', confirm: on ? 'Aktivera' : 'Stäng av', danger: !on });
    if (!ok) { e.target.checked = !on; return; }
    try { await post(`/api/players/${encodeURIComponent(p.id)}/junior-discount`, { enabled: on }); toast(on ? 'Juniorrabatt aktiverad.' : 'Juniorrabatt avstängd.'); refresh(); } catch (err) { fail(err); e.target.checked = !on; }
  });
  el.onclick = async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { profileTab = t.dataset.tab; return drawTab(); }
    const fr = e.target.closest('[data-fine],[data-fineno]'); if (fr) { e.preventDefault(); return fineDetail(fr.dataset.fine || fr.dataset.fineno); }
    const rb = e.target.closest('[data-rep]'); if (rb) { const r = d.reports.find((x) => x.id === Number(rb.dataset.rid)); return r && decideReport(r, rb.dataset.rep, rb.closest('.rep')); }
    const pr = e.target.closest('[data-pay]'); if (pr) return paymentDetail(pr.dataset.pay);
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'fine') fineForm({ playerId: p.id });
    else if (act === 'report') reportForm({ playerId: p.id });
    else if (act === 'account') accountForm(p);
    else if (act === 'users') { const { setSettingsTab } = await import('./pages2.js'); setSettingsTab('users'); }
    else if (act === 'pay') paymentForm({ playerId: p.id });
    else if (act === 'edit') playerForm(p);
    else if (act === 'refund') cashForm('refund', p.id);
    else if (act === 'remind') {
      const open = d.fines.filter((f) => f.remaining > 0);
      copyText(reminderText({ name: p.name, amount: p.debt, overdue_amount: p.overdue_amount, earliest_due: open.reduce((m, f) => (!m || f.due_date < m ? f.due_date : m), null), fines: open.map((f) => ({ fine_no: f.fine_no, category: f.category_name, remaining: f.remaining })) }, S.settings));
    } else if (act === 'alloc') {
      try { const r = await post(`/api/players/${encodeURIComponent(p.id)}/allocate-credit`, { mode: 'auto' }); toast(`${kr(r.allocated)} fördelat mot obetalda böter (äldst först).`); refresh(); } catch (err) { fail(err); }
    } else if (act === 'toggle') {
      const ok = await confirmDialog({ title: p.active ? `Inaktivera ${p.name}?` : `Aktivera ${p.name}?`, text: p.active ? 'Spelaren försvinner från listor över aktiva spelare och kan inte få nya böter. All historik, skuld och alla betalningar finns kvar.' : 'Spelaren blir aktiv igen.', confirm: p.active ? 'Inaktivera' : 'Aktivera', danger: p.active });
      if (!ok) return;
      try { await post(`/api/players/${encodeURIComponent(p.id)}/active`, { active: !p.active }); toast('Sparat.'); refresh(); } catch (err) { fail(err); }
    } else if (act === 'delete') {
      const ok = await confirmDialog({ title: `Ta bort ${p.name}?`, text: 'Spelaren har ingen historik och tas bort helt. Detta kan inte ångras.', confirm: 'Ta bort' });
      if (!ok) return;
      try { await del(`/api/players/${encodeURIComponent(p.id)}`); toast('Spelaren borttagen.'); location.hash = '#/spelare'; } catch (err) { fail(err); }
    }
  };
}

// ---------- Bötesregister ----------
const ff = { q: '', player: '', cat: '', status: '', from: '', to: '', min: '', max: '', sort: 'date_desc' };
export async function fines(el) {
  const [list, playersList, cats] = await Promise.all([get('/api/fines'), get('/api/players'), get('/api/categories')]);
  const admin = isAdmin();
  el.innerHTML = `
  <div class="page-h"><div><h1>Bötesregister</h1><p class="muted">Alla böter säsongen ${esc(S.settings.season.name)}. Bötesnummer återanvänds aldrig.</p></div>
    <div class="btns">${admin ? `<a class="btn ghost" href="/api/export/boter.csv">${icon('download')} Exportera CSV</a><button class="btn primary" data-act="new">${icon('plus')} Registrera bot</button>` : ''}</div></div>
  <div class="toolbar wrap">
    <input type="search" data-f="q" placeholder="Bötesnummer eller text…">
    <select data-f="player"><option value="">Alla spelare</option>${playerOpts(playersList, '', { activeOnly: false })}</select>
    <select data-f="cat"><option value="">Alla kategorier</option>${cats.map((c) => `<option value="${c.number}">${c.number}. ${esc(c.name)}</option>`).join('')}</select>
    <select data-f="status"><option value="">Alla statusar</option><option value="obetald">Obetald</option><option value="delvis">Delvis betald</option><option value="betald">Betald</option><option value="makulerad">Makulerad</option><option value="overdue">Försenad</option></select>
    <label class="mini">Från <input type="date" data-f="from"></label><label class="mini">Till <input type="date" data-f="to"></label>
    <input data-f="min" inputmode="numeric" placeholder="Min kr" class="narrow"><input data-f="max" inputmode="numeric" placeholder="Max kr" class="narrow">
    <select data-f="sort"><option value="date_desc">Nyast först</option><option value="date_asc">Äldst först</option><option value="amount_desc">Högst belopp</option><option value="amount_asc">Lägst belopp</option><option value="no_desc">Bötesnummer ↓</option></select>
    <button class="btn ghost small" data-act="clear">Rensa</button>
  </div>
  <div class="sumbar" data-sum></div>
  <div data-list></div>`;
  el.querySelectorAll('[data-f]').forEach((i) => { i.value = ff[i.dataset.f]; i.oninput = () => { ff[i.dataset.f] = i.value; draw(); }; });
  function draw() {
    const q = ff.q.toLowerCase().trim();
    const min = ff.min ? Number(ff.min) * 100 : null; const max = ff.max ? Number(ff.max) * 100 : null;
    let rows = list.filter((f) => (!q || `${f.fine_no} ${f.description} ${f.category_name} ${f.player_name}`.toLowerCase().includes(q))
      && (!ff.player || f.player_id === ff.player) && (!ff.cat || f.category_number === Number(ff.cat))
      && (!ff.status || (ff.status === 'overdue' ? f.overdue : f.status === ff.status))
      && (!ff.from || f.issued_date >= ff.from) && (!ff.to || f.issued_date <= ff.to)
      && (min == null || f.amount >= min) && (max == null || f.amount <= max));
    const s = { date_desc: (a, b) => b.issued_date.localeCompare(a.issued_date) || b.id - a.id, date_asc: (a, b) => a.issued_date.localeCompare(b.issued_date) || a.id - b.id, amount_desc: (a, b) => b.amount - a.amount, amount_asc: (a, b) => a.amount - b.amount, no_desc: (a, b) => b.id - a.id };
    rows = rows.sort(s[ff.sort]);
    const live = rows.filter((f) => !f.voided);
    el.querySelector('[data-sum]').innerHTML = `<span>${rows.length} böter</span><span>Belopp <b>${kr(live.reduce((x, f) => x + f.amount, 0))}</b></span><span>Betalt <b class="pos">${kr(live.reduce((x, f) => x + f.paid, 0))}</b></span><span>Kvar <b class="neg">${kr(live.reduce((x, f) => x + f.remaining, 0))}</b></span>`;
    el.querySelector('[data-list]').innerHTML = !list.length ? empty('Inga böter registrerade ännu.', admin ? '<button class="btn primary" data-act="new">Registrera första boten</button>' : '')
      : !rows.length ? empty('Inga böter matchar filtret.')
      : `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>Nr</th><th>Datum</th><th>Spelare</th><th>Kategori</th><th class="r">Belopp</th><th>Status</th><th class="hide-m">Förfaller</th><th class="hide-m">Av</th></tr></thead><tbody>
        ${rows.slice(0, 500).map((f) => `<tr data-fine="${f.id}" class="${f.voided ? 'struck' : ''}"><td><b>${esc(f.fine_no)}</b> ${demoTag(f.is_demo)}</td><td>${fmtDate(f.issued_date)}</td><td>${esc(f.player_name)}</td>
          <td><span class="catno">${f.category_number}</span> ${esc(f.category_name)}${f.description ? `<br><small class="muted">${esc(f.description)}</small>` : ''}</td>
          <td class="r"><b>${kr(f.amount)}</b>${f.discount_amount ? `<br><small class="muted">ord. ${kr(f.base_amount)} · junior −${kr(f.discount_amount)}</small>` : ''}${f.status === 'delvis' ? `<br><small class="muted">kvar ${kr(f.remaining)}</small>` : ''}</td><td>${statusPill(f.status)}</td>
          <td class="hide-m ${f.overdue ? 'neg' : ''}">${fmtDate(f.due_date)}${f.overdue ? ' ⚠' : ''}</td><td class="hide-m muted">${esc(f.registered_by)}</td></tr>`).join('')}</tbody></table>${rows.length > 500 ? '<p class="muted small">Visar 500 första – filtrera för fler.</p>' : ''}</div>`;
  }
  draw();
  el.onclick = (e) => {
    const a = e.target.closest('[data-act]');
    if (a?.dataset.act === 'new') return fineForm();
    if (a?.dataset.act === 'clear') { Object.assign(ff, { q: '', player: '', cat: '', status: '', from: '', to: '', min: '', max: '', sort: 'date_desc' }); el.querySelectorAll('[data-f]').forEach((i) => (i.value = ff[i.dataset.f])); return draw(); }
    const tr = e.target.closest('[data-fine]'); if (tr) fineDetail(tr.dataset.fine);
  };
}

// ---------- Inbetalningar ----------
const pyf = { q: '', player: '', method: '', status: 'active' };
export async function payments(el) {
  const [list, playersList] = await Promise.all([get('/api/payments'), get('/api/players')]);
  const admin = isAdmin();
  const credits = playersList.filter((p) => p.credit > 0);
  el.innerHTML = `
  <div class="page-h"><div><h1>Inbetalningar</h1><p class="muted">Mottagna pengar. Betalningar raderas aldrig – felaktiga återförs med anledning.</p></div>
    ${admin ? `<div class="btns"><a class="btn ghost" href="/api/export/inbetalningar.csv">${icon('download')} Exportera CSV</a><button class="btn primary" data-act="new">${icon('coin')} Registrera inbetalning</button></div>` : ''}</div>
  ${credits.length ? `<div class="notice ok">${icon('info')}<div><b>Tillgodohavanden:</b> ${credits.map((p) => `<a href="#/spelare/${esc(p.id)}">${esc(p.name)}</a> ${kr(p.credit)}`).join(' · ')}<br><small>Överskott visas separat tills det fördelats mot böter eller återbetalats (via spelarens sida).</small></div></div>` : ''}
  <div class="toolbar">
    <input type="search" data-f="q" placeholder="ID, referens eller kommentar…">
    <select data-f="player"><option value="">Alla spelare</option>${playerOpts(playersList, '', { activeOnly: false })}</select>
    <select data-f="method"><option value="">Alla metoder</option>${S.settings.methods.map((m) => `<option>${m}</option>`).join('')}</select>
    <select data-f="status"><option value="active">Aktiva</option><option value="reversed">Återförda</option><option value="">Alla</option></select>
  </div>
  <div class="sumbar" data-sum></div>
  <div data-list></div>`;
  el.querySelectorAll('[data-f]').forEach((i) => { i.value = pyf[i.dataset.f]; i.oninput = () => { pyf[i.dataset.f] = i.value; draw(); }; });
  function draw() {
    const q = pyf.q.toLowerCase();
    const rows = list.filter((p) => (!q || `${p.payment_no} ${p.reference} ${p.comment} ${p.player_name}`.toLowerCase().includes(q)) && (!pyf.player || p.player_id === pyf.player)
      && (!pyf.method || p.method === pyf.method) && (!pyf.status || (pyf.status === 'reversed' ? p.reversed : !p.reversed)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const live = rows.filter((p) => !p.reversed);
    el.querySelector('[data-sum]').innerHTML = `<span>${rows.length} betalningar</span><span>Summa <b class="pos">${kr(live.reduce((x, p) => x + p.amount, 0))}</b></span><span>Ofördelat <b>${kr(live.reduce((x, p) => x + p.unallocated, 0))}</b></span>`;
    el.querySelector('[data-list]').innerHTML = !list.length ? empty('Inga inbetalningar registrerade ännu.') : !rows.length ? empty('Inga betalningar matchar filtret.')
      : `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>ID</th><th>Datum</th><th>Spelare</th><th class="r">Belopp</th><th class="r hide-m">Fördelat</th><th class="hide-m">Metod</th><th class="hide-m">Referens</th><th>Status</th></tr></thead><tbody>
      ${rows.map((p) => `<tr data-pay="${p.id}" class="${p.reversed ? 'struck' : ''}"><td><b>${esc(p.payment_no)}</b> ${demoTag(p.is_demo)}</td><td>${fmtDate(p.date)}</td><td>${esc(p.player_name)}</td><td class="r pos"><b>${kr(p.amount)}</b></td><td class="r hide-m">${kr(p.allocated)}</td><td class="hide-m">${esc(p.method)}</td><td class="hide-m muted">${esc(p.reference)}</td>
        <td>${p.reversed ? '<span class="pill grey">Återförd</span>' : p.unallocated ? `<span class="pill ice">${kr(p.unallocated)} tillgodo</span>` : '<span class="pill green">Fördelad</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  draw();
  el.onclick = (e) => {
    if (e.target.closest('[data-act=new]')) return paymentForm();
    const tr = e.target.closest('[data-pay]'); if (tr) paymentDetail(tr.dataset.pay);
  };
}
