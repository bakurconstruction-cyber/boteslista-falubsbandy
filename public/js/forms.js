// Formulär och detaljvyer som används från flera sidor.
import { S, get, post, put, esc, kr, krPlain, today, monthEnd, modal, confirmDialog, toast, fail, busy, formData, statusPill, demoTag, fmtDate, fmtTs, isAdmin, uid, playerOpts, icon } from './core.js';
import { refresh } from './app.js';

const RULE_KINDS = ['no_fines', 'least_fines', 'late'];
async function categories() { S.categories = await get('/api/categories'); return S.categories; }

// ---------- Registrera bot (snabbflöde) ----------
export async function fineForm({ playerId } = {}) {
  const [players, cats] = await Promise.all([get('/api/players'), categories()]);
  const active = players.filter((p) => p.active);
  if (!active.length) { toast('Lägg till spelare först.', 'err'); location.hash = '#/spelare'; return; }
  const selected = new Set(playerId ? [playerId] : []);
  const t = today();
  const { el, close } = modal({
    title: 'Registrera bot', wide: true,
    body: `<form class="fine-form" novalidate>
      <div class="step"><div class="step-h"><b>1</b> Spelare <small class="muted">– välj en eller flera</small></div>
        <input class="search" type="search" placeholder="Sök spelare…" data-psearch>
        <div class="chips" data-players>${active.map((p) => `<button type="button" class="chip ${selected.has(p.id) ? 'on' : ''}" data-pid="${esc(p.id)}">${p.jersey ? `<em>${esc(p.jersey)}</em>` : ''}${esc(p.name)}${p.is_demo ? ' <small>(ex)</small>' : ''}</button>`).join('')}</div></div>
      <div class="step"><div class="step-h"><b>2</b> Böteskategori</div>
        <input class="search" type="search" placeholder="Sök kategori eller nummer…" data-csearch>
        <div class="cat-grid" data-cats>${cats.map((c) => {
          const rule = RULE_KINDS.includes(c.kind);
          const amt = c.kind === 'stick' ? 'beräknas' : c.kind === 'planted' ? 'som original' : kr(c.default_amount) + (c.kind === 'per_item' ? '/st' : '');
          return `<button type="button" class="cat ${c.active && !rule ? '' : 'disabled'}" data-cid="${c.id}" ${c.active && !rule ? '' : 'disabled'} title="${rule ? 'Registreras via sidan Regler' : c.active ? '' : 'Inaktiverad kategori'}"><span class="n">${c.number}</span><span class="t">${esc(c.name)}</span><span class="a">${rule ? 'via Regler' : c.active ? amt : 'inaktiv'}</span></button>`;
        }).join('')}</div></div>
      <div class="step" data-details hidden><div class="step-h"><b>3</b> Detaljer</div>
        <div class="grid2" data-kindfields></div>
        <div class="grid3">
          <label class="field"><span>Datum</span><input type="date" name="issued_date" value="${t}" max="${t}" required></label>
          <label class="field"><span>Sista betalningsdag</span><input type="date" name="due_date" value="${monthEnd(t.slice(0, 7))}"></label>
          <label class="field"><span>Beskrivning / kommentar</span><input name="description" maxlength="500" placeholder="Valfritt"></label>
        </div>
        <div class="calc" data-calc></div>
      </div>
      <div class="actions sticky">
        <span class="summary" data-summary>Välj spelare och kategori</span>
        <button type="button" class="btn ghost" data-again>Registrera & ny</button>
        <button type="submit" class="btn primary">Registrera</button>
      </div></form>`,
  });
  const form = el.querySelector('form');
  let cat = null; let planted = null;

  const updatePlayers = () => el.querySelectorAll('[data-pid]').forEach((b) => b.classList.toggle('on', selected.has(b.dataset.pid)));
  el.querySelector('[data-players]').onclick = (e) => {
    const b = e.target.closest('[data-pid]'); if (!b) return;
    selected.has(b.dataset.pid) ? selected.delete(b.dataset.pid) : selected.add(b.dataset.pid);
    updatePlayers(); summary();
  };
  el.querySelector('[data-psearch]').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    el.querySelectorAll('[data-pid]').forEach((b) => { b.hidden = q && !b.textContent.toLowerCase().includes(q); });
  };
  el.querySelector('[data-psearch]').onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const b = [...el.querySelectorAll('[data-pid]')].find((x) => !x.hidden); if (b) { b.click(); e.target.value = ''; e.target.dispatchEvent(new Event('input')); el.querySelector('[data-csearch]').focus(); } }
  };
  el.querySelector('[data-csearch]').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    el.querySelectorAll('[data-cid]').forEach((b) => { b.hidden = q && !(b.textContent.toLowerCase().includes(q) || b.querySelector('.n').textContent === q); });
  };
  el.querySelector('[data-csearch]').onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const b = [...el.querySelectorAll('[data-cid]')].find((x) => !x.hidden && !x.disabled); b?.click(); }
  };
  el.querySelector('[data-cats]').onclick = (e) => {
    const b = e.target.closest('[data-cid]'); if (!b || b.disabled) return;
    cat = cats.find((c) => c.id === Number(b.dataset.cid)); planted = null;
    el.querySelectorAll('[data-cid]').forEach((x) => x.classList.toggle('on', x === b));
    renderKind(); summary();
    el.querySelector('[data-details]').hidden = false;
    (el.querySelector('[data-kindfields] input') || el.querySelector('[name=description]')).focus();
  };
  function renderKind() {
    const box = el.querySelector('[data-kindfields]');
    if (cat.kind === 'stick') {
      box.innerHTML = `<label class="field"><span>Klubbans värde (kr)</span><input name="stick_value" inputmode="decimal" required placeholder="t.ex. 1200"></label>
        <label class="field"><span>Kostnad för ny klubba (kr)</span><input name="new_stick_cost" inputmode="decimal" required placeholder="t.ex. 900"></label>`;
    } else if (cat.kind === 'planted') {
      box.innerHTML = `<label class="field"><span>Ursprungligt bötesnummer</span><input name="ref_fine_no" required placeholder="B-0001" autocomplete="off"></label><div class="field" data-refinfo><span>&nbsp;</span><p class="muted">Beloppet hämtas automatiskt.</p></div>`;
      let timer;
      box.querySelector('[name=ref_fine_no]').oninput = (e) => {
        clearTimeout(timer); planted = null; summary();
        const v = e.target.value.trim();
        if (!/^[a-zA-Z]+-[a-zA-Z]?\d+$/.test(v)) { box.querySelector('[data-refinfo] p').textContent = 'Ange t.ex. B-0012'; return; }
        timer = setTimeout(async () => {
          try {
            const f = await get(`/api/fines/lookup?no=${encodeURIComponent(v)}`);
            planted = f;
            box.querySelector('[data-refinfo] p').innerHTML = f.voided ? `<span class="neg">${esc(f.fine_no)} är makulerad</span>`
              : `<b>${esc(f.fine_no)}</b> · ${esc(f.player_name)} · ${esc(f.category_name)} · <b>${kr(f.amount)}</b>`;
          } catch (err) { box.querySelector('[data-refinfo] p').innerHTML = `<span class="neg">${esc(err.message)}</span>`; }
          summary();
        }, 250);
      };
    } else if (cat.kind === 'per_item') {
      box.innerHTML = `<label class="field"><span>Antal (${esc(cat.unit_note)})</span><input name="quantity" type="number" min="1" max="30" value="1"></label>
        <label class="field"><span>Belopp totalt (kr)</span><input name="amount" inputmode="decimal" value="${krPlain(cat.default_amount)}" data-default="${cat.default_amount}"></label>`;
    } else {
      box.innerHTML = `<label class="field"><span>Belopp (kr) – standard ${kr(cat.default_amount)}</span><input name="amount" inputmode="decimal" value="${krPlain(cat.default_amount)}"></label><div></div>`;
    }
    box.querySelectorAll('input').forEach((i) => i.addEventListener('input', summary));
  }
  const parse = (v) => { const s = String(v || '').replace(/\s/g, '').replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(parseFloat(s) * 100) : null; };
  // per_item: beloppsfältet visar totalen när antalet ändras
  form.addEventListener('input', (e) => {
    if (e.target.name === 'quantity' && cat?.kind === 'per_item') {
      const q = Math.max(1, Number(e.target.value) || 1);
      form.amount.value = krPlain(cat.default_amount * q);
      form.amount.previousElementSibling.textContent = `Belopp totalt (kr) – ${q} × ${kr(cat.default_amount)}`;
      summary();
    }
    if (e.target.name === 'issued_date' && e.target.value) form.due_date.value = monthEnd(e.target.value.slice(0, 7));
  });
  function perFine() {
    if (!cat) return null;
    if (cat.kind === 'stick') { const v = parse(form.stick_value?.value); const c = parse(form.new_stick_cost?.value); return v && c != null ? Math.round(v / 2) + c : null; }
    if (cat.kind === 'planted') return planted && !planted.voided ? planted.amount : null;
    return parse(form.amount?.value);
  }
  function summary() {
    const s = el.querySelector('[data-summary]'); const c = el.querySelector('[data-calc]');
    const a = perFine(); const n = selected.size;
    if (cat?.kind === 'stick') {
      const v = parse(form.stick_value?.value); const cost = parse(form.new_stick_cost?.value);
      c.innerHTML = v && cost != null ? `<b>Beräkning:</b> 50 % av ${kr(v)} = ${kr(Math.round(v / 2))} + ny klubba ${kr(cost)} = <b>${kr(Math.round(v / 2) + cost)}</b>` : 'Fyll i klubbans värde och kostnaden för en ny klubba så visas beräkningen här.';
    } else if (cat && cat.kind !== 'planted' && a != null && a !== cat.default_amount * (Number(form.quantity?.value) || 1)) {
      c.innerHTML = `<span class="warn">Beloppet avviker från standard (${kr(cat.default_amount * (Number(form.quantity?.value) || 1))}). Ändringen loggas.</span>`;
    } else c.innerHTML = '';
    if (!n || !cat) { s.textContent = !n ? 'Välj minst en spelare' : 'Välj en kategori'; return; }
    s.innerHTML = a ? `${n} ${n === 1 ? 'bot' : 'böter'} × ${kr(a)} = <b>${kr(a * n)}</b>` : 'Komplettera uppgifterna';
  }
  async function submit(again, btn) {
    if (!selected.size) return toast('Välj minst en spelare.', 'err');
    if (!cat) return toast('Välj en böteskategori.', 'err');
    const d = formData(form);
    const base = { category_id: cat.id, issued_date: d.issued_date, due_date: d.due_date, description: d.description };
    if (cat.kind === 'stick') Object.assign(base, { stick_value: d.stick_value, new_stick_cost: d.new_stick_cost });
    else if (cat.kind === 'planted') base.ref_fine_no = d.ref_fine_no;
    else if (cat.kind === 'per_item') { base.quantity = Number(d.quantity) || 1; base.amount = d.amount; }
    else base.amount = d.amount;
    await busy(btn, async () => {
      try {
        const r = await post('/api/fines', { items: [...selected].map((pid) => ({ ...base, player_id: pid })) });
        toast(`${r.fine_nos.join(', ')} registrerad${r.fine_nos.length > 1 ? 'e' : ''}.`);
        refresh();
        if (again) {
          selected.clear(); updatePlayers(); cat = null;
          el.querySelectorAll('[data-cid]').forEach((x) => x.classList.remove('on'));
          el.querySelector('[data-details]').hidden = true; form.description.value = '';
          summary(); el.querySelector('[data-psearch]').focus();
        } else close();
      } catch (e) { fail(e); }
    });
  }
  form.onsubmit = (e) => { e.preventDefault(); submit(false, form.querySelector('[type=submit]')); };
  el.querySelector('[data-again]').onclick = (e) => submit(true, e.currentTarget);
  summary();
  if (!playerId) el.querySelector('[data-psearch]').focus(); else el.querySelector('[data-csearch]').focus();
}

