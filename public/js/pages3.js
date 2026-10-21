// Sida: Bötesanmälningar
import { S, get, esc, icon, kr, fmtDate, fmtTs, isAdmin, isPlayer, empty } from './core.js';
import { reportForm, decideReport, reportCard, fineDetail, verifiedPaymentForm } from './forms.js';
import { refresh } from './app.js';

let tab = '';
export async function reports(el) {
  const list = await get('/api/reports');
  const admin = isAdmin(); const player = isPlayer();
  const todo = admin ? list.filter((r) => ['pending', 'disputed'].includes(r.status))
    : player ? list.filter((r) => r.player_id === S.me.player_id && r.status === 'pending') : [];
  const tabs = admin
    ? [['todo', `Att hantera (${todo.length})`], ['disputed', `Bestridda (${list.filter((r) => r.status === 'disputed').length})`], ['all', 'Alla']]
    : player
      ? [['todo', `Att svara på (${todo.length})`], ['mine', `Mina anmälningar (${list.filter((r) => r.reporter_player_id === S.me.player_id).length})`], ['against', 'Mot mig'], ['all', 'Alla']]
      : [['all', 'Alla']];
  if (!tabs.some(([k]) => k === tab)) tab = tabs[0][0];
  el.innerHTML = `
  <div class="page-h"><div><h1>Anmälningar</h1><p class="muted">Anmälda böter blir officiella först när de godkänts. Tills dess påverkar de varken skuld, kassa eller leaderboard.</p></div>
    <div class="btns">${player ? `<button class="btn primary" data-act="new">${icon('flag')} Anmäl bot</button>` : ''}${admin ? `<a class="btn ghost" href="/api/export/anmalningar.csv">${icon('download')} Exportera</a>` : ''}</div></div>
  ${player ? '<div class="notice">' + icon('info') + '<div><b>Så går det till:</b> du anmäler en lagkamrat → hen kan godkänna eller bestrida → bestridda avgörs av administratören. Godkänd anmälan blir en bot med eget bötesnummer.</div></div>' : ''}
  <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
  <div class="toolbar" data-filters ${tab === 'all' ? '' : 'hidden'}><select data-status><option value="">Alla statusar</option><option value="pending">Väntar på godkännande</option><option value="disputed">Bestridda</option><option value="approved">Godkända</option><option value="rejected">Avslagna</option></select></div>
  <div class="rep-list" data-list></div>`;
  let status = '';
  const draw = () => {
    const rows = tab === 'todo' ? todo
      : tab === 'disputed' ? list.filter((r) => r.status === 'disputed')
      : tab === 'mine' ? list.filter((r) => r.reporter_player_id === S.me.player_id)
      : tab === 'against' ? list.filter((r) => r.player_id === S.me.player_id)
      : list.filter((r) => !status || r.status === status);
    const none = tab === 'todo' ? (admin ? 'Inga anmälningar väntar på beslut. 👏' : 'Inga anmälningar att svara på.') : tab === 'mine' ? 'Du har inte anmält någon ännu.' : 'Inga anmälningar.';
    el.querySelector('[data-list]').innerHTML = rows.length ? rows.map(reportCard).join('') : empty(none, player && tab !== 'against' ? `<button class="btn primary" data-act="new">${icon('flag')} Anmäl bot</button>` : '');
  };
  draw();
  el.querySelector('[data-status]').onchange = (e) => { status = e.target.value; draw(); };
  el.onclick = (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return reports(el); }
    if (e.target.closest('[data-act=new]')) return reportForm();
    const f = e.target.closest('[data-fineno]'); if (f) { e.preventDefault(); return fineDetail(f.dataset.fineno); }
    const b = e.target.closest('[data-rep]'); if (!b) return;
    const r = list.find((x) => x.id === Number(b.dataset.rid));
    if (r) decideReport(r, b.dataset.rep, b.closest('.rep'));
  };
  void esc;
}

