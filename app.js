/* Camper Compagnon — alle logica, geen frameworks, data in localStorage. */
'use strict';

/* ============================== opslag ============================== */
const STORAGE_KEY = 'camper:v1';

const CATEGORIES = [
  'Keuken', 'Slapen', 'Kleding', 'Techniek & stroom', 'Sanitair',
  'Gereedschap', 'Buiten & luifel', 'Veiligheid', 'Eten & voorraad', 'Overig',
];

const POI_CATS = ['supermarkt', 'tankstation', 'lpg', 'camperservice', 'camperplaats', 'overig'];

function defaultState() {
  return {
    inventory: [],
    wishlist: [],
    trips: [],
    checklists: {
      vertrek: [
        'Gas dicht', 'Luifel ingerold', 'Stabilisatiesteunen omhoog',
        'TV-antenne ingeklapt', 'Ramen & dakluiken dicht', 'Losse spullen vastgezet',
        'Stekker losgekoppeld', 'Trede ingeklapt', 'Fietsendrager vergrendeld',
      ].map((label) => ({ id: uid(), label, done: false })),
      aankomst: [
        'Waterpas zetten', 'Stekker aansluiten', 'Gas open',
        'Koelkast op netstroom', 'Luifel uit', 'Vers water bijvullen',
      ].map((label) => ({ id: uid(), label, done: false })),
    },
    settings: { laadvermogen: 600, mtm: 0, leeg: 0, apiKey: '', lastExport: null },
  };
}

let state;
let corruptNotice = false;

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode e.d. */ }
  if (!raw) { state = defaultState(); return; }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('geen object');
    const d = defaultState();
    state = {
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : d.inventory,
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : d.wishlist,
      trips: Array.isArray(parsed.trips) ? parsed.trips : d.trips,
      checklists: {
        vertrek: Array.isArray(parsed.checklists && parsed.checklists.vertrek) ? parsed.checklists.vertrek : d.checklists.vertrek,
        aankomst: Array.isArray(parsed.checklists && parsed.checklists.aankomst) ? parsed.checklists.aankomst : d.checklists.aankomst,
      },
      settings: Object.assign({}, d.settings, parsed.settings || {}),
    };
  } catch (e) {
    try { localStorage.setItem(STORAGE_KEY + ':broken-' + Date.now(), raw); } catch (e2) { /* vol */ }
    state = defaultState();
    corruptNotice = true;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Opslaan mislukt — opslag vol of geblokkeerd.');
  }
}

/* ============================== helpers ============================== */
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso) {
  if (!iso) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.round((d - now) / 86400000);
}

function fmtKg(kg) {
  return (Math.round(kg * 100) / 100).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
}

function toast(msg, ms) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 300);
  }, ms || 2600);
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV_SVG = '<svg class="chev" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ============================== UI-status (niet persistent) ============================== */
const ui = {
  tab: 'voorraad',
  collapsedCats: new Set(),
  tripView: null,        // { id, subtab: 'paklijst' | 'advies' }
  poiFilter: 'alle',
  adviesBusy: false,
  adviesError: null,
};

/* ============================== bottom sheet ============================== */
const sheetEl = document.getElementById('sheet');
const backdropEl = document.getElementById('sheet-backdrop');

function openSheet(html) {
  sheetEl.innerHTML = '<div class="sheet-grip"></div>' + html;
  sheetEl.hidden = false;
  backdropEl.hidden = false;
  requestAnimationFrame(() => {
    sheetEl.classList.add('show');
    backdropEl.classList.add('show');
  });
}

function closeSheet() {
  sheetEl.classList.remove('show');
  backdropEl.classList.remove('show');
  setTimeout(() => {
    sheetEl.hidden = true;
    backdropEl.hidden = true;
    sheetEl.innerHTML = '';
  }, 280);
}

backdropEl.addEventListener('click', closeSheet);

// iOS-toetsenbord: gefocust veld in beeld scrollen zodat het toetsenbord het niet bedekt.
document.addEventListener('focusin', (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  if (!e.target.matches('input, select, textarea')) return;
  setTimeout(() => {
    try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) { /* oké */ }
  }, 250);
});

/* ============================== voorraad ============================== */
function invTotalWeight() {
  return state.inventory.reduce((sum, it) => sum + (Number(it.weight) || 0) * (Number(it.qty) || 0), 0);
}

function expiringItems() {
  return state.inventory.filter((it) => {
    if (!it.expiry) return false;
    const d = daysUntil(it.expiry);
    return d !== null && d < 30;
  });
}