// ---------- Registrera inbetalning ----------
export async function paymentForm({ playerId, prefill = {}, fineId } = {}) {
  const players = await get('/api/players');
  const key = uid();
  const t = today();
  const { el, close } = modal({
    title: prefill.correcting ? `Korrigerad inbetalning (ersätter ${prefill.correcting})` : 'Registrera inbetalning', wide: true,
    body: `<form novalidate>
      <div class="grid3">
        <label class="field"><span>Spelare</span><select name="player_id" required><option value="">Välj spelare…</option>${playerOpts(players, playerId || prefill.player_id, { activeOnly: false })}</select></label>
        <label class="field"><span>Betalningsdatum</span><input type="date" name="date" value="${prefill.date || t}" max="${t}" required></label>
        <label class="field"><span>Belopp (kr)</span><input name="amount" inputmode="decimal" required value="${esc(prefill.amount || '')}" placeholder="0"></label>
        <label class="field"><span>Betalningsmetod</span><select name="method">${S.settings.methods.map((m) => `<option ${m === (prefill.method || 'Swish') ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="field"><span>Referens / meddelande</span><input name="reference" maxlength="120" value="${esc(prefill.reference || '')}" placeholder="t.ex. Swish-meddelande"></label>
        <label class="field"><span>Kommentar</span><input name="comment" maxlength="500" value="${esc(prefill.comment || '')}"></label>
      </div>
      <div class="player-status" data-pstatus></div>
      <fieldset class="seg" data-mode>
        <legend>Fördelning mot böter</legend>
        <label><input type="radio" name="allocation_mode" value="auto" checked> Automatiskt (äldst först)</label>
        <label><input type="radio" name="allocation_mode" value="manual"> Välj själv</label>
        <label><input type="radio" name="allocation_mode" value="none"> Fördela inte (blir tillgodohavande)</label>
      </fieldset>
      <div data-alloc></div>
      <div class="actions sticky"><span class="summary" data-summary></span><button type="button" class="btn ghost" data-close2>Avbryt</button><button type="submit" class="btn primary">Registrera inbetalning</button></div>
    </form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-close2]').onclick = close;
  let open = []; let credit = 0;
  const parse = (v) => { const s = String(v || '').replace(/\s/g, '').replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(parseFloat(s) * 100) : null; };
  async function loadPlayer() {
    const pid = form.player_id.value; open = []; credit = 0;
    const box = el.querySelector('[data-pstatus]');
    if (!pid) { box.innerHTML = ''; renderAlloc(); return; }
    const d = await get(`/api/players/${encodeURIComponent(pid)}`);
    open = d.fines.filter((f) => f.remaining > 0).sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id - b.id);
    credit = Math.max(0, d.player.credit);
    box.innerHTML = `<div class="mini-kpis"><div><small>Skuld</small><b class="${d.player.debt ? 'neg' : ''}">${kr(d.player.debt)}</b></div><div><small>Obetalda böter</small><b>${open.length}</b></div><div><small>Tillgodo</small><b class="pos">${kr(credit)}</b></div><div><small>Senaste betalning</small><b>${fmtDate(d.player.last_payment)}</b></div></div>`;
    if (!form.amount.value && d.player.debt) form.amount.placeholder = krPlain(d.player.debt);
    renderAlloc();
  }
  function renderAlloc() {
    const mode = form.allocation_mode.value; const box = el.querySelector('[data-alloc]');
    if (mode !== 'manual') { box.innerHTML = ''; summary(); return; }
    if (!open.length) { box.innerHTML = '<p class="muted">Spelaren har inga obetalda böter.</p>'; summary(); return; }
    box.innerHTML = `<table class="tbl compact"><thead><tr><th>Bot</th><th>Kategori</th><th>Förfaller</th><th class="r">Kvar</th><th class="r">Fördela (kr)</th></tr></thead><tbody>
      ${open.map((f) => `<tr><td><b>${esc(f.fine_no)}</b></td><td>${esc(f.category_name)}</td><td class="${f.overdue ? 'neg' : ''}">${fmtDate(f.due_date)}</td><td class="r">${kr(f.remaining)}</td>
      <td class="r"><input class="alloc-in" data-fid="${f.id}" data-max="${f.remaining}" inputmode="decimal" placeholder="0" value="${fineId === f.id ? krPlain(f.remaining) : ''}"> <button type="button" class="btn tiny ghost" data-fill="${f.id}">Allt</button></td></tr>`).join('')}
      </tbody></table>`;
    box.querySelectorAll('input').forEach((i) => (i.oninput = summary));
    box.onclick = (e) => { const b = e.target.closest('[data-fill]'); if (!b) return; const i = box.querySelector(`[data-fid="${b.dataset.fill}"]`); i.value = krPlain(Number(i.dataset.max)); summary(); };
    summary();
  }
  function summary() {
    const amt = parse(form.amount.value); const s = el.querySelector('[data-summary]');
    if (!amt) { s.textContent = 'Ange belopp'; return; }
    const mode = form.allocation_mode.value;
    let alloc = 0;
    if (mode === 'auto') alloc = Math.min(amt, open.reduce((x, f) => x + f.remaining, 0));
    if (mode === 'manual') alloc = [...el.querySelectorAll('.alloc-in')].reduce((x, i) => x + (parse(i.value) || 0), 0);
    const over = alloc > amt;
    s.innerHTML = over ? `<span class="neg">Fördelat ${kr(alloc)} är mer än beloppet ${kr(amt)}</span>` : `Fördelas: <b>${kr(alloc)}</b> · Tillgodohavande: <b class="pos">${kr(amt - alloc)}</b>`;
  }
  form.player_id.onchange = loadPlayer;
  form.amount.oninput = summary;
  el.querySelector('[data-mode]').onchange = renderAlloc;
  if (fineId) form.allocation_mode.value = 'manual';
  await loadPlayer();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(form);
    if (!d.player_id) return toast('Välj spelare.', 'err');
    const body = { ...d, idempotency_key: key };
    if (d.allocation_mode === 'manual') body.allocations = [...el.querySelectorAll('.alloc-in')].map((i) => ({ fine_id: i.dataset.fid, amount: i.value }));
    const btn = form.querySelector('[type=submit]');
    const send = async (confirmDup) => {
      try {
        const r = await post('/api/payments', { ...body, confirm_duplicate: confirmDup });
        toast(`${r.payment_no} registrerad. Fördelat ${kr(r.allocated)}${r.credit ? `, tillgodo ${kr(r.credit)}` : ''}.`);
        close(); refresh();
      } catch (err) {
        if (err.code === 'possible_duplicate') {
          const ok = await confirmDialog({ title: 'Möjlig dubblett', text: esc(err.message), confirm: 'Ja, registrera ändå', danger: false });
          if (ok) await send(true);
        } else fail(err);
      }
    };
    await busy(btn, () => send(false));
  };
}