// ---------- Registrera betalningar (administratör eller spelare med kassabehörighet) ----------
let vq = '';
export async function verify(el) {
  const d = await get('/api/verify/overview');
  el.innerHTML = `
  <div class="page-h"><div><h1>Registrera betalningar</h1><p class="muted">Registrera bara betalningar som du har kontrollerat har kommit in (Swish, bank eller kontant). Felaktiga registreringar rättas av administratören.</p></div></div>
  <div class="notice">${icon('shield')}<div><b>Så kontrollerar du:</b> leta upp betalningen i Swish/banken. Spelarnas Swish-meddelande börjar med <code>Böter S-…</code> följt av namn, så du ser vem som betalat. Registreringen sparas med ditt namn, belopp och tidpunkt.</div></div>
  <section class="kpis"><div class="kpi neg"><small>Obetalt totalt</small><b>${kr(d.total)}</b><span>${d.players.length} spelare med skuld</span></div></section>
  <div class="toolbar"><input type="search" data-q placeholder="Sök spelare eller tröjnummer…" value="${esc(vq)}"></div>
  <div data-list></div>
  <section class="card"><header><h2>Senast registrerade betalningar</h2></header>
    ${d.recent.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>ID</th><th>Spelare</th><th class="r">Belopp</th><th class="hide-m">Datum</th><th class="hide-m">Sätt</th><th>Registrerad av</th></tr></thead><tbody>
      ${d.recent.map((x) => `<tr class="${x.reversed ? 'struck' : ''}"><td><b>${esc(x.payment_no)}</b></td><td>${esc(x.player_name)}</td><td class="r pos">${kr(x.amount)}</td><td class="hide-m">${fmtDate(x.date)}</td><td class="hide-m">${esc(x.method)}</td><td><small>${esc(x.registered_by)}<br><span class="muted">${fmtTs(x.created_at)}</span></small></td></tr>`).join('')}</tbody></table></div>` : empty('Inga betalningar registrerade ännu.')}
  </section>`;
  const draw = () => {
    const q = vq.toLowerCase().trim();
    const rows = d.players.filter((p) => !q || `${p.name} ${p.jersey || ''} ${p.id}`.toLowerCase().includes(q));
    el.querySelector('[data-list]').innerHTML = !d.players.length ? empty('Ingen har obetald skuld just nu. 👏')
      : !rows.length ? empty('Ingen spelare matchar sökningen.')
      : `<div class="tbl-wrap"><table class="tbl pay-tbl"><thead><tr><th>#</th><th>Spelare</th><th class="r">Skuld</th><th class="hide-m">Obetalda böter</th><th></th></tr></thead><tbody>
        ${rows.map((p) => `<tr data-pid="${esc(p.id)}"><td class="jersey">${esc(p.jersey || '')}</td><td><b>${esc(p.name)}</b><br><small class="muted">${esc(p.id)}${p.active ? '' : ' · inaktiv'}</small></td>
          <td class="r"><b class="neg">${kr(p.debt)}</b>${p.overdue_amount ? `<br><small class="warn">${kr(p.overdue_amount)} försenat</small>` : ''}</td>
          <td class="hide-m"><small>${p.fines.map((f) => `${esc(f.fine_no)} ${kr(f.remaining)}`).join(' · ')}</small></td>
          <td class="r">${p.self ? '<small class="muted">Din egen – registreras av admin</small>' : `<div class="btns end"><button class="btn small ghost" data-pay="partial">Delbetalning</button><button class="btn small primary" data-pay="full">${icon('check')} Hela skulden</button></div>`}</td></tr>`).join('')}</tbody></table></div>`;
  };
  draw();
  el.querySelector('[data-q]').oninput = (e) => { vq = e.target.value; draw(); };
  el.onclick = (e) => {
    const b = e.target.closest('[data-pay]'); if (!b) return;
    const p = d.players.find((x) => x.id === b.closest('tr').dataset.pid);
    if (p) verifiedPaymentForm(p, b.dataset.pay, refresh);
  };
}