function renderWeightBar() {
  const total = invTotalWeight();
  const max = Number(state.settings.laadvermogen) || 0;
  const pct = max > 0 ? (total / max) * 100 : 0;
  let cls = 'ok';
  if (pct >= 100) cls = 'over';
  else if (pct >= 80) cls = 'warn';
  const over = total - max;
  return (
    '<div class="weightbar-wrap">' +
      '<div class="weightbar-label"><span>Laadgewicht</span><span>' +
        fmtKg(total) + ' / ' + fmtKg(max) + ' kg' +
        (cls === 'over' ? ' <span class="weight-over">+' + fmtKg(over) + ' kg te veel</span>' : '') +
      '</span></div>' +
      '<div class="weightbar"><div class="' + cls + '" style="width:' + Math.min(100, pct).toFixed(1) + '%"></div></div>' +
    '</div>'
  );
}

function renderVoorraad() {
  let html = renderWeightBar();

  const expiring = expiringItems();
  if (expiring.length) {
    html += '<div class="alert warn"><h3>Let op — houdbaarheid</h3><ul>' +
      expiring.map((it) => {
        const d = daysUntil(it.expiry);
        const t = d < 0 ? 'verlopen op ' + fmtDate(it.expiry) : (d === 0 ? 'verloopt vandaag' : 'verloopt over ' + d + ' dagen');
        return '<li><strong>' + esc(it.name) + '</strong> — ' + t + '</li>';
      }).join('') + '</ul></div>';
  }

  if (!state.inventory.length) {
    html += '<div class="empty"><span class="big">🧭</span>Nog geen voorraad.<br>Voeg je eerste item toe met de +‑knop.</div>';
  } else {
    for (const cat of CATEGORIES) {
      const items = state.inventory.filter((it) => it.category === cat);
      if (!items.length) continue;
      const sub = items.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 0), 0);
      const open = !ui.collapsedCats.has(cat);
      html += '<div class="cat-block' + (open ? ' open' : '') + '">' +
        '<button class="cat-head" data-cat="' + esc(cat) + '">' + CHEV_SVG +
          '<span class="cat-name">' + esc(cat) + '</span>' +
          '<span class="cat-meta">' + items.length + ' · ' + fmtKg(sub) + ' kg</span>' +
        '</button>';
      if (open) {
        html += '<div class="cat-items">' + items.map(renderInvItem).join('') + '</div>';
      }
      html += '</div>';
    }
  }
  html += '<button class="fab" id="fab-add" aria-label="Item toevoegen">+</button>';
  return html;
}

function renderInvItem(it) {
  const d = it.expiry ? daysUntil(it.expiry) : null;
  let expHtml = '';
  if (it.expiry) {
    const cls = d < 0 ? 'exp-over' : (d < 30 ? 'exp-warn' : '');
    expHtml = ' · <span class="' + cls + '">t.h.t. ' + fmtDate(it.expiry) + '</span>';
  }
  let statusHtml = '';
  if (it.type === 'verbruik') {
    statusHtml = '<div class="status-seg" data-id="' + it.id + '">' +
      '<button data-status="vol" class="' + (it.status === 'vol' ? 'sel-vol' : '') + '">Vol</button>' +
      '<button data-status="bijna" class="' + (it.status === 'bijna' ? 'sel-bijna' : '') + '">Laag</button>' +
      '<button data-status="op" class="' + (it.status === 'op' ? 'sel-op' : '') + '">Op</button>' +
    '</div>';
  }
  return '<div class="inv-item">' +
    '<div class="inv-main" data-edit="' + it.id + '">' +
      '<div class="inv-name">' + esc(it.name) + '</div>' +
      '<div class="inv-sub">' + (Number(it.qty) || 0) + ' × ' + fmtKg(Number(it.weight) || 0) + ' kg = ' +
        fmtKg((Number(it.weight) || 0) * (Number(it.qty) || 0)) + ' kg' + expHtml + '</div>' +
    '</div>' + statusHtml +
  '</div>';
}

function bindVoorraad(main) {
  main.querySelectorAll('.cat-head').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      if (ui.collapsedCats.has(cat)) ui.collapsedCats.delete(cat);
      else ui.collapsedCats.add(cat);
      render();
    });
  });
  main.querySelectorAll('.inv-main[data-edit]').forEach((el) => {
    el.addEventListener('click', () => openItemSheet(el.dataset.edit));
  });
  main.querySelectorAll('.status-seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.status-seg').dataset.id;
      const it = state.inventory.find((x) => x.id === id);
      if (it) { it.status = btn.dataset.status; save(); render(); }
    });
  });
  const fab = main.querySelector('#fab-add');
  if (fab) fab.addEventListener('click', () => openItemSheet(null));
}

