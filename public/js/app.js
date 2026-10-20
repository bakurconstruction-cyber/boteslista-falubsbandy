// Appens skal: inloggning, navigation och routing.
import { S, get, post, esc, icon, isAdmin, toast, fail, busy, formData } from './core.js';
import * as P1 from './pages1.js';
import * as P2 from './pages2.js';
import { fineForm, paymentForm } from './forms.js';

const NAV = [
  ['', 'Översikt', 'home', P1.dashboard],
  ['spelare', 'Spelare', 'users', P1.players],
  ['boter', 'Böter', 'list', P1.fines],
  ['betalningar', 'Inbetalningar', 'coin', P1.payments],
  ['leaderboard', 'Leaderboard', 'trophy', P2.leaderboard],
  ['manad', 'Månadsskifte', 'calendar', P2.month],
  ['regler', 'Regler', 'rule', P2.rules],
  ['kassa', 'Kassa', 'wallet', P2.cash],
  ['installningar', 'Inställningar', 'gear', P2.settings],
];
const ROUTES = { ...Object.fromEntries(NAV.map((n) => [n[0], n[3]])), 'spelare/:id': P1.profile };

export async function loadSettings() {
  S.settings = await get('/api/settings');
  document.querySelector('[data-demo-banner]')?.toggleAttribute('hidden', !S.settings.demo);
  const tn = document.querySelector('[data-team]'); if (tn) tn.textContent = S.settings.team_name;
}

let rendering = 0;
export async function refresh() { await route(true); }

async function route(keepScroll = false) {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === 'login') return showLogin();
  if (!S.me) return boot();
  const [base, id] = hash.split('/');
  const fn = id && base === 'spelare' ? ROUTES['spelare/:id'] : ROUTES[base] ?? ROUTES[''];
  const main = document.querySelector('main');
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === base));
  const my = ++rendering; const y = window.scrollY;
  if (!keepScroll) main.innerHTML = '<div class="loading" aria-label="Laddar"></div>';
  try {
    const holder = document.createElement('div');
    holder.className = 'page';
    await fn(holder, id ? [decodeURIComponent(id)] : []);
    if (my !== rendering) return;
    main.replaceChildren(holder);
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    document.title = `${NAV.find((n) => n[0] === base)?.[1] || 'Spelare'} · Böteskassan 26/27`;
  } catch (e) {
    if (e.status === 401) return;
    main.innerHTML = `<div class="empty">${icon('alert')}<p>${esc(e.message)}</p><a class="btn ghost" href="#/">Till översikten</a></div>`;
  }
  document.body.classList.remove('menu-open');
}

function shell() {
  const admin = isAdmin();
  document.getElementById('app').innerHTML = `
  <aside class="side">
    <a class="brand" href="#/"><span class="ball"></span><span><b>Böteskassan</b><small>26/27 · <span data-team>${esc(S.settings.team_name)}</span></small></span></a>
    ${admin ? `<button class="btn primary block quick" data-quick="fine">${icon('plus')} Ny bot <kbd>N</kbd></button>` : ''}
    <nav>${NAV.map(([k, l, ic]) => `<a href="#/${k}" data-nav="${k}">${icon(ic)}<span>${l}</span></a>`).join('')}</nav>
    <div class="me"><span>${esc(S.me.display_name)}<small>${admin ? 'Administratör' : 'Läsbehörighet'}</small></span><button class="icon-btn" data-logout title="Logga ut" aria-label="Logga ut">${icon('logout')}</button></div>
  </aside>
  <div class="content">
    <div class="demo-banner" data-demo-banner ${S.settings.demo ? '' : 'hidden'}>Exempeldata finns i appen (märkt "Exempel"). Ta bort den under Inställningar → Export & data innan ni börjar på riktigt.</div>
    <main></main>
  </div>
  <nav class="bottom">
    <a href="#/" data-nav="">${icon('home')}<span>Översikt</span></a>
    <a href="#/boter" data-nav="boter">${icon('list')}<span>Böter</span></a>
    ${admin ? `<button class="fab" data-quick="fine" aria-label="Ny bot">${icon('plus')}</button>` : `<a href="#/spelare" data-nav="spelare">${icon('users')}<span>Spelare</span></a>`}
    <a href="#/leaderboard" data-nav="leaderboard">${icon('trophy')}<span>Topplista</span></a>
    <button data-menu>${icon('menu')}<span>Mer</span></button>
  </nav>
  <div class="scrim" data-scrim></div>`;
  const app = document.getElementById('app');
  app.addEventListener('click', async (e) => {
    if (e.target.closest('[data-quick=fine]')) return fineForm();
    if (e.target.closest('[data-menu]')) return document.body.classList.toggle('menu-open');
    if (e.target.closest('[data-scrim]')) return document.body.classList.remove('menu-open');
    if (e.target.closest('[data-logout]')) { await post('/api/logout'); S.me = null; location.hash = '#/login'; }
  });
}

document.addEventListener('keydown', (e) => {
  if (!S.me || !isAdmin() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.modal-wrap') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); fineForm(); }
  if (e.key === 'b' || e.key === 'B') { e.preventDefault(); paymentForm(); }
});

async function showLogin() {
  const st = await get('/api/status');
  if (st.user) { location.hash = '#/'; return; }
  const setup = st.needs_setup;
  document.getElementById('app').innerHTML = `<div class="login"><form class="login-card" novalidate>
    <div class="brand big"><span class="ball"></span><span><b>Böteskassan</b><small>Säsongen 2026/2027</small></span></div>
    ${setup ? '<h1>Välkommen!</h1><p class="muted">Skapa det första administratörskontot. Det får full behörighet och kan sedan skapa fler användare.</p>' : '<h1>Logga in</h1>'}
    <label class="field"><span>Användarnamn</span><input name="username" autocomplete="username" required autofocus></label>
    ${setup ? '<label class="field"><span>Ditt namn</span><input name="display_name" maxlength="60" placeholder="t.ex. Kassören"></label>' : ''}
    <label class="field"><span>Lösenord${setup ? ' (minst 8 tecken)' : ''}</span><input name="password" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" required></label>
    <button class="btn primary block">${setup ? 'Skapa administratör' : 'Logga in'}</button>
  </form></div>`;
  const form = document.querySelector('.login-card');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await busy(form.querySelector('button'), async () => {
      try { await post(setup ? '/api/setup' : '/api/login', formData(form)); S.me = null; location.hash = '#/'; await boot(); }
      catch (err) { fail(err); }
    });
  };
}

async function boot() {
  try {
    const st = await get('/api/status');
    if (!st.user) { if (location.hash !== '#/login') location.hash = '#/login'; else showLogin(); return; }
    S.me = st.user;
    await loadSettings();
    shell();
    if (location.hash === '#/login') location.hash = '#/'; else route();
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="login"><div class="login-card"><h1>Kan inte starta</h1><p>${esc(e.message)}</p><button class="btn primary" onclick="location.reload()">Försök igen</button></div></div>`;
  }
}

window.addEventListener('hashchange', () => route());
window.addEventListener('unhandledrejection', (e) => { if (e.reason?.message) toast(e.reason.message, 'err'); });
boot();
