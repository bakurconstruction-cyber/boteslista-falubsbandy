// Gemensamma hjälpfunktioner för gränssnittet.

export const S = { me: null, settings: null, categories: null };
export const isAdmin = () => S.me && S.me.role === 'admin';
export const isPlayer = () => S.me && S.me.role === 'player';
export const ROLE = { admin: 'Administratör', viewer: 'Läsbehörighet', player: 'Spelare' };

// ---------- API ----------
export class ApiError extends Error { constructor(msg, status, code) { super(msg); this.status = status; this.code = code; } }
export async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'boteskassan' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Kunde inte nå servern. Kontrollera anslutningen – inget har sparats.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* tomt svar */ }
  if (res.status === 401 && url !== '/api/login' && url !== '/api/me/password') { location.hash = '#/login'; }
  if (!res.ok) throw new ApiError((data && data.error) || `Fel ${res.status}`, res.status, data && data.code);
  return data;
}
export const get = (u) => api('GET', u);
export const post = (u, b = {}) => api('POST', u, b);
export const put = (u, b = {}) => api('PUT', u, b);
export const del = (u) => api('DELETE', u);

// ---------- Formatering ----------
const nf0 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const kr = (ore) => (ore == null ? '–' : `${(ore % 100 ? nf2 : nf0).format(ore / 100)} kr`);
export const krPlain = (ore) => (ore % 100 ? (ore / 100).toFixed(2).replace('.', ',') : String(ore / 100));
export const num = (n) => nf0.format(n);
export const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const monthName = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
export const monthShort = (ym) => MON[+ym.split('-')[1] - 1];
export const fmtDate = (d) => { if (!d) return '–'; const [y, m, day] = d.split('-'); return `${+day} ${MON[+m - 1]} ${y}`; };
export const fmtTs = (ts) => (ts ? new Date(ts).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' }) : '–');
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm' }).format(new Date());
export const monthEnd = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
export function seasonMonths() {
  const s = S.settings.season; const out = [];
  let [y, m] = s.start_date.split('-').map(Number);
  const end = s.end_date.slice(0, 7);
  for (;;) { const ym = `${y}-${String(m).padStart(2, '0')}`; out.push(ym); if (ym >= end) break; m++; if (m > 12) { m = 1; y++; } }
  return out;
}
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const STATUS = { obetald: ['Obetald', 'red'], delvis: ['Delvis betald', 'amber'], betald: ['Betald', 'green'], makulerad: ['Makulerad', 'grey'] };
export const statusPill = (s) => `<span class="pill ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
export const demoTag = (x) => (x ? '<span class="pill demo" title="Exempeldata – inte en riktig registrering">Exempel</span>' : '');
// Belopp för en bot: slutbelopp, och vid juniorrabatt även ordinarie belopp och rabatt.
export const fineAmt = (f) => `${kr(f.amount)}${f.discount_amount > 0 ? `<br><small class="muted">ord. ${kr(f.base_amount)} · junior −${kr(f.discount_amount)}</small>` : ''}`;
export const juniorTag = (p) => (p && p.junior_discount > 0 ? `<span class="pill junior" title="Juniorrabatt ${p.junior_discount} % på nya böter">Junior −${p.junior_discount} %</span>` : '');
export const REPORT = { pending: ['Väntar på godkännande', 'amber'], disputed: ['Bestriden – admin avgör', 'red'], approved: ['Godkänd', 'green'], rejected: ['Avslagen', 'grey'] };
export const reportPill = (s) => `<span class="pill ${REPORT[s][1]}">${REPORT[s][0]}</span>`;
export const placeBadge = (p) => `<span class="place p${p <= 3 ? p : 'n'}">${p}</span>`;
export const icon = (name) => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const playerOpts = (players, sel, { activeOnly = true, includeDemo = true } = {}) => players
  .filter((p) => (!activeOnly || p.active || p.id === sel) && (includeDemo || !p.is_demo))
  .map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}${p.jersey ? ` (#${esc(p.jersey)})` : ''}${p.is_demo ? ' – exempel' : ''}${p.active ? '' : ' – inaktiv'}</option>`).join('');

// ---------- Notiser ----------
export function toast(msg, type = 'ok') {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.setAttribute('role', type === 'err' ? 'alert' : 'status');
  t.innerHTML = `${icon(type === 'err' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, type === 'err' ? 6000 : 3500);
}
export const fail = (e) => toast(e.message || String(e), 'err');

// ---------- Modaler ----------
export function modal({ title, body, wide = false, onMount }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Stäng">${icon('x')}</button></header>
    <div class="modal-body">${body}</div></div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('noscroll');
  const prevFocus = document.activeElement;
  const close = () => { wrap.remove(); if (!document.querySelector('.modal-wrap')) document.body.classList.remove('noscroll'); prevFocus?.focus?.(); };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('[data-close]').onclick = close;
  wrap._close = close;
  const el = wrap.querySelector('.modal');
  onMount?.(el, close);
  setTimeout(() => (el.querySelector('[autofocus]') || el.querySelector('input,select,textarea,button:not([data-close])'))?.focus(), 30);
  return { el, close };
}

// Escape stänger alltid den översta modalen, oavsett var fokus är.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const top = [...document.querySelectorAll('.modal-wrap')].pop();
  if (top) { e.preventDefault(); top._close(); }
});

// Bekräftelse före destruktiva åtgärder. Med reason: true krävs en anledning.
export function confirmDialog({ title, text, confirm = 'Bekräfta', danger = true, reason = false, reasonLabel = 'Anledning (obligatorisk)' }) {
  return new Promise((resolve) => {
    let done = false;
    const { el, close } = modal({
      title,
      body: `<p class="lead">${text}</p>
        ${reason ? `<label class="field"><span>${esc(reasonLabel)}</span><textarea name="reason" rows="2" maxlength="300" required autofocus></textarea></label>` : ''}
        <div class="actions"><button class="btn ghost" data-no>Avbryt</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirm)}</button></div>`,
    });
    const finish = (v) => { if (done) return; done = true; close(); resolve(v); };
    el.querySelector('[data-no]').onclick = () => finish(false);
    el.querySelector('[data-yes]').onclick = () => {
      if (reason) {
        const r = el.querySelector('[name=reason]').value.trim();
        if (!r) { el.querySelector('[name=reason]').focus(); toast('Ange en anledning.', 'err'); return; }
        finish(r);
      } else finish(true);
    };
    const obs = new MutationObserver(() => { if (!el.isConnected) { obs.disconnect(); finish(false); } });
    obs.observe(document.body, { childList: true });
  });
}

// Formulärdata som objekt
export const formData = (form) => Object.fromEntries(new FormData(form).entries());

// Knapp som visar att något pågår och förhindrar dubbelklick
export async function busy(btn, fn) {
  if (btn.disabled) return;
  const label = btn.innerHTML;
  btn.disabled = true; btn.classList.add('busy');
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = label; }
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Kopierat – klistra in i lagets chatt.'); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Kopierat – klistra in i lagets chatt.'); } catch { toast('Kunde inte kopiera. Markera texten och kopiera manuellt.', 'err'); }
    ta.remove();
  }
}

export function reminderText(r, settings) {
  const first = r.name.split(' ')[0];
  const list = r.fines.map((f) => `${f.fine_no} ${f.category} ${kr(f.remaining)}`).join(', ');
  return `Hej ${first}! Påminnelse från böteskassan (${settings.team_name}): du har ${kr(r.amount)} i obetalda böter (${list}). `
    + `Sista betalningsdag: ${fmtDate(r.earliest_due)}${r.overdue_amount ? ` – ${kr(r.overdue_amount)} är redan förfallet` : ''}. `
    + `Betala till: ${settings.payment_info}. Märk betalningen med namn och bötesnummer. Tack!`;
}

// Enkel stapeldiagram-SVG (grupperade staplar)
export function barChart(rows, series, { height = 220 } = {}) {
  if (!rows.length) return '<p class="muted">Ingen data ännu.</p>';
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key])));
  const top = niceCeil(max);
  const W = Math.max(720, rows.length * 64); const H = height; const padL = 52; const padB = 26; const padT = 10;
  const iw = W - padL - 8; const ih = H - padB - padT; const gw = iw / rows.length; const bw = Math.min(18, (gw - 14) / series.length);
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = padT + ih - (ih * i) / 4; const v = (top * i) / 4;
    g += `<line x1="${padL}" x2="${W - 8}" y1="${y}" y2="${y}" class="grid"/><text x="${padL - 8}" y="${y + 4}" class="axis" text-anchor="end">${num(v / 100)}</text>`;
  }
  rows.forEach((r, i) => {
    const x0 = padL + gw * i + (gw - bw * series.length - 4 * (series.length - 1)) / 2;
    series.forEach((s, j) => {
      const v = r[s.key]; const bh = (ih * v) / top; const x = x0 + j * (bw + 4);
      g += `<rect x="${x}" y="${padT + ih - bh}" width="${bw}" height="${Math.max(bh, v ? 2 : 0)}" rx="3" class="${s.cls}"><title>${monthName(r.month)} – ${s.label}: ${kr(v)}</title></rect>`;
    });
    g += `<text x="${padL + gw * i + gw / 2}" y="${H - 8}" class="axis" text-anchor="middle">${monthShort(r.month)}</text>`;
  });
  const legend = series.map((s) => `<span class="lg"><i class="${s.cls}"></i>${s.label}</span>`).join('');
  return `<div class="legend">${legend}</div><div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" style="min-width:${Math.max(360, rows.length * 44)}px" class="chart" role="img" aria-label="Diagram per månad">${g}</svg></div>`;
}
function niceCeil(v) {
  const p = 10 ** Math.floor(Math.log10(v)); const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10) * p;
}

export const empty = (text, cta = '') => `<div class="empty">${icon('puck')}<p>${text}</p>${cta}</div>`;
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