function openItemSheet(id) {
  const it = id ? state.inventory.find((x) => x.id === id) : null;
  const v = it || { name: '', category: 'Keuken', qty: 1, weight: 0, type: 'uitrusting', status: 'vol', expiry: null };
  openSheet(
    '<h2>' + (it ? 'Item bewerken' : 'Item toevoegen') + '</h2>' +
    '<form id="item-form">' +
      '<label class="field"><span>Naam</span><input name="name" required value="' + esc(v.name) + '" autocomplete="off"></label>' +
      '<label class="field"><span>Categorie</span><select name="category">' +
        CATEGORIES.map((c) => '<option' + (c === v.category ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
      '</select></label>' +
      '<div class="field-row">' +
        '<label class="field"><span>Aantal</span><input name="qty" type="number" min="0" step="1" inputmode="numeric" value="' + esc(v.qty) + '"></label>' +
        '<label class="field"><span>Gewicht/stuk (kg)</span><input name="weight" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(v.weight) + '"></label>' +
      '</div>' +
      '<label class="field"><span>Soort</span><select name="type">' +
        '<option value="uitrusting"' + (v.type === 'uitrusting' ? ' selected' : '') + '>Uitrusting</option>' +
        '<option value="verbruik"' + (v.type === 'verbruik' ? ' selected' : '') + '>Verbruik</option>' +
      '</select></label>' +
      '<label class="field"><span>Houdbaar tot (optioneel)</span><input name="expiry" type="date" value="' + esc(v.expiry || '') + '"></label>' +
      '<div class="sheet-actions">' +
        (it ? '<button type="button" class="btn danger" id="item-delete">Verwijderen</button>' : '') +
        '<button type="button" class="btn secondary" id="item-cancel">Annuleren</button>' +
        '<button type="submit" class="btn">Opslaan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('item-cancel').addEventListener('click', closeSheet);
  if (it) {
    document.getElementById('item-delete').addEventListener('click', () => {
      state.inventory = state.inventory.filter((x) => x.id !== it.id);
      for (const trip of state.trips) { if (trip.packed) delete trip.packed[it.id]; }
      save(); closeSheet(); render();
      toast('Item verwijderd');
    });
  }
  document.getElementById('item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name') || '').trim();
    if (!name) return;
    const data = {
      name,
      category: String(f.get('category')),
      qty: Math.max(0, parseInt(f.get('qty'), 10) || 0),
      weight: Math.max(0, parseFloat(f.get('weight')) || 0),
      type: String(f.get('type')) === 'verbruik' ? 'verbruik' : 'uitrusting',
      expiry: String(f.get('expiry') || '') || null,
    };
    if (it) {
      Object.assign(it, data);
      if (it.type !== 'verbruik') it.status = 'vol';
    } else {
      state.inventory.push(Object.assign({ id: uid(), status: 'vol' }, data));
    }
    save(); closeSheet(); render();
  });
}

/* ============================== wensen ============================== */
function renderWensen() {
  let html = '<form class="wish-form" id="wish-form">' +
    '<input name="wish" placeholder="Wat wil je nog aanschaffen?" autocomplete="off" required>' +
    '<button class="btn" type="submit">+</button></form>';
  if (!state.wishlist.length) {
    html += '<div class="empty"><span class="big">✨</span>Nog geen wensen — alles aan boord!</div>';
  } else {
    html += state.wishlist.map((w) =>
      '<div class="wish-item"><span class="name">' + esc(w.name) + '</span>' +
      '<button class="btn small secondary" data-board="' + w.id + '">Aan boord</button>' +
      '<button class="icon-btn" data-del="' + w.id + '" aria-label="Verwijderen">✕</button></div>'
    ).join('');
  }
  return html;
}

function bindWensen(main) {
  main.querySelector('#wish-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.elements.wish;
    const name = input.value.trim();
    if (!name) return;
    state.wishlist.push({ id: uid(), name });
    save(); render();
  });
  main.querySelectorAll('[data-board]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const w = state.wishlist.find((x) => x.id === btn.dataset.board);
      if (!w) return;
      state.inventory.push({
        id: uid(), name: w.name, category: 'Overig', qty: 1, weight: 0,
        type: 'uitrusting', status: 'vol', expiry: null,
      });
      state.wishlist = state.wishlist.filter((x) => x.id !== w.id);
      save(); render();
      toast('“' + w.name + '” staat nu in Voorraad → Overig');
    });
  });
  main.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.wishlist = state.wishlist.filter((x) => x.id !== btn.dataset.del);
      save(); render();
    });
  });
}

