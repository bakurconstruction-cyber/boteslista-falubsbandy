// Sida: Bötesanmälningar
import { S, get, esc, icon, isAdmin, isPlayer, empty } from './core.js';
import { reportForm, decideReport, reportCard, fineDetail } from './forms.js';

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
    if (r) decideReport(r, b.dataset.rep);
  };
  void esc;
}