// ---------- Spelare ----------
export function playerForm(p) {
  const { el, close } = modal({
    title: p ? `Redigera ${p.name}` : 'Ny spelare',
    body: `<form novalidate><div class="grid2">
      <label class="field"><span>Förnamn</span><input name="first_name" required maxlength="60" value="${esc(p?.first_name)}" autofocus></label>
      <label class="field"><span>Efternamn</span><input name="last_name" required maxlength="60" value="${esc(p?.last_name)}"></label>
      <label class="field"><span>Tröjnummer</span><input name="jersey" inputmode="numeric" maxlength="3" value="${esc(p?.jersey)}"></label>
      <label class="field"><span>Position</span><input name="position" maxlength="40" list="positions" value="${esc(p?.position)}"></label></div>
      <datalist id="positions"><option>Målvakt</option><option>Libero</option><option>Back</option><option>Halvback</option><option>Mittfält</option><option>Ytter</option><option>Anfallare</option><option>Tränare</option><option>Ledare</option></datalist>
      <label class="field"><span>Anteckningar</span><textarea name="notes" rows="3" maxlength="2000">${esc(p?.notes)}</textarea></label>
      <div class="actions"><button type="button" class="btn ghost" data-c>Avbryt</button>${p ? '' : '<button type="button" class="btn ghost" data-again>Spara & lägg till fler</button>'}<button class="btn primary">Spara</button></div></form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-c]').onclick = close;
  const save = async (again, btn) => busy(btn, async () => {
    try {
      const d = formData(form);
      if (p) await put(`/api/players/${encodeURIComponent(p.id)}`, d); else { const r = await post('/api/players', d); toast(`${d.first_name} ${d.last_name} tillagd (${r.id}).`); }
      if (p) toast('Spelaren sparad.');
      refresh();
      if (again) { form.reset(); form.first_name.focus(); } else close();
    } catch (e) { fail(e); }
  });
  form.onsubmit = (e) => { e.preventDefault(); save(false, form.querySelector('.btn.primary')); };
  el.querySelector('[data-again]')?.addEventListener('click', (e) => save(true, e.currentTarget));
}

export function importForm() {
  const { el, close } = modal({
    title: 'Importera spelare från CSV', wide: true,
    body: `<p class="lead">Kolumner i ordningen <code>förnamn;efternamn;tröjnummer;position;anteckningar</code>. Rubrikrad är valfri. Semikolon eller komma fungerar. Spelare som redan finns (samma namn) hoppas över.</p>
      <label class="field"><span>Välj fil</span><input type="file" accept=".csv,text/csv,text/plain"></label>
      <label class="field"><span>…eller klistra in</span><textarea rows="7" placeholder="förnamn;efternamn;tröjnummer;position&#10;Erik;Andersson;7;Halvback"></textarea></label>
      <div data-result></div>
      <div class="actions"><button class="btn ghost" data-c>Stäng</button><button class="btn primary" data-go>Importera</button></div>`,
  });
  const ta = el.querySelector('textarea');
  el.querySelector('[type=file]').onchange = async (e) => { const f = e.target.files[0]; if (f) ta.value = await f.text(); };
  el.querySelector('[data-c]').onclick = close;
  el.querySelector('[data-go]').onclick = (e) => busy(e.currentTarget, async () => {
    try {
      const r = await post('/api/players/import', { csv: ta.value });
      el.querySelector('[data-result]').innerHTML = `<div class="notice ok"><b>${r.created.length} spelare importerade.</b>${r.skipped.length ? `<br>Överhoppade: ${r.skipped.map(esc).join('; ')}` : ''}${r.errors.length ? `<br><span class="neg">Fel: ${r.errors.map(esc).join('; ')}</span>` : ''}</div>`;
      if (r.created.length) { toast(`${r.created.length} spelare importerade.`); refresh(); }
    } catch (err) { fail(err); }
  });
}

// ---------- Botdetalj ----------
export async function fineDetail(id) {
  const d = await get(`/api/fines/${id}`);
  const f = d.fine;
  const admin = isAdmin();
  const { el, close } = modal({
    title: `Bot ${f.fine_no}`, wide: true,
    body: `<div class="detail-head"><div><div class="big-no">${esc(f.fine_no)} ${demoTag(f.is_demo)}</div><a href="#/spelare/${esc(f.player_id)}" data-c>${esc(f.player_name)}</a></div>
      <div class="r"><div class="big-amt">${kr(f.amount)}</div>${statusPill(f.status)}</div></div>
      <dl class="dl">
        <dt>Kategori</dt><dd>${f.category_number}. ${esc(f.category_name)}${f.quantity > 1 ? ` (${f.quantity} st)` : ''}</dd>
        <dt>Utfärdad</dt><dd>${fmtDate(f.issued_date)}</dd>
        <dt>Sista betalningsdag</dt><dd class="${f.overdue ? 'neg' : ''}">${fmtDate(f.due_date)}${f.overdue ? ' – försenad' : ''}</dd>
        <dt>Betalt / kvar</dt><dd>${kr(f.paid)} / ${kr(f.remaining)}</dd>
        <dt>Betaldatum</dt><dd>${fmtDate(f.paid_date)}</dd>
        <dt>Beskrivning</dt><dd>${esc(f.description) || '–'}</dd>
        ${f.calc ? `<dt>Beräkning</dt><dd>${esc(f.calc)}</dd>` : ''}
        ${d.ref ? `<dt>Planterad bot avser</dt><dd>${esc(d.ref.fine_no)} (${esc(d.ref.player_name)})</dd>` : ''}
        ${d.planted_by.length ? `<dt>Planterad av</dt><dd>${d.planted_by.map((x) => `${esc(x.fine_no)} ${esc(x.player_name)}${x.voided ? ' (makulerad)' : ''}`).join(', ')}</dd>` : ''}
        <dt>Registrerad av</dt><dd>${esc(f.registered_by)} · ${fmtTs(f.created_at)}</dd>
        ${f.voided ? `<dt>Makulerad</dt><dd class="neg">${fmtTs(f.voided_at)} av ${esc(f.voided_by)}: ${esc(f.void_reason)}</dd>` : ''}
      </dl>
      <h3>Betalningar mot boten</h3>
      ${d.allocations.length ? `<table class="tbl compact"><thead><tr><th>Betalning</th><th>Datum</th><th>Metod</th><th class="r">Belopp</th><th>Status</th></tr></thead><tbody>${d.allocations.map((a) => `<tr class="${a.active ? '' : 'struck'}"><td>${esc(a.payment_no)}</td><td>${fmtDate(a.payment_date)}</td><td>${esc(a.method)}</td><td class="r">${kr(a.amount)}</td><td>${a.active ? 'Aktiv' : `<small>${esc(a.release_reason)}</small>`}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Inga betalningar ännu.</p>'}
      ${admin && d.history.length ? `<h3>Ändringshistorik</h3><ul class="history">${d.history.map((h) => `<li><b>${esc(h.action)}</b> · ${fmtTs(h.ts)} · ${esc(h.username)}${h.reason ? `<br><small>Orsak: ${esc(h.reason)}</small>` : ''}${h.old_value ? `<br><small>Före: ${esc(h.old_value)}</small>` : ''}${h.new_value ? `<br><small>Efter: ${esc(h.new_value)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${admin && !f.voided ? `<div class="actions"><button class="btn danger ghost" data-void>${icon('ban')} Makulera</button><button class="btn ghost" data-edit>${icon('edit')} Redigera</button>${f.remaining > 0 ? `<button class="btn primary" data-pay>${icon('coin')} Registrera betalning</button>` : ''}</div>` : ''}`,
  });
  el.querySelectorAll('[data-c]').forEach((a) => a.addEventListener('click', close));
  el.querySelector('[data-pay]')?.addEventListener('click', () => { close(); paymentForm({ playerId: f.player_id, fineId: f.id }); });
  el.querySelector('[data-void]')?.addEventListener('click', async () => {
    const reason = await confirmDialog({ title: `Makulera ${f.fine_no}?`, text: `Boten finns kvar i historiken men räknas inte längre i skuld eller statistik.${f.paid ? ` Redan betalda ${kr(f.paid)} blir tillgodohavande för spelaren.` : ''} Bötesnumret återanvänds aldrig.`, confirm: 'Makulera', reason: true });
    if (!reason) return;
    try { await post(`/api/fines/${f.id}/void`, { reason }); toast(`${f.fine_no} makulerad.`); close(); refresh(); } catch (e) { fail(e); }
  });
  el.querySelector('[data-edit]')?.addEventListener('click', () => { close(); editFine(f); });
}

function editFine(f) {
  const { el, close } = modal({
    title: `Redigera ${f.fine_no}`,
    body: `<form novalidate><div class="grid2">
      <label class="field"><span>Datum</span><input type="date" name="issued_date" value="${f.issued_date}" required></label>
      <label class="field"><span>Sista betalningsdag</span><input type="date" name="due_date" value="${f.due_date}" required></label>
      <label class="field"><span>Belopp (kr)</span><input name="amount" inputmode="decimal" value="${krPlain(f.amount)}" ${f.kind === 'planted' ? 'disabled' : ''}></label>
      <label class="field"><span>Beskrivning</span><input name="description" value="${esc(f.description)}" maxlength="500"></label></div>
      <label class="field"><span>Anledning till ändringen (obligatorisk)</span><input name="reason" required maxlength="300" autofocus></label>
      <p class="muted small">Spelare och kategori kan inte ändras. Är de fel: makulera boten och registrera en ny.</p>
      <div class="actions"><button type="button" class="btn ghost" data-c>Avbryt</button><button class="btn primary">Spara ändring</button></div></form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-c]').onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault();
    await busy(form.querySelector('.primary'), async () => {
      try { await put(`/api/fines/${f.id}`, formData(form)); toast('Ändringen sparad och loggad.'); close(); refresh(); } catch (err) { fail(err); }
    });
  };
}

// ---------- Betalningsdetalj ----------
export async function paymentDetail(id) {
  const d = await get(`/api/payments/${id}`);
  const p = d.payment;
  const admin = isAdmin();
  const { el, close } = modal({
    title: `Inbetalning ${p.payment_no}`, wide: true,
    body: `<div class="detail-head"><div><div class="big-no">${esc(p.payment_no)} ${demoTag(p.is_demo)}</div><a href="#/spelare/${esc(p.player_id)}" data-c>${esc(p.player_name)}</a></div>
      <div class="r"><div class="big-amt pos">${kr(p.amount)}</div>${p.reversed ? '<span class="pill grey">Återförd</span>' : '<span class="pill green">Aktiv</span>'}</div></div>
      <dl class="dl"><dt>Datum</dt><dd>${fmtDate(p.date)}</dd><dt>Metod</dt><dd>${esc(p.method)}</dd><dt>Referens</dt><dd>${esc(p.reference) || '–'}</dd>
      <dt>Kommentar</dt><dd>${esc(p.comment) || '–'}</dd><dt>Fördelat</dt><dd>${kr(p.allocated)}</dd><dt>Ofördelat</dt><dd>${kr(p.unallocated)}</dd>
      <dt>Registrerad av</dt><dd>${esc(p.registered_by)} · ${fmtTs(p.created_at)}</dd>
      ${p.reversed ? `<dt>Återförd</dt><dd class="neg">${fmtTs(p.reversed_at)} av ${esc(p.reversed_by)}: ${esc(p.reverse_reason)}</dd>` : ''}</dl>
      <h3>Fördelning</h3>
      ${d.allocations.length ? `<table class="tbl compact"><thead><tr><th>Bot</th><th>Kategori</th><th class="r">Belopp</th><th>Status</th></tr></thead><tbody>${d.allocations.map((a) => `<tr class="${a.active ? '' : 'struck'}"><td>${esc(a.fine_no)}</td><td>${esc(a.category_name)}</td><td class="r">${kr(a.amount)}</td><td>${a.active ? 'Aktiv' : `<small>${esc(a.release_reason)}</small>`}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Inte fördelad mot någon bot.</p>'}
      ${admin && !p.reversed ? `<div class="actions"><button class="btn danger ghost" data-rev>${icon('undo')} Återför</button><button class="btn primary" data-fix>${icon('edit')} Korrigera</button></div>
      <p class="muted small">Betalningar raderas aldrig. Korrigera = återför denna och registrera en ny med rätt uppgifter.</p>` : ''}`,
  });
  el.querySelectorAll('[data-c]').forEach((a) => a.addEventListener('click', close));
  const reverse = async (title) => {
    const reason = await confirmDialog({ title, text: `${p.payment_no} (${kr(p.amount)}) markeras som återförd och tas bort från kassan och spelarens betalningar. Böter den var fördelad mot blir obetalda igen. Händelsen finns kvar i historiken.`, confirm: 'Återför', reason: true });
    if (!reason) return false;
    try { await post(`/api/payments/${p.id}/reverse`, { reason }); toast(`${p.payment_no} återförd.`); return true; } catch (e) { fail(e); return false; }
  };
  el.querySelector('[data-rev]')?.addEventListener('click', async () => { if (await reverse(`Återför ${p.payment_no}?`)) { close(); refresh(); } });
  el.querySelector('[data-fix]')?.addEventListener('click', async () => {
    if (!(await reverse(`Korrigera ${p.payment_no}`))) return;
    close(); refresh();
    paymentForm({ prefill: { player_id: p.player_id, date: p.date, amount: krPlain(p.amount), method: p.method, reference: p.reference, comment: `Korrigering av ${p.payment_no}`, correcting: p.payment_no } });
  });
}

// ---------- Kassahändelse ----------
export async function cashForm(type, playerId) {
  const players = type === 'refund' ? (await get('/api/players')).filter((p) => p.credit > 0) : [];
  if (type === 'refund' && !players.length) return toast('Ingen spelare har tillgodohavande att återbetala.', 'err');
  const title = { income: 'Övrig inkomst', expense: 'Registrera utgift', refund: 'Återbetala tillgodohavande' }[type];
  const t = today();
  const { el, close } = modal({
    title,
    body: `<form novalidate>
      ${type === 'refund' ? `<label class="field"><span>Spelare</span><select name="player_id" required>${players.map((p) => `<option value="${esc(p.id)}" data-credit="${p.credit}" ${p.id === playerId ? 'selected' : ''}>${esc(p.name)} – tillgodo ${kr(p.credit)}</option>`).join('')}</select></label>` : ''}
      <div class="grid2"><label class="field"><span>Datum</span><input type="date" name="date" value="${t}" max="${t}" required></label>
      <label class="field"><span>Belopp (kr)</span><input name="amount" inputmode="decimal" required autofocus value="${type === 'refund' ? krPlain((players.find((p) => p.id === playerId) || players[0]).credit) : ''}"></label></div>
      <label class="field"><span>Beskrivning${type === 'refund' ? ' (valfri)' : ''}</span><input name="description" maxlength="300" ${type === 'refund' ? '' : 'required'} placeholder="${type === 'expense' ? 't.ex. Fika till laget' : type === 'income' ? 't.ex. Pantpengar' : ''}"></label>
      <div class="actions"><button type="button" class="btn ghost" data-c>Avbryt</button><button class="btn primary">Spara</button></div></form>`,
  });
  const form = el.querySelector('form');
  el.querySelector('[data-c]').onclick = close;
  if (type === 'refund') form.player_id.onchange = () => { form.amount.value = krPlain(Number(form.player_id.selectedOptions[0].dataset.credit)); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    await busy(form.querySelector('.primary'), async () => {
      try { const r = await post('/api/cash', { ...formData(form), type }); toast(`${r.event_no} registrerad.`); close(); refresh(); } catch (err) { fail(err); }
    });
  };
}