/* ============================== reizen ============================== */
function sortedTrips() {
  return state.trips.slice().sort((a, b) => String(a.startDate || '9999').localeCompare(String(b.startDate || '9999')));
}

function renderReizen() {
  if (ui.tripView) return renderTripDetail();
  let html = '';
  const trips = sortedTrips();
  if (!trips.length) {
    html += '<div class="empty"><span class="big">🗺️</span>Nog geen reizen gepland.<br>Voeg er een toe met de +‑knop.</div>';
  } else {
    html += trips.map((t) => {
      const d = daysUntil(t.startDate);
      let cd = '';
      if (d !== null && d >= 0 && d <= 90) cd = '<span class="countdown">' + (d === 0 ? 'vandaag!' : 'over ' + d + 'd') + '</span>';
      return '<div class="trip-card" data-trip="' + t.id + '">' +
        '<div class="place">' + esc(t.place) + '</div>' +
        '<div class="country">' + esc(t.country) + '</div>' +
        '<div class="dates">' + fmtDate(t.startDate) + ' → ' + fmtDate(t.endDate) + '</div>' +
        (t.notes ? '<div class="trip-notes">' + esc(t.notes) + '</div>' : '') +
        cd +
      '</div>';
    }).join('');
  }
  html += '<button class="fab" id="fab-trip" aria-label="Reis toevoegen">+</button>';
  return html;
}

function bindReizen(main) {
  if (ui.tripView) { bindTripDetail(main); return; }
  main.querySelectorAll('.trip-card').forEach((card) => {
    card.addEventListener('click', () => {
      ui.tripView = { id: card.dataset.trip, subtab: 'paklijst' };
      ui.poiFilter = 'alle';
      ui.adviesError = null;
      render();
    });
  });
  const fab = main.querySelector('#fab-trip');
  if (fab) fab.addEventListener('click', () => openTripSheet(null));
}

function openTripSheet(id) {
  const t = id ? state.trips.find((x) => x.id === id) : null;
  const v = t || { place: '', country: '', startDate: '', endDate: '', notes: '' };
  openSheet(
    '<h2>' + (t ? 'Reis bewerken' : 'Reis toevoegen') + '</h2>' +
    '<form id="trip-form">' +
      '<label class="field"><span>Plaats</span><input name="place" required value="' + esc(v.place) + '" autocomplete="off"></label>' +
      '<label class="field"><span>Land</span><input name="country" required value="' + esc(v.country) + '" autocomplete="off"></label>' +
      '<div class="field-row">' +
        '<label class="field"><span>Van</span><input name="startDate" type="date" required value="' + esc(v.startDate) + '"></label>' +
        '<label class="field"><span>Tot</span><input name="endDate" type="date" required value="' + esc(v.endDate) + '"></label>' +
      '</div>' +
      '<label class="field"><span>Notitie (optioneel)</span><textarea name="notes" rows="2">' + esc(v.notes) + '</textarea></label>' +
      '<div class="sheet-actions">' +
        (t ? '<button type="button" class="btn danger" id="trip-delete">Verwijderen</button>' : '') +
        '<button type="button" class="btn secondary" id="trip-cancel">Annuleren</button>' +
        '<button type="submit" class="btn">Opslaan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('trip-cancel').addEventListener('click', closeSheet);
  if (t) {
    document.getElementById('trip-delete').addEventListener('click', () => {
      state.trips = state.trips.filter((x) => x.id !== t.id);
      ui.tripView = null;
      save(); closeSheet(); render();
      toast('Reis verwijderd');
    });
  }
  document.getElementById('trip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      place: String(f.get('place') || '').trim(),
      country: String(f.get('country') || '').trim(),
      startDate: String(f.get('startDate') || ''),
      endDate: String(f.get('endDate') || ''),
      notes: String(f.get('notes') || '').trim(),
    };
    if (!data.place) return;
    if (t) Object.assign(t, data);
    else state.trips.push(Object.assign({ id: uid(), packed: {}, advies: null, poi: null, adviesDate: null }, data));
    save(); closeSheet(); render();
  });
}

