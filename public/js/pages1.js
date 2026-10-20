// Sidor: Översikt, Spelare, Spelarprofil, Böter, Inbetalningar
import { S, get, post, del, esc, kr, num, fmtDate, monthName, statusPill, demoTag, placeBadge, icon, isAdmin, barChart, empty, confirmDialog, toast, fail, copyText, reminderText, playerOpts } from './core.js';
import { fineForm, paymentForm, playerForm, importForm, fineDetail, paymentDetail, cashForm } from './forms.js';
import { refresh } from './app.js';

const kpi = (label, value, { cls = '', sub = '', href = '' } = {}) =>
  `<${href ? `a href="${href}"` : 'div'} class="kpi ${cls}"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</${href ? 'a' : 'div'}>`;
const names = (arr, f) => (arr.length ? arr.map((x) => `<a href="#/spelare/${esc(x.id)}">${esc(x.name)}</a>`).join(', ') + (f ? ` <small>${f(arr[0])}</small>` : '') : '<span class="muted">–</span>');

// ---------- Översikt ----------
export async function dashboard(el) {
  const d = await get('/api/dashboard');
  const admin = isAdmin();
  el.innerHTML = `
  <div class="page-h"><div><h1>Översikt</h1><p class="muted">Säsong ${esc(d.season.name)} · ${monthName(d.month)}</p></div>
    ${admin ? `<div class="btns"><button class="btn primary" data-act="fine">${icon('plus')} Ny bot</button><button class="btn ghost" data-act="pay">${icon('coin')} Inbetalning</button></div>` : ''}</div>
  ${!d.players_total && admin ? `<div class="notice">${icon('info')}<div><b>Kom igång:</b> lägg till lagets spelare under <a href="#/spelare">Spelare</a> (en i taget eller via CSV-import). Böteslistan 2026/2027 är redan inlagd.</div></div>` : ''}
  <section class="kpis">
    ${kpi('Utfärdade böter', kr(d.fines_amount), { sub: `${num(d.fines_count)} st${d.fines_voided ? ` · ${d.fines_voided} makulerade` : ''}`, href: '#/boter', cls: 'accent' })}
    ${kpi('Inbetalt', kr(d.paid_in), { cls: 'pos', href: '#/betalningar' })}
    ${kpi('Obetalt', kr(d.unpaid), { cls: d.unpaid ? 'neg' : '', sub: `${d.players_with_debt} spelare med skuld`, href: '#/manad' })}
    ${kpi('Försenade', num(d.overdue_count), { cls: d.overdue_count ? 'warn' : '', sub: d.overdue_count ? `${kr(d.overdue_amount)} förfallet` : 'inga förfallna böter', href: '#/manad' })}
    ${kpi('Kassans saldo', kr(d.cash.balance), { cls: 'ice', sub: 'faktiska pengar', href: '#/kassa' })}
    ${kpi('Spelare', num(d.players_active), { sub: `${d.players_total} totalt`, href: '#/spelare' })}
  </section>
  <section class="facts">
    <div><small>Månadens största botbetalare</small><p>${names(d.month_top_payer, (x) => kr(x.amount))}</p></div>
    <div><small>Flest böter</small><p>${names(d.most_fines, (x) => `${x.fine_count} st`)}</p></div>
    <div><small>Minst böter</small><p>${names(d.least_fines, (x) => `${x.fine_count} st`)}</p></div>
  </section>
  <div class="cols">
    <section class="card span2"><header><h2>Böter och inbetalningar per månad</h2></header>
      ${barChart(d.chart, [{ key: 'fines', label: 'Utfärdade böter', cls: 's-fine' }, { key: 'payments', label: 'Inbetalningar', cls: 's-pay' }])}</section>
    <section class="card"><header><h2>Böteskassan</h2><a href="#/kassa" class="link">Kassa →</a></header>
      <dl class="ledger">
        <dt>Startsaldo</dt><dd>${kr(d.cash.start_balance)}</dd>
        <dt>+ Inbetalningar</dt><dd class="pos">${kr(d.cash.received)}</dd>
        <dt>+ Övriga inkomster</dt><dd class="pos">${kr(d.cash.income)}</dd>
        <dt>− Återbetalningar</dt><dd class="neg">${kr(d.cash.refunds)}</dd>
        <dt>− Utgifter</dt><dd class="neg">${kr(d.cash.expenses)}</dd>
        <dt class="tot">Saldo i kassan</dt><dd class="tot">${kr(d.cash.balance)}</dd>
      </dl>
      <p class="muted small">Obetalda böter (${kr(d.unpaid)}) räknas inte som pengar i kassan förrän de betalats.${d.credit_total ? ` Spelarnas tillgodohavanden: ${kr(d.credit_total)}.` : ''}</p></section>
  </div>
  <div class="cols">
    <section class="card"><header><h2>Leaderboard</h2><a href="#/leaderboard" class="link">Alla →</a></header>
      ${d.leaderboard.length ? `<ol class="lb">${d.leaderboard.map((p) => `<li><a href="#/spelare/${esc(p.id)}">${placeBadge(p.place)}<span class="nm"><span>${esc(p.name)}</span>${demoTag(p.is_demo)}</span><span class="muted">${p.fine_count} st</span><b>${kr(p.issued)}</b></a></li>`).join('')}</ol>` : empty('Inga spelare ännu.')}</section>
    <section class="card"><header><h2>Senaste böter</h2><a href="#/boter" class="link">Register →</a></header>
      ${d.recent_fines.length ? `<ul class="feed">${d.recent_fines.map((f) => `<li data-fine="${f.id}"><span class="no">${esc(f.fine_no)}</span><span class="tx"><b>${esc(f.player_name)}</b><small>${esc(f.category_name)} · ${fmtDate(f.issued_date)}</small></span><span class="am">${kr(f.amount)}${statusPill(f.status)}</span></li>`).join('')}</ul>` : empty('Inga böter registrerade ännu.')}</section>
    <section class="card"><header><h2>Senaste inbetalningar</h2><a href="#/betalningar" class="link">Alla →</a></header>
      ${d.recent_payments.length ? `<ul class="feed">${d.recent_payments.map((p) => `<li data-pay="${p.id}"><span class="no">${esc(p.payment_no)}</span><span class="tx"><b>${esc(p.player_name)}</b><small>${esc(p.method)} · ${fmtDate(p.date)}</small></span><span class="am ${p.reversed ? 'struck' : 'pos'}">${kr(p.amount)}</span></li>`).join('')}</ul>` : empty('Inga inbetalningar ännu.')}</section>
  </div>`;
  el.onclick = (e) => {
    const a = e.target.closest('[data-act],[data-fine],[data-pay]'); if (!a) return;
    if (a.dataset.act === 'fine') fineForm(); else if (a.dataset.act === 'pay') paymentForm();
    else if (a.dataset.fine) fineDetail(a.dataset.fine); else if (a.dataset.pay) paymentDetail(a.dataset.pay);
  };
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
        ${rows.map((p) => `<tr data-id="${esc(p.id)}" class="${p.active ? '' : 'dim'}"><td class="jersey">${esc(p.jersey || '')}</td><td><b>${esc(p.name)}</b> ${demoTag(p.is_demo)}${p.active ? '' : ' <span class="pill grey">Inaktiv</span>'}<br><small class="muted">${esc(p.id)}</small></td>
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
  const overdue = d.fines.filter((f) => f.overdue);
  const canDelete = !d.fines.length && !d.payments.length && !d.refunds.length;
  const catRows = Object.entries(d.categories).sort((a, b) => b[1].amount - a[1].amount);
  const maxCat = Math.max(1, ...catRows.map(([, v]) => v.amount));
  el.innerHTML = `
  <a href="#/spelare" class="back">← Spelare</a>
  <div class="profile-h">
    <div class="avatar">${esc(p.jersey || (p.first_name[0] + p.last_name[0]))}</div>
    <div class="who"><h1>${esc(p.name)} ${demoTag(p.is_demo)}</h1>
      <p class="muted">${esc(p.id)}${p.position ? ` · ${esc(p.position)}` : ''}${p.jersey ? ` · #${esc(p.jersey)}` : ''} · ${p.active ? '<span class="pill green">Aktiv</span>' : '<span class="pill grey">Inaktiv</span>'}${d.place ? ` · Plats ${d.place} av ${d.of} i leaderboard` : ''}</p></div>
    ${admin ? `<div class="btns">
      ${p.active ? `<button class="btn primary" data-act="fine">${icon('plus')} Bot</button>` : ''}
      <button class="btn ghost" data-act="pay">${icon('coin')} Inbetalning</button>
      <button class="btn ghost" data-act="edit">${icon('edit')} Redigera</button>
      <button class="btn ghost" data-act="toggle">${p.active ? 'Inaktivera' : 'Aktivera'}</button>
      ${canDelete ? `<button class="btn ghost danger" data-act="delete">${icon('trash')} Ta bort</button>` : ''}</div>` : ''}
  </div>
  <section class="kpis">
    ${kpi('Utfärdade böter', kr(p.issued), { sub: `${p.fine_count} st`, cls: 'accent' })}
    ${kpi('Totalt betalt', kr(p.paid), { cls: 'pos', sub: p.refunded ? `${kr(p.refunded)} återbetalt` : '' })}
    ${kpi('Återstående skuld', kr(p.debt), { cls: p.debt ? 'neg' : '', sub: `${p.unpaid_count} obetalda böter` })}
    ${kpi('Tillgodohavande', kr(Math.max(0, p.credit)), { cls: p.credit > 0 ? 'pos' : '' })}
    ${kpi('Förfallet', kr(p.overdue_amount), { cls: p.overdue_count ? 'warn' : '', sub: `${p.overdue_count} försenade` })}
    ${kpi('Senaste betalning', fmtDate(p.last_payment))}
  </section>
  ${admin && p.credit > 0 ? `<div class="notice ok">${icon('info')}<div>${esc(p.first_name)} har <b>${kr(p.credit)}</b> i tillgodohavande som inte är fördelat.</div><div class="btns">${p.debt ? '<button class="btn small primary" data-act="alloc">Fördela mot obetalda böter</button>' : ''}<button class="btn small ghost" data-act="refund">Återbetala</button></div></div>` : ''}
  ${p.debt && admin ? `<div class="notice">${icon('chat')}<div>Skicka en påminnelse manuellt via lagets chatt.</div><button class="btn small ghost" data-act="remind">Kopiera påminnelse</button></div>` : ''}
  ${p.notes ? `<div class="card notes"><small>Anteckningar</small><p>${esc(p.notes)}</p></div>` : ''}
  <div class="tabs" role="tablist">${[['fines', `Böter (${d.fines.length})`], ['payments', `Betalningar (${d.payments.length})`], ['history', 'Historik'], ['stats', 'Statistik']].map(([k, l]) => `<button role="tab" class="${profileTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
  <div data-tabbody></div>`;
  const bodies = {
    fines: () => (d.fines.length ? `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>Nr</th><th>Datum</th><th>Kategori</th><th class="r">Belopp</th><th class="r hide-m">Kvar</th><th>Status</th><th class="hide-m">Förfaller</th></tr></thead><tbody>
      ${d.fines.map((f) => `<tr data-fine="${f.id}" class="${f.voided ? 'struck' : ''}"><td><b>${esc(f.fine_no)}</b></td><td>${fmtDate(f.issued_date)}</td><td>${esc(f.category_name)}${f.description ? `<br><small class="muted">${esc(f.description)}</small>` : ''}</td><td class="r">${kr(f.amount)}</td><td class="r hide-m">${kr(f.remaining)}</td><td>${statusPill(f.status)}</td><td class="hide-m ${f.overdue ? 'neg' : ''}">${fmtDate(f.due_date)}</td></tr>`).join('')}</tbody></table></div>` : empty('Inga böter – ännu.')),
    payments: () => (d.payments.length || d.refunds.length ? `<div class="tbl-wrap"><table class="tbl click"><thead><tr><th>ID</th><th>Datum</th><th>Metod</th><th class="r">Belopp</th><th class="r hide-m">Fördelat</th><th>Status</th></tr></thead><tbody>
      ${d.payments.map((x) => `<tr data-pay="${x.id}" class="${x.reversed ? 'struck' : ''}"><td><b>${esc(x.payment_no)}</b></td><td>${fmtDate(x.date)}</td><td>${esc(x.method)}${x.reference ? `<br><small class="muted">${esc(x.reference)}</small>` : ''}</td><td class="r pos">${kr(x.amount)}</td><td class="r hide-m">${kr(x.allocated)}</td><td>${x.reversed ? '<span class="pill grey">Återförd</span>' : x.unallocated ? `<span class="pill ice">${kr(x.unallocated)} ofördelat</span>` : '<span class="pill green">Fördelad</span>'}</td></tr>`).join('')}
      ${d.refunds.map((c) => `<tr class="${c.voided ? 'struck' : ''}"><td><b>${esc(c.event_no)}</b></td><td>${fmtDate(c.date)}</td><td>Återbetalning</td><td class="r neg">−${kr(c.amount)}</td><td class="hide-m"></td><td>${c.voided ? '<span class="pill grey">Makulerad</span>' : '<span class="pill amber">Återbetald</span>'}</td></tr>`).join('')}</tbody></table></div>` : empty('Inga betalningar ännu.')),
    history: () => (d.history.length ? `<ul class="timeline">${d.history.map((h) => `<li class="t-${h.type}"><span class="dot"></span><div><b>${esc(h.text)}</b><small>${fmtDate(h.date)} · ${kr(h.amount)}</small></div></li>`).join('')}</ul>` : empty('Ingen historik.')),
    stats: () => (catRows.length ? `<div class="card"><h3>Böter per kategori</h3><ul class="hbars">${catRows.map(([n, v]) => `<li><span>${esc(n)}</span><div class="hb"><i style="width:${(v.amount / maxCat) * 100}%"></i></div><b>${v.count} st · ${kr(v.amount)}</b></li>`).join('')}</ul>
      <p class="muted small">Andel betald: ${p.issued ? Math.round((p.allocated / p.issued) * 100) : 0} % · Snittbot: ${p.fine_count ? kr(Math.round(p.issued / p.fine_count)) : '–'} · ${overdue.length} försenade</p></div>` : empty('Ingen statistik ännu.')),
  };
  const drawTab = () => { el.querySelector('[data-tabbody]').innerHTML = bodies[profileTab](); el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === profileTab)); };
  drawTab();
  el.onclick = async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { profileTab = t.dataset.tab; return drawTab(); }
    const fr = e.target.closest('[data-fine]'); if (fr) return fineDetail(fr.dataset.fine);
    const pr = e.target.closest('[data-pay]'); if (pr) return paymentDetail(pr.dataset.pay);
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'fine') fineForm({ playerId: p.id });
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
          <td class="r"><b>${kr(f.amount)}</b>${f.status === 'delvis' ? `<br><small class="muted">kvar ${kr(f.remaining)}</small>` : ''}</td><td>${statusPill(f.status)}</td>
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
