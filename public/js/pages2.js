// Sidor: Leaderboard, Månadsskifte, Regler, Kassa, Inställningar
import { S, get, post, put, del, esc, kr, krPlain, num, pct, fmtDate, fmtTs, monthName, seasonMonths, today, demoTag, placeBadge, icon, isAdmin, barChart, empty, confirmDialog, toast, fail, busy, formData, copyText, reminderText, modal, ROLE, juniorTag } from './core.js';
import { cashForm, fineDetail, accountForm } from './forms.js';
import { refresh, loadSettings } from './app.js';

const kpi = (label, value, cls = '', sub = '') => `<div class="kpi ${cls}"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
const currentMonth = () => { const m = today().slice(0, 7); const ms = seasonMonths(); return ms.includes(m) ? m : m < ms[0] ? ms[0] : ms[ms.length - 1]; };
const monthSelect = (sel, attr = 'data-month', onlyEnded = false) => `<select ${attr}>${seasonMonths().filter((m) => !onlyEnded || m < today().slice(0, 7)).map((m) => `<option value="${m}" ${m === sel ? 'selected' : ''}>${monthName(m)}</option>`).join('')}</select>`;
const who = (arr, f) => (arr.length ? arr.map((x) => `<a href="#/spelare/${esc(x.id)}">${esc(x.name)}</a>`).join(', ') + (f ? `<small>${f(arr[0])}</small>` : '') : '<span class="muted">–</span>');

// ---------- Leaderboard ----------
const lq = { period: 'season', month: '', from: '', to: '', sort: 'count', tab: 'most', inactive: '' };
export async function leaderboard(el) {
  if (!lq.month) lq.month = currentMonth();
  const qs = new URLSearchParams({ period: lq.period, month: lq.month, from: lq.from, to: lq.to, sort: lq.sort, inactive: lq.inactive });
  const d = await get(`/api/leaderboard?${qs}`);
  const econ = lq.sort === 'debt';
  const valueOf = (r) => (lq.sort === 'count' ? `${r.count} st` : lq.sort === 'amount' ? kr(r.amount) : kr(r.debt));
  const podium = d.most.filter((r) => r.value > 0).slice(0, 3);
  el.innerHTML = `
  <div class="page-h"><div><h1>Leaderboard</h1><p class="muted">${esc(d.range.label)}</p></div></div>
  <div class="toolbar">
    <div class="seg-btns">${[['season', 'Hela säsongen'], ['month', 'Månad'], ['range', 'Datumintervall']].map(([k, l]) => `<button class="${lq.period === k ? 'on' : ''}" data-period="${k}">${l}</button>`).join('')}</div>
    ${lq.period === 'month' ? monthSelect(lq.month) : ''}
    ${lq.period === 'range' ? `<label class="mini">Från <input type="date" data-from value="${lq.from}"></label><label class="mini">Till <input type="date" data-to value="${lq.to}"></label>` : ''}
    <label class="check"><input type="checkbox" data-inactive ${lq.inactive ? 'checked' : ''}> Visa inaktiva</label>
  </div>
  <div class="tabs">${[['most', 'Flest böter'], ['pay', 'Betalningsliga'], ['fun', 'Säsongens statistik']].map(([k, l]) => `<button class="${lq.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
  <div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (lq.tab === 'most') {
    body.innerHTML = `
      <div class="toolbar"><span class="muted">Sortera efter</span><div class="seg-btns">${[['count', 'Antal böter'], ['amount', 'Totalbelopp'], ['debt', 'Obetald skuld']].map(([k, l]) => `<button class="${lq.sort === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div></div>
      ${econ ? `<div class="notice">${icon('info')}<div><b>Ekonomisk översikt – inte en tävling.</b> Obetald skuld är aktuell skuld oavsett vald period och visas här för uppföljning.</div></div>`
      : podium.length ? `<div class="podium">${[1, 0, 2].map((i) => podium[i] ? `<a href="#/spelare/${esc(podium[i].id)}" class="pod pod${podium[i].place}"><span class="medal">${podium[i].place}</span><b>${esc(podium[i].name)}</b><span>${valueOf(podium[i])}</span></a>` : '<div></div>').join('')}</div>` : ''}
      ${d.most.length ? `<div class="tbl-wrap"><table class="tbl click lbt"><thead><tr><th>Plats</th><th>Spelare</th><th class="r">Antal</th><th class="r">Bötesbelopp</th><th class="r ${econ ? '' : 'hide-m'}">Obetald skuld</th></tr></thead><tbody>
        ${d.most.map((r) => `<tr data-id="${esc(r.id)}" class="${r.active ? '' : 'dim'}"><td>${econ ? `<span class="place pn">${r.place}</span>` : placeBadge(r.place)}</td><td><b>${esc(r.name)}</b> ${demoTag(r.is_demo)}${r.jersey ? ` <small class="muted">#${esc(r.jersey)}</small>` : ''}</td>
          <td class="r ${lq.sort === 'count' ? 'hl' : ''}">${r.count}</td><td class="r ${lq.sort === 'amount' ? 'hl' : ''}">${kr(r.amount)}</td><td class="r ${econ ? 'hl neg' : 'hide-m'}">${kr(r.debt)}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small">Delade placeringar: spelare med samma värde får samma plats (1, 1, 3 …). Bötesbelopp = det spelaren ska betala (efter eventuell juniorrabatt).</p>` : empty('Inga spelare.')}`;
  } else if (lq.tab === 'pay') {
    const mini = (title, rows, val, note = '') => `<section class="card"><header><h2>${title}</h2></header>${note ? `<p class="muted small">${note}</p>` : ''}
      ${rows.length ? `<ol class="lb">${rows.slice(0, 10).map((r) => `<li><a href="#/spelare/${esc(r.id)}">${placeBadge(r.place)}<span class="nm"><span>${esc(r.name)}</span>${demoTag(r.is_demo)}</span><b>${val(r)}</b></a></li>`).join('')}</ol>` : empty('Ingen data för perioden.')}</section>`;
    body.innerHTML = `<div class="cols">
      ${mini('Högst inbetalt', d.pay.paid_in, (r) => kr(r.paid_in), 'Inbetalningar med betalningsdatum inom perioden.')}
      ${mini('Högst andel betalda böter', d.pay.paid_share, (r) => pct(r.paid_share), 'Andel av periodens böter som är betalda.')}
      ${mini('Lägst obetald skuld', d.pay.lowest_debt, (r) => kr(r.debt), 'Aktuell skuld.')}</div>`;
  } else {
    const f = d.fun;
    body.innerHTML = `<p class="muted">Skämtsamma tävlingskategorier – påverkar inte någons skuld.</p><div class="fun-grid">
      <div class="fun"><small>Veckans största bot (${esc(f.week.label)})</small>${f.week_biggest.length ? f.week_biggest.map((x) => `<p><a data-fine="${x.id}" href="javascript:void 0">${esc(x.player_name)}</a> – ${esc(x.category_name)}</p>`).join('') + `<b>${kr(f.week_biggest[0].amount)}</b>` : '<p class="muted">Inga böter denna vecka</p>'}</div>
      <div class="fun"><small>Månadens största botbetalare (${monthName(f.month)})</small><p>${who(f.month_top_payer)}</p>${f.month_top_payer.length ? `<b>${kr(f.month_top_payer[0].amount)}</b>` : ''}</div>
      <div class="fun"><small>Flest böter under en vecka</small>${f.most_in_week.length ? f.most_in_week.map((x) => `<p><a href="#/spelare/${esc(x.id)}">${esc(x.name)}</a> <small class="muted">${esc(x.week)}</small></p>`).join('') + `<b>${f.most_in_week[0].count} st</b>` : '<p class="muted">–</p>'}</div>
      <div class="fun"><small>Vanligaste böteskategorin</small>${f.common_category.length ? f.common_category.map((c) => `<p>${c.number}. ${esc(c.name)}</p>`).join('') + `<b>${f.common_category[0].count} gånger</b>` : '<p class="muted">–</p>'}</div>
      <div class="fun"><small>Flest olika böteskategorier</small><p>${who(f.most_categories)}</p>${f.most_categories.length ? `<b>${f.most_categories[0].count} kategorier</b>` : ''}</div>
    </div>`;
  }
  el.onclick = (e) => {
    const t = e.target.closest('[data-tab],[data-period],[data-sort]');
    if (t) { if (t.dataset.tab) lq.tab = t.dataset.tab; if (t.dataset.period) lq.period = t.dataset.period; if (t.dataset.sort) lq.sort = t.dataset.sort; return leaderboard(el); }
    const fi = e.target.closest('[data-fine]'); if (fi) { e.preventDefault(); return fineDetail(fi.dataset.fine); }
    const tr = e.target.closest('tr[data-id]'); if (tr) location.hash = `#/spelare/${tr.dataset.id}`;
  };
  el.onchange = (e) => {
    if (e.target.matches('[data-month]')) lq.month = e.target.value;
    else if (e.target.matches('[data-from]')) lq.from = e.target.value;
    else if (e.target.matches('[data-to]')) lq.to = e.target.value;
    else if (e.target.matches('[data-inactive]')) lq.inactive = e.target.checked ? '1' : '';
    else return;
    if (lq.period !== 'range' || (lq.from && lq.to)) leaderboard(el);
  };
}

// ---------- Månadsskifte ----------
let monthSel = '';
export async function month(el) {
  if (!monthSel) monthSel = currentMonth();
  const d = await get(`/api/month?period=${monthSel}`);
  const admin = isAdmin();
  const late = d.late; const pending = late.rows.filter((r) => !r.existing);
  el.innerHTML = `
  <div class="page-h"><div><h1>Månadsskifte</h1><p class="muted">Betalningsperiod ${monthName(d.period)} · sista betalningsdag ${fmtDate(d.end)}</p></div>
    <div class="btns">${monthSelect(d.period)}${admin ? `<a class="btn ghost" href="/api/export/manadsrapport.csv?period=${d.period}">${icon('download')} Månadsrapport</a>` : ''}</div></div>
  <div class="notice ${d.closing ? 'ok' : ''}">${icon(d.closing ? 'check' : 'info')}<div>${d.closing ? `<b>Avstämd</b> ${fmtTs(d.closing.closed_at)} av ${esc(d.closing.closed_by)}${d.closing.note ? ` – ${esc(d.closing.note)}` : ''}` : `<b>Ej avstämd.</b> ${d.ended ? 'Perioden är slut – kontrollera inbetalningar mot Swish/bank och markera som avstämd.' : 'Perioden pågår.'}`}</div>
    ${admin ? (d.closing ? '<button class="btn small ghost" data-act="reopen">Ångra avstämning</button>' : '<button class="btn small primary" data-act="close">Markera som avstämd</button>') : ''}</div>
  <section class="kpis">
    ${kpi('Att betala', kr(d.total_open), d.total_open ? 'neg' : '', `${d.open.length} spelare`)}
    ${kpi('Varav försenat', kr(d.open.reduce((s, r) => s + r.overdue_amount, 0)), 'warn', `${d.overdue.length} böter`)}
    ${kpi('Utfärdat i månaden', kr(d.summary.fines_amount), 'accent', `${d.summary.fines_count} böter${d.summary.voided ? `, ${d.summary.voided} makulerade` : ''}`)}
    ${kpi('Inbetalt i månaden', kr(d.summary.payments_amount), 'pos', `${d.summary.payments_count} betalningar`)}
  </section>
  <section class="card"><header><h2>Spelare med obetalda böter</h2>${d.open.length ? '<button class="btn small ghost" data-act="copyall">Kopiera sammanställning</button>' : ''}</header>
    <p class="muted small">Påminnelser skickas inte automatiskt. Kopiera texten och skicka via lagets chatt.</p>
    ${d.open.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Spelare</th><th class="r">Att betala</th><th class="r">Försenat</th><th>Förfallodatum</th><th class="hide-m">Böter</th><th></th></tr></thead><tbody>
      ${d.open.map((r, i) => `<tr><td><a href="#/spelare/${esc(r.player_id)}"><b>${esc(r.name)}</b></a> ${demoTag(r.is_demo)}${r.credit > 0 ? `<br><small class="pos">${kr(r.credit)} tillgodo ej fördelat</small>` : ''}</td><td class="r"><b>${kr(r.amount)}</b></td><td class="r ${r.overdue_amount ? 'neg' : 'muted'}">${kr(r.overdue_amount)}</td><td>${fmtDate(r.earliest_due)}</td>
        <td class="hide-m"><small>${r.fines.map((f) => esc(f.fine_no)).join(', ')}</small></td><td class="r"><button class="btn tiny ghost" data-remind="${i}">${icon('chat')} Påminnelse</button></td></tr>`).join('')}</tbody></table></div>` : empty('Inga obetalda böter för perioden. 👏')}
  </section>
  <section class="card"><header><h2>Förseningsböter (regel 29)</h2><span class="tag ${late.enabled ? 'on' : ''}">${late.enabled ? 'Regeln är på' : 'Regeln är av'}</span></header>
    <p class="muted small"><b>Automatiskt:</b> appen räknar fram vilka som hade skuld kvar efter ${fmtDate(late.deadline)} (enligt betalningsdatum). <b>Kräver godkännande:</b> förseningsboten registreras först när du väljer spelare och klickar på knappen. Samma period kan aldrig ge dubbla förseningsböter.</p>
    ${!late.ended ? `<p class="muted">Perioden är inte slut. Förseningsböter kan registreras från ${fmtDate(new Date(Date.parse(late.deadline) + 86400000).toISOString().slice(0, 10))}.</p>`
      : !late.rows.length ? empty('Alla hade betalat i tid.')
      : `<form data-late><table class="tbl"><thead><tr><th></th><th>Spelare</th><th class="r">Skuld vid periodens slut</th><th>Status</th></tr></thead><tbody>
        ${late.rows.map((r) => `<tr><td>${r.existing || !admin || !late.enabled ? '' : `<input type="checkbox" name="p" value="${esc(r.player_id)}" checked>`}</td><td>${esc(r.name)} ${demoTag(r.is_demo)}</td><td class="r">${kr(r.owed)}</td><td>${r.existing ? `<span class="pill grey">Registrerad ${esc(r.existing)}</span>` : '<span class="pill amber">Väntar på godkännande</span>'}</td></tr>`).join('')}
        </tbody></table>${admin && late.enabled && pending.length ? `<div class="actions"><button class="btn primary">Registrera förseningsbot (200 kr) för valda</button></div>` : ''}</form>`}
  </section>
  ${d.overdue.length ? `<section class="card"><header><h2>Försenade böter</h2></header><div class="tbl-wrap"><table class="tbl click"><thead><tr><th>Nr</th><th>Spelare</th><th>Kategori</th><th>Förföll</th><th class="r">Kvar</th></tr></thead><tbody>
    ${d.overdue.map((f) => `<tr data-fine="${f.id}"><td><b>${esc(f.fine_no)}</b></td><td>${esc(f.player_name)}</td><td>${esc(f.category_name)}</td><td class="neg">${fmtDate(f.due_date)}</td><td class="r">${kr(f.remaining)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  el.onchange = (e) => { if (e.target.matches('[data-month]')) { monthSel = e.target.value; month(el); } };
  el.onclick = async (e) => {
    const r = e.target.closest('[data-remind]'); if (r) return copyText(reminderText(d.open[Number(r.dataset.remind)], d));
    const fr = e.target.closest('[data-fine]'); if (fr) return fineDetail(fr.dataset.fine);
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'copyall') {
      const txt = `Böteskassan ${d.team_name} – obetalt ${monthName(d.period)} (sista betalningsdag ${fmtDate(d.end)}):\n${d.open.map((x) => `• ${x.name}: ${kr(x.amount)}${x.overdue_amount ? ` (varav ${kr(x.overdue_amount)} försenat)` : ''}`).join('\n')}\nBetala till: ${d.payment_info}. Märk med namn och bötesnummer.`;
      copyText(txt);
    } else if (a.dataset.act === 'close') {
      const { el: m, close } = modal({ title: `Stäm av ${monthName(d.period)}`, body: `<p class="lead">Bekräfta att inbetalningarna för perioden är kontrollerade mot Swish/bank.</p><label class="field"><span>Anteckning (valfri)</span><input name="note" maxlength="500"></label><div class="actions"><button class="btn ghost" data-c>Avbryt</button><button class="btn primary" data-ok>Markera som avstämd</button></div>` });
      m.querySelector('[data-c]').onclick = close;
      m.querySelector('[data-ok]').onclick = async () => { try { await post(`/api/month/${d.period}/close`, { note: m.querySelector('[name=note]').value }); toast('Månaden markerad som avstämd.'); close(); refresh(); } catch (err) { fail(err); } };
    } else if (a.dataset.act === 'reopen') {
      const reason = await confirmDialog({ title: 'Ångra avstämning?', text: 'Avstämningen tas bort. Händelsen loggas.', confirm: 'Ångra avstämning', reason: true });
      if (!reason) return;
      try { await post(`/api/month/${d.period}/close`, { reopen: true, reason }); toast('Avstämningen ångrad.'); refresh(); } catch (err) { fail(err); }
    }
  };
  el.querySelector('[data-late]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ids = [...e.target.querySelectorAll('[name=p]:checked')].map((i) => i.value);
    if (!ids.length) return toast('Välj minst en spelare.', 'err');
    const ok = await confirmDialog({ title: 'Registrera förseningsböter?', text: `${ids.length} förseningsbot(ar) för ${monthName(d.period)} registreras.`, confirm: 'Registrera', danger: false });
    if (!ok) return;
    try { const r = await post('/api/rules/29', { period: d.period, player_ids: ids }); toast(`${r.fine_nos.join(', ')} registrerade.`); refresh(); } catch (err) { fail(err); }
  });
}

// ---------- Regler 22, 23, 29 ----------
let rulePeriod = '';
export async function rules(el) {
  const d = await get(`/api/rules${rulePeriod ? `?period=${rulePeriod}` : ''}`);
  rulePeriod = d.r29.period;
  const admin = isAdmin();
  const tag = (on) => `<span class="tag ${on ? 'on' : ''}">${on ? 'På' : 'Av'}</span>`;
  const elig = d.r22.rows.filter((r) => r.eligible);
  el.innerHTML = `
  <div class="page-h"><div><h1>Särskilda regler</h1><p class="muted">Regel 22, 23 och 29. Slå på/av under <a href="#/installningar">Inställningar</a>.</p></div></div>
  <div class="notice">${icon('info')}<div><b>Inga böter registreras automatiskt.</b> Appen räknar fram förslag (automatiskt). Varje bot registreras först när en administratör godkänner den. Dubbletter för samma period stoppas av databasen.</div></div>
  <section class="card rule"><header><h2><span class="catno">22</span> Inga böter på ${d.r22.days} dagar – 20 kr</h2>${tag(d.r22.enabled)}</header>
    <p class="muted small">Föreslås när en aktiv spelare haft en sammanhängande period på ${d.r22.days} dagar utan böter. Perioden räknas från senaste boten (eller säsongsstart). När boten registreras startar en ny period.</p>
    <form data-r22><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Spelare</th><th>Senaste bot</th><th class="r">Dagar utan böter</th><th>Period</th><th>Status</th></tr></thead><tbody>
    ${d.r22.rows.map((r) => `<tr class="${r.eligible ? '' : 'dim'}"><td>${r.eligible && admin && d.r22.enabled ? `<input type="checkbox" name="p" value="${esc(r.player_id)}">` : ''}</td><td>${esc(r.name)} ${demoTag(r.is_demo)}</td><td>${fmtDate(r.last_fine)}</td><td class="r">${Math.max(0, r.days_without)}</td><td><small>${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}</small></td><td>${r.eligible ? '<span class="pill amber">Uppfyller regeln</span>' : '<span class="muted small">Ej aktuell</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Inga aktiva spelare.</td></tr>'}
    </tbody></table></div>${admin && d.r22.enabled && elig.length ? '<div class="actions"><button class="btn primary">Registrera bot 22 för valda</button></div>' : ''}</form></section>

  <section class="card rule"><header><h2><span class="catno">23</span> Minst böter efter säsong – 300 kr</h2>${tag(d.r23.enabled)}</header>
    <p class="muted small">Säsongsregel. Rangordning efter lägst bötesbelopp (makulerade och bot 23 räknas inte). Välj själv vem regeln gäller – ingen debiteras automatiskt. ${d.r23.season_over ? '' : `<b class="warn">Säsongen slutar ${fmtDate(d.r23.season_end)} – vänta till dess.</b>`}</p>
    <form data-r23><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Plats</th><th>Spelare</th><th class="r">Bötesbelopp</th><th>Status</th></tr></thead><tbody>
    ${d.r23.ranking.map((r) => `<tr><td>${!r.existing && admin && d.r23.enabled ? `<input type="checkbox" name="p" value="${esc(r.id)}">` : ''}</td><td>${placeBadge(r.place)}</td><td>${esc(r.name)} ${demoTag(r.is_demo)}</td><td class="r">${kr(r.amount)}</td><td>${r.existing ? `<span class="pill grey">Registrerad ${esc(r.existing)}</span>` : ''}</td></tr>`).join('')}
    </tbody></table></div>${admin && d.r23.enabled ? '<div class="actions"><button class="btn primary">Registrera bot 23 för valda</button></div>' : ''}</form></section>

  <section class="card rule"><header><h2><span class="catno">29</span> Ej betalat senast sista dagen i månaden – 200 kr</h2>${tag(d.r29.enabled)}</header>
    <p class="muted small">Böter förfaller sista kalenderdagen i den månad de utfärdades. Spelare med skuld kvar efter den dagen (enligt betalningsdatum) föreslås. Max en förseningsbot per spelare och period.</p>
    <div class="toolbar"><span class="muted">Period</span>${monthSelect(d.r29.period, 'data-r29month', true) || '<span class="muted">Ingen avslutad månad ännu</span>'}</div>
    ${!d.r29.ended ? '<p class="muted">Perioden är inte avslutad.</p>' : d.r29.rows.length ? `<form data-r29><table class="tbl"><thead><tr><th></th><th>Spelare</th><th class="r">Skuld vid ${fmtDate(d.r29.deadline)}</th><th>Status</th></tr></thead><tbody>
      ${d.r29.rows.map((r) => `<tr><td>${!r.existing && admin && d.r29.enabled ? `<input type="checkbox" name="p" value="${esc(r.player_id)}" checked>` : ''}</td><td>${esc(r.name)} ${demoTag(r.is_demo)}</td><td class="r">${kr(r.owed)}</td><td>${r.existing ? `<span class="pill grey">Registrerad ${esc(r.existing)}</span>` : '<span class="pill amber">Väntar på godkännande</span>'}</td></tr>`).join('')}
      </tbody></table>${admin && d.r29.enabled && d.r29.rows.some((r) => !r.existing) ? '<div class="actions"><button class="btn primary">Registrera förseningsbot för valda</button></div>' : ''}</form>` : empty('Alla hade betalat i tid för perioden.')}
  </section>`;
  el.onchange = (e) => { if (e.target.matches('[data-r29month]')) { rulePeriod = e.target.value; rules(el); } };
  const bind = (sel, rule, extra = {}) => el.querySelector(sel)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ids = [...e.target.querySelectorAll('[name=p]:checked')].map((i) => i.value);
    if (!ids.length) return toast('Välj minst en spelare.', 'err');
    const ok = await confirmDialog({ title: `Registrera bot ${rule}?`, text: `${ids.length} bot(ar) registreras med egna bötesnummer.`, confirm: 'Registrera', danger: false });
    if (!ok) return;
    try { const r = await post(`/api/rules/${rule}`, { player_ids: ids, ...extra }); toast(`${r.fine_nos.join(', ')} registrerade.`); refresh(); } catch (err) { fail(err); }
  });
  bind('[data-r22]', '22'); bind('[data-r23]', '23'); bind('[data-r29]', '29', { period: d.r29.period });
}

// ---------- Kassa ----------
export async function cash(el) {
  const d = await get('/api/cash');
  const t = d.totals; const admin = isAdmin();
  el.innerHTML = `
  <div class="page-h"><div><h1>Kassa</h1><p class="muted">Faktiska pengar – utfärdade böter räknas först när de betalats.</p></div>
    ${admin ? `<div class="btns"><button class="btn ghost" data-act="income">${icon('plus')} Övrig inkomst</button><button class="btn ghost" data-act="expense">${icon('minus')} Utgift</button><button class="btn ghost" data-act="refund">${icon('undo')} Återbetalning</button></div>` : ''}</div>
  <div class="cash-hero">
    <div class="big"><small>Kassans beräknade saldo</small><b>${kr(t.balance)}</b>
      <p class="formula">Startsaldo ${kr(t.start_balance)} + inbetalningar ${kr(t.received)} + övriga inkomster ${kr(t.income)} − återbetalningar ${kr(t.refunds)} − utgifter ${kr(t.expenses)}</p>
      ${admin ? '<button class="btn small ghost" data-act="start">Ändra startsaldo</button>' : ''}</div>
    <div class="cash-side">
      ${kpi('Mottagna inbetalningar', kr(t.received), 'pos')}
      ${kpi('Övriga inkomster', kr(t.income), 'pos')}
      ${kpi('Återbetalningar', kr(t.refunds), 'neg')}
      ${kpi('Utgifter', kr(t.expenses), 'neg')}
    </div>
  </div>
  <div class="notice">${icon('info')}<div>Utfärdade böter <b>${kr(t.issued)}</b> · varav obetalt <b class="neg">${kr(t.outstanding)}</b> · spelarnas tillgodohavanden <b>${kr(t.credits)}</b> (ingår i saldot men tillhör spelarna tills de fördelats eller återbetalats).</div></div>
  <section class="card"><header><h2>Månadsvis</h2>${admin ? `<div class="btns">${monthSelect(currentMonth(), 'data-repmonth')}<a class="btn small ghost" data-rep href="/api/export/manadsrapport.csv?period=${currentMonth()}">Månadsrapport</a><a class="btn small ghost" href="/api/export/sasongsrapport.csv">Säsongsrapport</a></div>` : ''}</header>
      ${barChart(d.monthly.map((m) => ({ month: m.month, in: m.payments + m.income, out: m.refunds + m.expenses })), [{ key: 'in', label: 'Intäkter', cls: 's-pay' }, { key: 'out', label: 'Utgifter & återbetalningar', cls: 's-out' }], { height: 180 })}
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Månad</th><th class="r">Inbetalt</th><th class="r hide-m">Övr. inkomst</th><th class="r hide-m">Återbetalt</th><th class="r">Utgifter</th><th class="r">Netto</th><th class="r">Saldo</th></tr></thead><tbody>
      ${d.monthly.map((m) => `<tr><td>${monthName(m.month)}</td><td class="r">${kr(m.payments)}</td><td class="r hide-m">${kr(m.income)}</td><td class="r hide-m">${kr(m.refunds)}</td><td class="r">${kr(m.expenses)}</td><td class="r ${m.net < 0 ? 'neg' : 'pos'}">${kr(m.net)}</td><td class="r"><b>${kr(m.balance)}</b></td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><header><h2>Kassahändelser</h2>${admin ? `<a class="btn small ghost" href="/api/export/kassa.csv">${icon('download')} Exportera</a>` : ''}</header>
    ${d.events.length ? `<ul class="feed cash-feed">${d.events.slice(0, 100).map((e) => `<li class="${e.voided || e.kind === 'payment_reversed' ? 'struck' : ''}"><span class="no">${esc(e.no)}</span><span class="tx"><b>${esc(e.text)}</b><small>${fmtDate(e.date)} · ${{ payment: 'Inbetalning', payment_reversed: 'Återförd', income: 'Övrig inkomst', expense: 'Utgift', refund: 'Återbetalning' }[e.kind]}${e.voided ? ` · makulerad: ${esc(e.void_reason)}` : ''}</small></span>
      <span class="am ${e.sign > 0 ? 'pos' : e.sign < 0 ? 'neg' : ''}">${e.sign < 0 ? '−' : e.sign > 0 ? '+' : ''}${kr(e.amount)} ${demoTag(e.is_demo)}${admin && e.id && !e.voided ? `<button class="btn tiny ghost" data-void="${e.id}" title="Makulera">${icon('ban')}</button>` : ''}</span></li>`).join('')}</ul>` : empty('Inga kassahändelser ännu.')}
  </section>`;
  el.onchange = (e) => { if (e.target.matches('[data-repmonth]')) el.querySelector('[data-rep]').href = `/api/export/manadsrapport.csv?period=${e.target.value}`; };
  el.onclick = async (e) => {
    const v = e.target.closest('[data-void]');
    if (v) {
      const reason = await confirmDialog({ title: 'Makulera kassahändelse?', text: 'Händelsen finns kvar men räknas inte i saldot.', confirm: 'Makulera', reason: true });
      if (!reason) return;
      try { await post(`/api/cash/${v.dataset.void}/void`, { reason }); toast('Makulerad.'); refresh(); } catch (err) { fail(err); }
      return;
    }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'start') return startBalance(t.start_balance);
    cashForm(a.dataset.act);
  };
}
function startBalance(current) {
  const { el, close } = modal({ title: 'Startsaldo', body: `<p class="lead">Pengar som fanns i kassan när säsongen började.</p><form><label class="field"><span>Startsaldo (kr)</span><input name="start_balance" inputmode="decimal" value="${krPlain(current)}" autofocus></label><label class="field"><span>Anledning (valfri)</span><input name="reason" maxlength="300"></label><div class="actions"><button type="button" class="btn ghost" data-c>Avbryt</button><button class="btn primary">Spara</button></div></form>` });
  el.querySelector('[data-c]').onclick = close;
  el.querySelector('form').onsubmit = async (e) => { e.preventDefault(); try { await put('/api/settings', formData(e.target)); toast('Startsaldo sparat.'); close(); refresh(); } catch (err) { fail(err); } };
}

// ---------- Inställningar ----------
let setTab = 'general';
export function setSettingsTab(t) { setTab = t; location.hash = '#/installningar'; }
export async function settings(el) {
  const admin = isAdmin();
  if (!admin) setTab = 'account';
  const tabs = admin ? [['general', 'Allmänt'], ['rules', 'Regler'], ['cats', 'Böteslista'], ['users', 'Användare'], ['data', 'Export & data'], ['log', 'Ändringslogg'], ['account', 'Mitt konto']] : [['account', 'Mitt konto']];
  el.innerHTML = `<div class="page-h"><div><h1>Inställningar</h1></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${setTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div data-body><div class="loading"></div></div>`;
  el.onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) { setTab = t.dataset.tab; settings(el); } };
  const body = el.querySelector('[data-body]');
  const s = admin ? await get('/api/settings') : S.settings;
  if (setTab === 'general') {
    body.innerHTML = `<form class="card form-card" data-gen>
      <label class="field"><span>Lagets namn</span><input name="team_name" value="${esc(s.team_name)}" required maxlength="80"></label>
      <label class="field"><span>Betalningsinformation (visas i påminnelser)</span><input name="payment_info" value="${esc(s.payment_info)}" required maxlength="300"></label>
      <label class="field"><span>Startsaldo i kassan (kr)</span><input name="start_balance" inputmode="decimal" value="${krPlain(s.start_balance)}"></label>
      <div class="actions"><button class="btn primary">Spara</button></div></form>
      <form class="card form-card" data-season><h3>Säsong ${esc(s.season.name)}</h3><div class="grid2">
      <label class="field"><span>Säsongsstart</span><input type="date" name="start_date" value="${s.season.start_date}"></label>
      <label class="field"><span>Säsongsslut</span><input type="date" name="end_date" value="${s.season.end_date}"></label></div>
      <p class="muted small">Böter och betalningar måste dateras inom säsongen. Tidszon: Europe/Stockholm.</p>
      <div class="actions"><button class="btn primary">Spara säsong</button></div></form>`;
    body.querySelector('[data-gen]').onsubmit = async (e) => { e.preventDefault(); try { await put('/api/settings', formData(e.target)); await loadSettings(); toast('Inställningar sparade.'); } catch (err) { fail(err); } };
    body.querySelector('[data-season]').onsubmit = async (e) => { e.preventDefault(); try { await put('/api/season', formData(e.target)); await loadSettings(); toast('Säsongen sparad.'); } catch (err) { fail(err); } };
  } else if (setTab === 'rules') {
    body.innerHTML = `<form class="card form-card" data-rules>
      <label class="switch"><input type="checkbox" name="rule22_enabled" ${s.rule22_enabled === '1' ? 'checked' : ''}><span></span><div><b>Regel 22 – inga böter på en period</b><small>Visar förslag på spelare som saknat böter. Kräver godkännande.</small></div></label>
      <label class="field narrow-field"><span>Periodlängd (dagar)</span><input type="number" name="rule22_days" min="7" max="60" value="${esc(s.rule22_days)}"></label>
      <label class="switch"><input type="checkbox" name="rule23_enabled" ${s.rule23_enabled === '1' ? 'checked' : ''}><span></span><div><b>Regel 23 – minst böter efter säsong</b><small>Rangordning visas; administratören väljer manuellt vem som får boten.</small></div></label>
      <label class="switch"><input type="checkbox" name="rule29_enabled" ${s.rule29_enabled === '1' ? 'checked' : ''}><span></span><div><b>Regel 29 – förseningsbot</b><small>Visar vem som hade skuld efter månadens sista dag. Kräver godkännande, aldrig dubbla för samma period.</small></div></label>
      <div class="actions"><button class="btn primary">Spara regler</button></div></form>
      <section class="card form-card"><h3>Juniorrabatt</h3><p class="muted small">50 % på alla nya böter för spelare med juniorrabatt. Slås på/av per spelare på spelarens sida. Rabatten är kopplad till spelaren – inte tröjnumret – och ändrar aldrig redan registrerade böter.</p>
      <div data-juniors class="muted">Laddar…</div></section>`;
    get('/api/players').then((ps) => { const j = ps.filter((p) => p.junior_discount); body.querySelector('[data-juniors]').innerHTML = j.length ? j.map((p) => `<a href="#/spelare/${esc(p.id)}">${p.jersey ? `#${esc(p.jersey)} ` : ''}${esc(p.name)}</a> ${juniorTag(p)}`).join('<br>') : 'Ingen spelare har juniorrabatt.'; });
    body.querySelector('[data-rules]').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try { await put('/api/settings', { rule22_enabled: f.rule22_enabled.checked, rule23_enabled: f.rule23_enabled.checked, rule29_enabled: f.rule29_enabled.checked, rule22_days: Number(f.rule22_days.value) }); toast('Regler sparade.'); } catch (err) { fail(err); }
    };
  } else if (setTab === 'cats') {
    const cats = await get('/api/categories');
    body.innerHTML = `<p class="muted">Ändrade belopp gäller nya böter. Redan registrerade böter ändras aldrig. Inaktiverade kategorier kan inte väljas men finns kvar i historiken.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nr</th><th>Kategori</th><th class="r">Standardbelopp</th><th>Typ</th><th>Aktiv</th><th></th></tr></thead><tbody>
      ${cats.map((c) => `<tr data-cat="${c.id}" class="${c.active ? '' : 'dim'}"><td><span class="catno">${c.number}</span></td><td><input class="inline" name="name" value="${esc(c.name)}" maxlength="80"></td>
        <td class="r">${['stick', 'planted'].includes(c.kind) ? `<small class="muted">${esc(c.unit_note)}</small>` : `<input class="inline num" name="amount" inputmode="decimal" value="${krPlain(c.default_amount)}"> kr`}</td>
        <td><small class="muted">${{ fixed: 'Fast', per_item: 'Per styck', stick: 'Beräknas', planted: 'Planterad', no_fines: 'Regel', least_fines: 'Säsongsregel', late: 'Regel' }[c.kind]}${c.unit_note && !['stick', 'planted'].includes(c.kind) ? ` · ${esc(c.unit_note)}` : ''}</small></td>
        <td><label class="switch sm"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}><span></span></label></td><td><button class="btn tiny ghost" data-save>Spara</button></td></tr>`).join('')}</tbody></table></div>`;
    body.onclick = async (e) => {
      const b = e.target.closest('[data-save]'); if (!b) return;
      const tr = b.closest('tr');
      try { await put(`/api/categories/${tr.dataset.cat}`, { name: tr.querySelector('[name=name]').value, default_amount: tr.querySelector('[name=amount]')?.value, active: tr.querySelector('[name=active]').checked }); toast('Kategorin sparad.'); tr.classList.toggle('dim', !tr.querySelector('[name=active]').checked); } catch (err) { fail(err); }
    };
  } else if (setTab === 'users') {
    const [allUsers, players] = await Promise.all([get('/api/users'), get('/api/players')]);
    const users = allUsers.filter((u) => u.role !== 'player');
    const accounts = new Map(allUsers.filter((u) => u.role === 'player').map((u) => [u.player_id, u]));
    const real = players.filter((p) => !p.is_demo).sort((a, b) => (Number(a.jersey) || 999) - (Number(b.jersey) || 999) || a.name.localeCompare(b.name, 'sv'));
    body.innerHTML = `<section class="card"><header><h2>Spelarkonton</h2><span class="muted small">${accounts.size} av ${real.filter((p) => p.active).length} aktiva spelare har konto</span></header>
      <p class="muted small">Spelare loggar in med sitt <b>tröjnummer</b> och ett eget lösenord. De kan läsa leaderboard och böteshistorik och anmäla böter – inte ändra böter, betalningar, saldon eller konton. Behörigheterna kontrolleras i servern.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Spelare</th><th>Konto</th><th></th></tr></thead><tbody>
      ${real.map((p) => { const u = accounts.get(p.id); return `<tr class="${p.active ? '' : 'dim'}" ${u ? `data-uid="${u.id}"` : ''} data-pid="${esc(p.id)}"><td class="jersey">${esc(p.jersey || '–')}</td><td><b>${esc(p.name)}</b> ${juniorTag(p)}${p.active ? '' : ' <span class="pill grey">Inaktiv</span>'}</td>
        <td>${u ? (u.active ? `<span class="pill green">Aktivt</span> <small class="muted">loggar in med ${esc(p.jersey)}</small>` : '<span class="pill grey">Avstängt</span>') : '<span class="muted small">Inget konto</span>'}</td>
        <td class="r">${u ? `<button class="btn tiny ghost" data-pw>Nytt lösenord</button> <button class="btn tiny ghost" data-toggle>${u.active ? 'Stäng av' : 'Aktivera'}</button>` : p.active ? `<button class="btn tiny ghost" data-newacc ${p.jersey ? '' : 'disabled title="Lägg till tröjnummer först"'}>${icon('plus')} Skapa konto</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">Inga spelare ännu.</td></tr>'}</tbody></table></div></section>
      <h3>Administratörer och läskonton</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Användare</th><th>Roll</th><th>Status</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr data-uid="${u.id}" class="${u.active ? '' : 'dim'}"><td><b>${esc(u.display_name)}</b><br><small class="muted">${esc(u.username)}</small></td>
        <td><select data-role><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${ROLE.admin}</option><option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>${ROLE.viewer}</option></select></td>
        <td>${u.active ? '<span class="pill green">Aktiv</span>' : '<span class="pill grey">Avstängd</span>'}</td>
        <td class="r"><button class="btn tiny ghost" data-pw>Nytt lösenord</button> <button class="btn tiny ghost" data-toggle>${u.active ? 'Stäng av' : 'Aktivera'}</button></td></tr>`).join('')}</tbody></table></div>
      <form class="card form-card" data-new><h3>Ny användare</h3><div class="grid2">
        <label class="field"><span>Användarnamn</span><input name="username" required minlength="3" maxlength="30" autocapitalize="off"></label>
        <label class="field"><span>Visningsnamn</span><input name="display_name" maxlength="60"></label>
        <label class="field"><span>Lösenord (minst 8 tecken)</span><input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
        <label class="field"><span>Roll</span><select name="role"><option value="viewer">Läsbehörighet – ser statistik, kan inte ändra</option><option value="admin">Administratör – full behörighet</option></select></label></div>
        <p class="muted small">Spelare får hellre egna spelarkonton (ovan). Ett gemensamt läskonto, t.ex. "laget", fungerar också. Användarnamn får inte bara vara siffror.</p>
        <div class="actions"><button class="btn primary">Skapa användare</button></div></form>`;
    body.querySelector('[data-new]').onsubmit = async (e) => { e.preventDefault(); try { await post('/api/users', formData(e.target)); toast('Användaren skapad.'); settings(el); } catch (err) { fail(err); } };
    body.onchange = async (e) => { const sel = e.target.closest('[data-role]'); if (!sel) return; try { await put(`/api/users/${sel.closest('tr').dataset.uid}`, { role: sel.value }); toast('Roll ändrad.'); } catch (err) { fail(err); settings(el); } };
    body.onclick = async (e) => {
      const na = e.target.closest('[data-newacc]');
      if (na) { const p = real.find((x) => x.id === na.closest('tr').dataset.pid); return accountForm(p); }
      const tr = e.target.closest('tr[data-uid]'); if (!tr) return;
      const u = allUsers.find((x) => x.id === Number(tr.dataset.uid));
      if (e.target.closest('[data-toggle]')) {
        const ok = await confirmDialog({ title: u.active ? `Stäng av ${u.role === 'player' ? u.player_name : u.username}?` : `Aktivera ${u.role === 'player' ? u.player_name : u.username}?`, text: u.active ? 'Användaren loggas ut och kan inte logga in.' : 'Användaren kan logga in igen.', confirm: u.active ? 'Stäng av' : 'Aktivera', danger: !!u.active });
        if (!ok) return;
        try { await put(`/api/users/${u.id}`, { active: !u.active }); toast('Sparat.'); settings(el); } catch (err) { fail(err); }
      } else if (e.target.closest('[data-pw]')) {
        const { el: m, close } = modal({ title: `Nytt lösenord för ${u.role === 'player' ? `#${u.jersey} ${u.player_name}` : u.username}`, body: '<form><label class="field"><span>Nytt lösenord (minst 8 tecken)</span><input name="password" type="password" minlength="8" required autofocus autocomplete="new-password"></label><div class="actions"><button class="btn primary">Spara</button></div></form>' });
        m.querySelector('form').onsubmit = async (ev) => { ev.preventDefault(); try { await put(`/api/users/${u.id}`, { password: ev.target.password.value }); toast('Lösenordet ändrat.'); close(); } catch (err) { fail(err); } };
      }
    };
  } else if (setTab === 'data') {
    const ex = (href, label, sub) => `<a class="exp" href="${href}">${icon('download')}<span><b>${label}</b><small>${sub}</small></span></a>`;
    body.innerHTML = `<section class="card"><header><h2>Exportera register</h2></header><div class="exp-grid">
      ${ex('/api/export/boter.csv', 'Bötesregister', 'CSV · alla böter inkl. makulerade')}
      ${ex('/api/export/inbetalningar.csv', 'Inbetalningar', 'CSV · inkl. återförda')}
      ${ex('/api/export/spelare.csv', 'Spelare', 'CSV · med saldon')}
      ${ex('/api/export/kassa.csv', 'Kassahändelser', 'CSV')}
      ${ex('/api/export/sasongsrapport.csv', 'Säsongsrapport', 'CSV')}
      ${ex('/api/export/andringslogg.csv', 'Ändringslogg', 'CSV')}</div></section>
    <section class="card"><header><h2>Säkerhetskopia</h2></header><div class="exp-grid">
      ${ex('/api/export/sakerhetskopia.json', 'Hela databasen (JSON)', 'Alla tabeller – spara vid varje månadsskifte')}</div>
      <p class="muted small">Ladda ned en säkerhetskopia regelbundet, t.ex. vid varje månadsskifte.</p></section>
    <section class="card"><header><h2>Exempeldata</h2></header>
      <p>Exempeldata är tydligt märkt (namn "Exempel …", nummer som börjar på <code>X-</code>) och har egna nummerserier, så riktiga bötesnummer påverkas inte. Borttagning tar bara bort exempeldata – riktiga spelare, böter och betalningar rörs aldrig.</p>
      <div class="actions">${s.demo ? '<button class="btn danger" data-demo="remove">Ta bort exempeldata</button>' : '<button class="btn ghost" data-demo="add">Lägg in exempeldata</button>'}</div></section>`;
    body.onclick = async (e) => {
      const b = e.target.closest('[data-demo]'); if (!b) return;
      if (b.dataset.demo === 'add') {
        const ok = await confirmDialog({ title: 'Lägg in exempeldata?', text: 'Sex exempelspelare med böter och betalningar skapas och märks som exempel. Använd för att prova appen – ta bort innan säsongen drar igång.', confirm: 'Lägg in', danger: false });
        if (!ok) return;
        try { await post('/api/demo'); await loadSettings(); toast('Exempeldata inlagd.'); settings(el); } catch (err) { fail(err); }
      } else {
        const ok = await confirmDialog({ title: 'Ta bort all exempeldata?', text: 'Alla exempelspelare och deras exempelböter/betalningar tas bort. Riktiga uppgifter påverkas inte.', confirm: 'Ta bort exempeldata' });
        if (!ok) return;
        try { await del('/api/demo'); await loadSettings(); toast('Exempeldata borttagen.'); settings(el); } catch (err) { fail(err); }
      }
    };
  } else if (setTab === 'log') {
    const log = await get('/api/audit?limit=1000');
    body.innerHTML = `<div class="toolbar"><input type="search" data-q placeholder="Sök i loggen (t.ex. B-0012, makulerad, användare)…"><a class="btn small ghost" href="/api/export/andringslogg.csv">${icon('download')} Exportera</a></div><div data-log></div>`;
    const draw = (q = '') => {
      const rows = log.filter((a) => !q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase()));
      body.querySelector('[data-log]').innerHTML = `<div class="tbl-wrap"><table class="tbl compact log"><thead><tr><th>Tid</th><th>Användare</th><th>Ändring</th><th>Objekt</th><th>Före</th><th>Efter</th><th>Orsak</th></tr></thead><tbody>
        ${rows.slice(0, 500).map((a) => `<tr><td>${fmtTs(a.ts)}</td><td>${esc(a.username)}</td><td><b>${esc(a.action)}</b></td><td>${esc(a.entity)} ${esc(a.entity_id || '')}</td><td><code>${esc(a.old_value || '')}</code></td><td><code>${esc(a.new_value || '')}</code></td><td>${esc(a.reason || '')}</td></tr>`).join('')}</tbody></table></div>`;
    };
    draw(); body.querySelector('[data-q]').oninput = (e) => draw(e.target.value);
  } else {
    body.innerHTML = `<form class="card form-card" data-pw><h3>Byt lösenord</h3><p class="muted">Inloggad som <b>${S.me.jersey ? `#${esc(S.me.jersey)} ` : ''}${esc(S.me.display_name)}</b> (${ROLE[S.me.role].toLowerCase()}).${S.me.role === 'player' ? ' Du loggar in med ditt tröjnummer.' : ''}</p>
      <label class="field"><span>Nuvarande lösenord</span><input type="password" name="current" required autocomplete="current-password"></label>
      <label class="field"><span>Nytt lösenord (minst 8 tecken)</span><input type="password" name="password" minlength="8" required autocomplete="new-password"></label>
      <div class="actions"><button class="btn primary">Byt lösenord</button></div></form>`;
    body.querySelector('[data-pw]').onsubmit = async (e) => { e.preventDefault(); try { await post('/api/me/password', formData(e.target)); toast('Lösenordet bytt.'); e.target.reset(); } catch (err) { fail(err); } };
  }
  void busy; void num;
}