function renderTripDetail() {
  const t = state.trips.find((x) => x.id === ui.tripView.id);
  if (!t) { ui.tripView = null; return renderReizen(); }
  const sub = ui.tripView.subtab;
  let html = '<button class="back-link" id="trip-back">← Alle reizen</button>' +
    '<div class="trip-card" style="cursor:default">' +
      '<div class="place">' + esc(t.place) + ' <button class="icon-btn" id="trip-edit" aria-label="Reis bewerken" style="font-size:0.85rem">✎</button></div>' +
      '<div class="country">' + esc(t.country) + '</div>' +
      '<div class="dates">' + fmtDate(t.startDate) + ' → ' + fmtDate(t.endDate) + '</div>' +
      (t.notes ? '<div class="trip-notes">' + esc(t.notes) + '</div>' : '') +
    '</div>' +
    '<div class="subtabs">' +
      '<button data-sub="paklijst" class="' + (sub === 'paklijst' ? 'active' : '') + '">Paklijst</button>' +
      '<button data-sub="advies" class="' + (sub === 'advies' ? 'active' : '') + '">Advies &amp; POI</button>' +
    '</div>';
  html += sub === 'paklijst' ? renderPaklijst(t) : renderAdvies(t);
  return html;
}

function renderPaklijst(t) {
  if (!t.packed) t.packed = {};
  let html = '';
  const refill = state.inventory.filter((it) => it.type === 'verbruik' && (it.status === 'bijna' || it.status === 'op'));
  if (refill.length) {
    html += '<div class="alert info"><h3>Bijvullen voor vertrek</h3><ul>' +
      refill.map((it) => '<li><strong>' + esc(it.name) + '</strong> — ' + (it.status === 'op' ? 'op' : 'bijna op') + '</li>').join('') +
      '</ul></div>';
  }
  if (!state.inventory.length) {
    html += '<div class="empty">Geen voorraaditems om in te pakken.</div>';
    return html;
  }
  const packedCount = state.inventory.filter((it) => t.packed[it.id]).length;
  html += '<div class="list-head"><span class="section-label">Inpakken</span>' +
    '<span class="pack-counter">' + packedCount + '/' + state.inventory.length + '</span></div>';
  for (const cat of CATEGORIES) {
    const items = state.inventory.filter((it) => it.category === cat);
    if (!items.length) continue;
    html += '<div class="section-label">' + esc(cat) + '</div><div class="card" style="padding:0">' +
      items.map((it) => {
        const done = !!t.packed[it.id];
        return '<div class="pack-item' + (done ? ' done' : '') + '" data-pack="' + it.id + '">' +
          '<span class="checkbox">' + CHECK_SVG + '</span>' +
          '<span class="name">' + esc(it.name) + '</span>' +
          '<span class="muted mono">' + (Number(it.qty) || 0) + '×</span>' +
        '</div>';
      }).join('') + '</div>';
  }
  return html;
}

function renderAdvies(t) {
  if (!state.settings.apiKey) {
    return '<div class="card"><strong>Advies &amp; POI</strong>' +
      '<p class="muted">Vul eerst een Anthropic API-key in bij Instellingen (⚙). ' +
      'Daarna kan de app per reis actueel advies en handige adressen ophalen.</p></div>';
  }
  let html = '';
  if (ui.adviesError) {
    html += '<div class="alert danger"><h3>Ophalen mislukt</h3><p>' + esc(ui.adviesError) + '</p></div>';
  }
  if (ui.adviesBusy) {
    html += '<button class="btn block" disabled><span class="spinner"></span>Bezig met ophalen…</button>';
  } else {
    html += '<button class="btn block" id="fetch-advies">' +
      (t.advies ? 'Opnieuw ophalen' : 'Advies &amp; POI ophalen') + '</button>';
  }
  if (t.advies) {
    const a = t.advies;
    html += '<p class="muted mono" style="margin:10px 2px">Opgehaald op ' + fmtDate(t.adviesDate) + '</p>' +
      '<div class="card advies-blok">' +
        (a.seizoen ? '<h4>Seizoen</h4><p>' + esc(a.seizoen) + '</p>' : '') +
        (Array.isArray(a.meenemen) && a.meenemen.length ? '<h4>Meenemen</h4><ul>' + a.meenemen.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
        (Array.isArray(a.thuislaten) && a.thuislaten.length ? '<h4>Thuislaten</h4><ul>' + a.thuislaten.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
        (Array.isArray(a.regels) && a.regels.length ? '<h4>Regels &amp; aandachtspunten</h4><ul>' + a.regels.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '</div>';
  }
  if (Array.isArray(t.poi) && t.poi.length) {
    const cats = ['alle'].concat(POI_CATS.filter((c) => t.poi.some((p) => p.categorie === c)));
    html += '<div class="section-label">In de buurt</div>' +
      '<div class="chips">' + cats.map((c) =>
        '<button class="chip' + (ui.poiFilter === c ? ' active' : '') + '" data-chip="' + c + '">' + esc(c) + '</button>'
      ).join('') + '</div>';
    const shown = t.poi.filter((p) => ui.poiFilter === 'alle' || p.categorie === ui.poiFilter);
    html += '<div class="card" style="padding:0">' +
      (shown.length ? shown.map((p) =>
        '<div class="poi-item"><span class="cat">' + esc(p.categorie || 'overig') + '</span>' +
        '<div class="name">' + esc(p.naam) + '</div>' +
        '<div class="detail">' + esc(p.adres || '') + (p.opmerking ? ' — ' + esc(p.opmerking) : '') + '</div></div>'
      ).join('') : '<div class="poi-item muted">Niets in deze categorie.</div>') +
    '</div>';
  }
  return html;
}

function bindTripDetail(main) {
  const t = state.trips.find((x) => x.id === ui.tripView.id);
  main.querySelector('#trip-back').addEventListener('click', () => { ui.tripView = null; render(); });
  const editBtn = main.querySelector('#trip-edit');
  if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openTripSheet(t.id); });
  main.querySelectorAll('.subtabs button').forEach((btn) => {
    btn.addEventListener('click', () => { ui.tripView.subtab = btn.dataset.sub; render(); });
  });
  main.querySelectorAll('[data-pack]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!t.packed) t.packed = {};
      t.packed[el.dataset.pack] = !t.packed[el.dataset.pack];
      save(); render();
    });
  });
  main.querySelectorAll('[data-chip]').forEach((btn) => {
    btn.addEventListener('click', () => { ui.poiFilter = btn.dataset.chip; render(); });
  });
  const fetchBtn = main.querySelector('#fetch-advies');
  if (fetchBtn) fetchBtn.addEventListener('click', () => fetchAdvies(t));
}

/* ---------- Anthropic API ---------- */
function adviesPrompt(t) {
  return 'Je bent reisassistent voor een Nederlands camperstel (Notin Progress Sevilla). ' +
    'Bestemming: ' + t.place + ', ' + t.country + '. ' +
    'Periode: ' + t.startDate + ' tot ' + t.endDate + ' (seizoen zelf afleiden). ' +
    'Zoek actuele lokale info via web search. ' +
    'Antwoord UITSLUITEND met geldige JSON, geen markdown: ' +
    '{"advies":{"seizoen":"1 zin over weer/klimaat daar in dit seizoen",' +
    '"meenemen":[4-7 concrete spullen specifiek voor deze regio en dit seizoen],' +
    '"thuislaten":[1-3 dingen die nu overbodig zijn],' +
    '"regels":[2-5 camperspecifieke aandachtspunten: milieuzones/Crit\'Air, vignet/tol, ' +
    'gasaansluiting per land, lozen grijs/zwart water, hoogtebeperkingen, overnachtingsregels]},' +
    '"poi":[6-12 echte plekken nabij de bestemming, elk {"naam":"","categorie":"supermarkt|tankstation|lpg|' +
    'camperservice|camperplaats|overig","adres":"kort","opmerking":"kort"}]}';
}

async function fetchAdvies(t) {
  ui.adviesBusy = true;
  ui.adviesError = null;
  render();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': state.settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: adviesPrompt(t) }],
      }),
    });
    if (!res.ok) {
      let detail = 'HTTP ' + res.status;
      try {
        const err = await res.json();
        if (err && err.error && err.error.message) detail = err.error.message;
      } catch (e) { /* geen JSON */ }
      throw new Error(res.status === 401 ? 'API-key ongeldig (controleer Instellingen).' : detail);
    }
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const parsed = parseAdviesJSON(text);
    t.advies = parsed.advies || null;
    t.poi = Array.isArray(parsed.poi) ? parsed.poi : [];
    t.adviesDate = todayISO();
    ui.poiFilter = 'alle';
    save();
  } catch (e) {
    ui.adviesError = (e && e.message) ? e.message : 'Onbekende fout. Controleer je internetverbinding.';
  } finally {
    ui.adviesBusy = false;
    render();
  }
}

function parseAdviesJSON(text) {
  let s = String(text || '').trim();
  s = s.replace(/```(?:json)?/gi, '');           // codefences strippen
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1 || b <= a) throw new Error('Geen bruikbaar antwoord ontvangen — probeer het opnieuw.');
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch (e) {
    throw new Error('Antwoord kon niet gelezen worden — probeer het opnieuw.');
  }
}

/* ============================== lijsten ============================== */
function renderLijsten() {
  return renderChecklist('vertrek', 'Vertrek') + renderChecklist('aankomst', 'Aankomst');
}

function renderChecklist(key, title) {
  const list = state.checklists[key];
  const done = list.filter((s) => s.done).length;
  let html = '<div class="list-head">' +
    '<span class="section-label">' + title + ' <span class="mono" style="text-transform:none;letter-spacing:0">' + done + '/' + list.length + '</span></span>' +
    '<button class="btn small secondary" data-reset="' + key + '">Reset</button></div>' +
    '<div class="card" style="padding:0">';
  html += list.map((s) =>
    '<div class="check-item' + (s.done ? ' done' : '') + '">' +
      '<span class="checkbox" data-toggle="' + key + ':' + s.id + '" role="checkbox" aria-checked="' + s.done + '" tabindex="0">' + CHECK_SVG + '</span>' +
      '<span class="label" data-toggle="' + key + ':' + s.id + '">' + esc(s.label) + '</span>' +
      '<button class="icon-btn" data-remove="' + key + ':' + s.id + '" aria-label="Stap verwijderen">✕</button>' +
    '</div>'
  ).join('');
  html += '<form class="add-step" data-add="' + key + '">' +
    '<input name="label" placeholder="Stap toevoegen…" autocomplete="off" required>' +
    '<button class="btn small" type="submit">+</button></form></div>';
  return html;
}

function bindLijsten(main) {
  main.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const [key, id] = el.dataset.toggle.split(':');
      const step = state.checklists[key].find((s) => s.id === id);
      if (step) { step.done = !step.done; save(); render(); }
    });
  });
  main.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [key, id] = btn.dataset.remove.split(':');
      state.checklists[key] = state.checklists[key].filter((s) => s.id !== id);
      save(); render();
    });
  });
  main.querySelectorAll('[data-reset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.checklists[btn.dataset.reset].forEach((s) => { s.done = false; });
      save(); render();
    });
  });
  main.querySelectorAll('form[data-add]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = form.elements.label.value.trim();
      if (!label) return;
      state.checklists[form.dataset.add].push({ id: uid(), label, done: false });
      save(); render();
    });
  });
}

/* ============================== instellingen ============================== */
function exportReminderHtml() {
  const last = state.settings.lastExport;
  if (!last) {
    return '<div class="alert info">Je hebt nog nooit een back-up geëxporteerd. ' +
      'Alle data staat alleen op dit toestel — een export is je enige reservekopie.</div>';
  }
  const days = Math.round((Date.now() - new Date(last).getTime()) / 86400000);
  if (days > 30) {
    return '<div class="alert info">Laatste export is ' + days + ' dagen geleden — tijd voor een verse back-up?</div>';
  }
  return '';
}

function renderInstellingen() {
  const s = state.settings;
  return exportReminderHtml() +
    '<div class="section-label">Laadvermogen</div>' +
    '<div class="card">' +
      '<label class="field"><span>Laadvermogen (kg)</span>' +
        '<input id="set-laadvermogen" type="number" min="0" step="1" inputmode="numeric" value="' + esc(s.laadvermogen) + '"></label>' +
      '<div class="field-row">' +
        '<label class="field"><span>MTM (kg)</span><input id="set-mtm" type="number" min="0" step="1" inputmode="numeric" value="' + esc(s.mtm || '') + '"></label>' +
        '<label class="field"><span>Leeggewicht (kg)</span><input id="set-leeg" type="number" min="0" step="1" inputmode="numeric" value="' + esc(s.leeg || '') + '"></label>' +
      '</div>' +
      '<button class="btn small secondary" id="set-diff">Verschil overnemen als laadvermogen</button>' +
    '</div>' +
    '<div class="section-label">AI-advies</div>' +
    '<div class="card">' +
      '<label class="field"><span>Anthropic API-key</span>' +
        '<input id="set-apikey" type="password" autocomplete="off" placeholder="sk-ant-…" value="' + esc(s.apiKey) + '"></label>' +
      '<p class="muted">De key wordt alleen op dit toestel bewaard (localStorage) en verlaat het toestel niet — ' +
      'behalve rechtstreeks richting Anthropic bij het ophalen van advies. ' +
      'Zodra dit veld gevuld is, verschijnt per reis de sectie “Advies &amp; POI”. ' +
      'Een key maak je aan op console.anthropic.com.</p>' +
    '</div>' +
    '<div class="section-label">Back-up</div>' +
    '<div class="card">' +
      '<p class="muted" style="margin-top:0">Laatste export: <span class="mono">' +
        (s.lastExport ? fmtDate(s.lastExport.slice(0, 10)) : 'nog nooit') + '</span></p>' +
      '<button class="btn block" id="btn-export">Exporteer alle data (JSON)</button>' +
      '<label class="field" style="margin-top:14px"><span>Importeren — plak hier een eerdere export</span>' +
        '<textarea id="import-area" rows="3" placeholder="{ … }"></textarea></label>' +
      '<button class="btn block secondary" id="btn-import">Importeer</button>' +
    '</div>' +
    '<p class="muted" style="text-align:center">Camper Compagnon · data blijft op dit toestel</p>';
}

function bindInstellingen(main) {
  const num = (el) => Math.max(0, parseFloat(el.value) || 0);
  main.querySelector('#set-laadvermogen').addEventListener('change', (e) => {
    state.settings.laadvermogen = num(e.target);
    save(); toast('Laadvermogen opgeslagen');
  });
  main.querySelector('#set-mtm').addEventListener('change', (e) => { state.settings.mtm = num(e.target); save(); });
  main.querySelector('#set-leeg').addEventListener('change', (e) => { state.settings.leeg = num(e.target); save(); });
  main.querySelector('#set-diff').addEventListener('click', () => {
    const diff = (Number(state.settings.mtm) || 0) - (Number(state.settings.leeg) || 0);
    if (diff <= 0) { toast('Vul eerst MTM en leeggewicht in (MTM moet groter zijn).'); return; }
    state.settings.laadvermogen = diff;
    save(); render();
    toast('Laadvermogen gezet op ' + fmtKg(diff) + ' kg');
  });
  main.querySelector('#set-apikey').addEventListener('change', (e) => {
    state.settings.apiKey = e.target.value.trim();
    save(); toast(state.settings.apiKey ? 'API-key opgeslagen (alleen op dit toestel)' : 'API-key verwijderd');
  });
  main.querySelector('#btn-export').addEventListener('click', () => {
    state.settings.lastExport = new Date().toISOString();
    save();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'camper-compagnon-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    render();
    toast('Export gedownload');
  });
  main.querySelector('#btn-import').addEventListener('click', () => {
    const raw = main.querySelector('#import-area').value.trim();
    if (!raw) { toast('Plak eerst een eerdere export in het veld.'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !('inventory' in parsed)) {
        throw new Error('Dit lijkt geen Camper Compagnon-export.');
      }
      const d = defaultState();
      state = {
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
        trips: Array.isArray(parsed.trips) ? parsed.trips : [],
        checklists: {
          vertrek: Array.isArray(parsed.checklists && parsed.checklists.vertrek) ? parsed.checklists.vertrek : d.checklists.vertrek,
          aankomst: Array.isArray(parsed.checklists && parsed.checklists.aankomst) ? parsed.checklists.aankomst : d.checklists.aankomst,
        },
        settings: Object.assign({}, d.settings, parsed.settings || {}),
      };
      save(); render();
      toast('Import gelukt — alle data vervangen');
    } catch (e) {
      toast('Import mislukt: ' + (e.message || 'ongeldige JSON'));
    }
  });
}

/* ============================== router & render ============================== */
const TITLES = {
  voorraad: 'Voorraad', wensen: 'Wensen', reizen: 'Reizen',
  lijsten: 'Lijsten', instellingen: 'Instellingen',
};

function render() {
  const main = document.getElementById('main');
  document.getElementById('screen-title').textContent =
    ui.tab === 'reizen' && ui.tripView ? 'Reis' : TITLES[ui.tab];

  let html = '';
  switch (ui.tab) {
    case 'voorraad': html = renderVoorraad(); break;
    case 'wensen': html = renderWensen(); break;
    case 'reizen': html = renderReizen(); break;
    case 'lijsten': html = renderLijsten(); break;
    case 'instellingen': html = renderInstellingen(); break;
  }
  main.innerHTML = html;

  switch (ui.tab) {
    case 'voorraad': bindVoorraad(main); break;
    case 'wensen': bindWensen(main); break;
    case 'reizen': bindReizen(main); break;
    case 'lijsten': bindLijsten(main); break;
    case 'instellingen': bindInstellingen(main); break;
  }

  // tabbar
  document.querySelectorAll('.tabbar .tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === ui.tab);
  });
  const badge = document.getElementById('badge-voorraad');
  const n = expiringItems().length;
  badge.hidden = n === 0;
  badge.textContent = n;
}

document.querySelectorAll('.tabbar .tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (ui.tab === btn.dataset.tab && ui.tab === 'reizen') ui.tripView = null;
    ui.tab = btn.dataset.tab;
    render();
    document.getElementById('main').scrollTop = 0;
    window.scrollTo({ top: 0 });
  });
});

/* ============================== start ============================== */
loadState();
render();
if (corruptNotice) {
  toast('Opgeslagen data was beschadigd. Er is een reservekopie bewaard en de app is opnieuw gestart.', 6000);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline blijft werken zonder */ });
  });
}
