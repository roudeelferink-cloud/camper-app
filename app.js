/* Camper Compagnon — alle logica, geen frameworks.
   Data: localStorage als lokale cache + Firestore-sync per huishouden. */
'use strict';

import { schatGewicht } from './weights.js';
import { EU_LANDEN, LAND_INFO } from './countries.js';

/* ============================== config ============================== */
// Firebase (sync tussen de toestellen van één huishouden)
const firebaseConfig = {
  apiKey: 'AIzaSyBfIRQVYADLitxVUXHaENwRjEsMOfXQvto',
  authDomain: 'notin-app.firebaseapp.com',
  projectId: 'notin-app',
  storageBucket: 'notin-app.firebasestorage.app',
  messagingSenderId: '368094874150',
  appId: '1:368094874150:web:a8b70cc36c458c565934e7',
};
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

// Geoapify (locatie & omgeving) — key is bedoeld voor client-side gebruik;
// beperk hem in het Geoapify-dashboard tot het Pages-domein.
const GEOAPIFY_KEY = 'e74e117b64814add803ad6c80d5557db';
const GEOAPIFY_RADIUS_M = 10000; // zoekstraal rond de camping, in meters
const OMGEVING_MAX_ZICHTBAAR = 5; // per groep eerst dit aantal tonen, rest achter "Toon meer"
const OMGEVING_GROEPEN = [
  // zonder: hotels e.d. (accommodation.*) weren — die taggen vaak ook catering
  { titel: 'Eten & drinken', categories: 'catering.restaurant,catering.cafe', zonder: 'accommodation' },
  { titel: 'Strand & natuur', categories: 'beach,natural' },
  { titel: 'Boodschappen', categories: 'commercial.supermarket' },
  { titel: 'Bezienswaardigheden', categories: 'tourism.sights,tourism.attraction' },
];

/* ============================== opslag ============================== */
const STORAGE_KEY = 'camper:v1';

const CATEGORIES = [
  'Keuken', 'Slapen', 'Kleding', 'Techniek & stroom', 'Sanitair',
  'Gereedschap', 'Buiten & luifel', 'Veiligheid', 'Eten & voorraad', 'Overig',
];

const INPAKLIJST_DEFAULT = [
  ['Reisdocumenten', [
    'Paspoort (Siem, Rob, Anouc, Elies)', 'Creditcard',
  ]],
  ['Siem', [
    'Ondergoed', 'Pyjama (2x)', 'Kleren', 'Sokken', 'Jas (2x)', 'Zwembroekje (2x)',
    'Oordopjes zwemmen', 'Leesboek', 'Chillbroek', 'Natte washandjes', 'iPad', 'Wekker',
  ]],
  ['Elies', [
    'Ondergoed', 'Pyjama (1x)', 'Kleren', 'Sokken', 'Jas (2x)', 'Schoenen / laarzen',
    'Bikini (2x)', 'Chillbroek', 'Zwembadhanddoek', 'Melatonine', 'Wekker', 'Leesboek', 'iPad',
  ]],
  ['Rob', [
    'Ondergoed', 'Witte shirts', 'Zwembroek', 'Oplader', 'Telefoon', 'iPad', 'Kleding',
    'Hoody', 'Muts', 'Sportkleding compleet (lange mouw, korte mouw, lange broek, korte broek)',
    'Shake en beker', 'Pet',
  ]],
  ['Anouc', [
    'Ondergoed & bh’s', 'Zware hempjes', 'Hardloopshirt, -broek, -sokken',
    'Pyjamashirt (2x) en boxer', 'Kledingsetjes', 'Bikini', 'Oplader met usb', 'Telefoon',
    'iPad', 'Leesboek', 'Tampons', 'Maandverband', 'Inlegkruisjes', 'Extra lenzen',
    'Droogshampoo', 'Haarspray', 'Zonnebrand gezicht', 'Geurtje', 'Föhn', 'Oordopjes',
    'Telefoontasjes', 'Rugtasje Kapten & Son', 'Tandenborstel elektrisch en lader',
    'Shake en beker en spiraaltje',
  ]],
  ['Schoenen', [
    'Hardloopschoenen Anouc en Rob', 'Slippers (ARES)', 'Makkelijke schoenen (ARES)', 'Laarzen',
  ]],
  ['Verzorging kids', [
    'Luiers (maat 6) Siem', 'Shampoo', 'Tandenborstel (2x) en kindertandpasta',
    'Borstel, elastiekjes en knipjes (Elies)', 'Haargel (Siem)', 'Knuffel (Elies en Siem)',
    'Vitamines', 'Dopper',
  ]],
  ['Verzorging', [
    'Shampoo', 'Crèmespoeling', 'Douchezeep', 'Make-upremover + watjes (Anouc)',
    'Make-up (Anouc)', 'Lenzen en vloeistof en extra lenzen', 'Scheerapparaat', 'Handdoeken',
    'Tepelcrème', 'Hardloopzonnebrillen',
  ]],
  ['Algemeen', [
    'Zonnebrillen', 'Pantoffels (Rob sok-pantoffels)', 'Action handdoeken',
    'Plankje Elies zwembad', 'Hoeslakens', 'Theedoeken', 'Handdoeken keuken',
    'Schoonmaakdoekjes', 'Strandlakens', 'Handzeep', 'Joppiesaus', 'Zwembanden',
    'Duikbrillen', 'Vw-tabletten', 'Kussens', 'Worteldoek', 'Koptelefoons kids',
    'Bakplaatje', 'Wasmiddeldoekjes', 'Wastas', 'Walkietalkie', 'Horloges kids',
    'Lader horloges', 'Lader Garmin', 'Contant geld', 'Stepjes',
  ]],
  ['Boodschappen', [
    'Koffiecups', 'Wijn', 'Beleg', 'Afbakbroodjes', 'Kwark', 'Appels', 'Pindakaas',
    'Crackers', 'Rijstwafels', 'Shake', 'Wc-papier', 'Pannenkoekenmix', 'Stroop', 'Zout',
    'Peper', 'Viskruiden', 'Handzeep', 'Afwasmiddel', 'Afwasborstel', 'Honing', 'Aromat',
    'Penne', 'Boter', 'Poedersuiker', 'Garnalen', 'Blokjes aardappelen', 'Pangafilet',
    'Zalm', 'Kipfilet', 'Ketjap', 'Aardappelkruiden', 'Sojamelk', 'Appelsap',
    'Proteïnereep', 'Hapjes voor plankje', 'Garlan', 'Crème de brie', 'Vla',
    'Yoghurt', 'Cassis', 'Jippiesaus', 'Mayonaise',
  ]],
  ['Spelletjes', [
    '30 Seconds', 'Hitster', 'Regenwormen', 'JBL muziek', 'Balletje balletje', 'Perudo',
    'Zandbakspullen',
  ]],
  ['Slapen kids', [
    'Zwembandjes Siem', 'Speelgoed binnen', 'Speelgoed bad voor zwemmen', 'Eastpak tas',
    'Rugtasje Elies, Siem en Anouc',
  ]],
  ['Mini-apotheek', [
    'Zetpillen', 'Kinderparacetamol', 'Vitamines', 'Pincet', 'Pleisters', 'Veiligheidsspeld',
    'Armbandjes naam', 'Muggenprik-weg', 'Anti-mug deet', 'Vallen-en-stotencrème',
    'Wondspray', 'Nagelknipper', 'Tekentang', 'Vaseline', 'Zakje suiker', 'Zonnebrand',
    'Ibuprofen',
  ]],
  ['Let op voor overnachting', [
    'Pantoffels in camper', 'Melk en brood voor ontbijt', 'Eten voor 1 avond',
    'Drinkpakjes voor kids', 'Fruitzakjes',
  ]],
];

function defaultInpaklijst() {
  return INPAKLIJST_DEFAULT.flatMap(([group, items]) =>
    items.map((label) => ({ id: uid(), label, done: false, group })));
}

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
      inpaklijst: defaultInpaklijst(),
    },
    // boodschappenlijsten: [{ id, name, items: [{id, naam, hoeveelheid, gewichtG, geschat, done}], standard: [...] }]
    shoplists: [],
    // gerechten-archief: [{ id, naam, ingredienten: [{naam, hoeveelheid}] }]
    recipes: [],
    settings: { laadvermogen: 250, mtm: 0, leeg: 0, lastExport: null },
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
        inpaklijst: Array.isArray(parsed.checklists && parsed.checklists.inpaklijst) ? parsed.checklists.inpaklijst : d.checklists.inpaklijst,
      },
      shoplists: Array.isArray(parsed.shoplists) ? parsed.shoplists : d.shoplists,
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : d.recipes,
      settings: Object.assign({}, d.settings, parsed.settings || {}),
    };
  } catch (e) {
    try { localStorage.setItem(STORAGE_KEY + ':broken-' + Date.now(), raw); } catch (e2) { /* vol */ }
    state = defaultState();
    corruptNotice = true;
  }
}

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Opslaan mislukt — opslag vol of geblokkeerd.');
  }
}

function save() {
  persistLocal();
  scheduleSync();
}

/* ============================== sync (Firestore) ============================== */
const HOUSEHOLD_KEY = 'camper:household';
const SYNC_DEBOUNCE_MS = 500;

let fb = null;            // { db, doc, setDoc, onSnapshot } zodra de SDK geladen is
let fbUnsubscribe = null; // actieve onSnapshot-listener
let syncTimer = null;
let syncDirty = false;    // mutatie gedaan vóórdat Firebase klaar was
const syncInfo = { status: 'starten', detail: '' };

function setSyncInfo(status, detail) {
  syncInfo.status = status;
  syncInfo.detail = detail || '';
  if (ui.tab === 'instellingen') render();
}

function randomHex16() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function householdCode() {
  let code = null;
  try { code = localStorage.getItem(HOUSEHOLD_KEY); } catch (e) { /* private mode */ }
  if (!code || !/^[0-9a-f]{16}$/.test(code)) {
    code = randomHex16();
    try { localStorage.setItem(HOUSEHOLD_KEY, code); } catch (e) { /* oké */ }
  }
  return code;
}

// state → Firestore-document (NL-veldnamen, JSON-rondje strips undefined)
function stateToDoc() {
  return JSON.parse(JSON.stringify({
    voorraad: state.inventory,
    wensen: state.wishlist,
    reizen: state.trips,
    lijsten: state.checklists,
    boodschappen: state.shoplists,
    gerechten: state.recipes,
    instellingen: state.settings,
    bijgewerkt: new Date().toISOString(),
  }));
}

function docToState(data) {
  const d = defaultState();
  state = {
    inventory: Array.isArray(data.voorraad) ? data.voorraad : d.inventory,
    wishlist: Array.isArray(data.wensen) ? data.wensen : d.wishlist,
    trips: Array.isArray(data.reizen) ? data.reizen : d.trips,
    checklists: {
      vertrek: Array.isArray(data.lijsten && data.lijsten.vertrek) ? data.lijsten.vertrek : d.checklists.vertrek,
      aankomst: Array.isArray(data.lijsten && data.lijsten.aankomst) ? data.lijsten.aankomst : d.checklists.aankomst,
      inpaklijst: Array.isArray(data.lijsten && data.lijsten.inpaklijst) ? data.lijsten.inpaklijst : d.checklists.inpaklijst,
    },
    shoplists: Array.isArray(data.boodschappen) ? data.boodschappen : d.shoplists,
    recipes: Array.isArray(data.gerechten) ? data.gerechten : d.recipes,
    settings: Object.assign({}, d.settings, data.instellingen || {}),
  };
}

function scheduleSync() {
  if (!fb) { syncDirty = true; return; }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushState, SYNC_DEBOUNCE_MS);
}

function pushState() {
  if (!fb) { syncDirty = true; return; }
  syncDirty = false;
  const ref = fb.doc(fb.db, 'households', householdCode());
  fb.setDoc(ref, stateToDoc(), { merge: true }).catch(() => {
    // offline: Firestore's eigen IndexedDB-cache bewaart de write en synct later
  });
}

function subscribeHousehold(code) {
  if (!fb) return;
  if (fbUnsubscribe) { fbUnsubscribe(); fbUnsubscribe = null; }
  const ref = fb.doc(fb.db, 'households', code);
  let first = true;
  fbUnsubscribe = fb.onSnapshot(ref, (snap) => {
    setSyncInfo('verbonden', '');
    if (first) {
      first = false;
      // Eenmalige migratie: bestaat het huishoud-document nog niet,
      // push dan de lokale data als startpunt.
      if (!snap.exists()) { pushState(); return; }
    }
    if (snap.metadata.hasPendingWrites) return; // eigen (lokale) schrijfactie
    if (!snap.exists()) return;
    docToState(snap.data());
    persistLocal();
    render();
  }, (err) => {
    setSyncInfo('fout', (err && err.code === 'permission-denied')
      ? 'Geen toegang — zijn de Firestore-rules gepubliceerd en is anonieme login aan?'
      : (err && err.message) || 'Onbekende fout');
  });
}

async function initSync() {
  let appMod, fsMod, authMod;
  try {
    [appMod, fsMod, authMod] = await Promise.all([
      import(FIREBASE_SDK + 'firebase-app.js'),
      import(FIREBASE_SDK + 'firebase-firestore.js'),
      import(FIREBASE_SDK + 'firebase-auth.js'),
    ]);
  } catch (e) {
    // SDK niet bereikbaar (eerste start offline) — app draait volledig op localStorage
    setSyncInfo('offline', 'Geen verbinding — wijzigingen blijven lokaal tot er internet is.');
    return;
  }
  try {
    const app = appMod.initializeApp(firebaseConfig);
    let db;
    try {
      // Offline persistence: Firestore cachet zelf in IndexedDB en synct bij herverbinding.
      db = fsMod.initializeFirestore(app, {
        localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
      });
    } catch (e2) {
      db = fsMod.getFirestore(app);
    }
    fb = { db, doc: fsMod.doc, setDoc: fsMod.setDoc, onSnapshot: fsMod.onSnapshot };
    try {
      await authMod.signInAnonymously(authMod.getAuth(app));
    } catch (e3) {
      setSyncInfo('fout', 'Anoniem inloggen mislukt — zet "Anonymous" aan onder Authentication in de Firebase-console.');
    }
    subscribeHousehold(householdCode());
    if (syncDirty) scheduleSync();
  } catch (e) {
    setSyncInfo('fout', (e && e.message) || 'Firebase initialiseren mislukt.');
  }
}

function koppelHousehold(code) {
  try { localStorage.setItem(HOUSEHOLD_KEY, code); } catch (e) { /* oké */ }
  subscribeHousehold(code);
}

/* ============================== gewichtsschatting (AI-haak, optioneel) ============================== */
// De Anthropic-key blijft puur lokaal: niet in state, dus nooit in Firestore,
// export-JSON of git.
const ANTHROPIC_KEY_STORAGE = 'camper:anthropicKey';

function getAnthropicKey() {
  try { return localStorage.getItem(ANTHROPIC_KEY_STORAGE) || ''; } catch (e) { return ''; }
}

function setAnthropicKey(key) {
  try {
    if (key) localStorage.setItem(ANTHROPIC_KEY_STORAGE, key);
    else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
  } catch (e) { /* oké */ }
}

// Vraagt Claude (haiku) om een gewicht in gram voor een onbekend item.
// Geen key of geen bereik → null, de app werkt gewoon door op de tabel.
async function aiSchatGewicht(naam) {
  const key = getAnthropicKey();
  if (!key || !navigator.onLine) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 16,
        messages: [{
          role: 'user',
          content: 'Typisch gewicht in gram van één stuk van dit camper/boodschappen-item: "' +
            naam + '". Antwoord met uitsluitend één geheel getal (gram), niets anders.',
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';
    const m = text.match(/\d+/);
    if (!m) return null;
    const g = parseInt(m[0], 10);
    return (g > 0 && g <= 100000) ? g : null;
  } catch (e) {
    return null;
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
  tripView: null,        // { id, subtab: 'paklijst' | 'omgeving' }
  omgevingBusy: false,
  omgevingError: null,
  omgevingOpen: new Set(), // groepstitels waarvan alle POI's uitgeklapt zijn
  camperSub: 'gegevens', // 'gegevens' | 'waterpas'
};

/* ---------- in-/uitklapstand van secties ----------
   Weergavevoorkeur per toestel: alleen in localStorage, bewust NIET in
   Firestore. Key per sectie-ID; geen entry = de zinnige default geldt. */
const COLLAPSE_KEY = 'camper:collapsed:v1';

const collapsedMap = (() => {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}; } catch (e) { return {}; }
})();

function saveCollapsed() {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedMap)); } catch (e) { /* oké */ }
}

// def = default-ingeklapt (true) als de gebruiker nog nooit getikt heeft
function isCollapsed(id, def) {
  return Object.prototype.hasOwnProperty.call(collapsedMap, id) ? !!collapsedMap[id] : !!def;
}

function toggleCollapsed(id, def) {
  collapsedMap[id] = !isCollapsed(id, def);
  saveCollapsed();
  render();
}

// Tapbare sectie-kop met chevron; actionsHtml (bv. Reset/✕) blijft ernaast staan.
function secHead(id, def, labelHtml, actionsHtml) {
  const open = !isCollapsed(id, def);
  return '<div class="list-head">' +
    '<button class="sec-toggle' + (open ? ' open' : '') + '" data-sec="' + esc(id) + '" data-secdef="' + (def ? 1 : 0) + '" ' +
      'aria-expanded="' + open + '">' + CHEV_SVG +
      '<span class="section-label">' + labelHtml + '</span></button>' +
    (actionsHtml || '') + '</div>';
}

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
  const shopKg = shoplistsTotalKg();
  const total = invTotalWeight() + shopKg; // geplande boodschappen tellen mee
  const max = Number(state.settings.laadvermogen) || 0;
  const pct = max > 0 ? (total / max) * 100 : 0;
  const cls = total > max ? 'over' : 'ok';
  const over = total - max;
  return (
    '<div class="weightbar-wrap">' +
      '<div class="weightbar-label"><span>Laadgewicht</span><span>' +
        fmtKg(total) + ' / ' + fmtKg(max) + ' kg' +
        (cls === 'over' ? ' <span class="weight-over">+' + fmtKg(over) + ' kg te veel</span>' : '') +
      '</span></div>' +
      '<div class="weightbar"><div class="' + cls + '" style="width:' + Math.min(100, pct).toFixed(1) + '%"></div></div>' +
      (shopKg > 0 ? '<div class="weightbar-note mono">waarvan ~' + fmtKg(shopKg) + ' kg geplande boodschappen</div>' : '') +
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
  const w = Number(it.weight) || 0;
  const q = Number(it.qty) || 0;
  const est = !!it.weightEstimated;
  const gewichtHtml = est
    ? '<span class="w-est">~' + fmtKg(w) + ' kg = ~' + fmtKg(w * q) + ' kg</span>'
    : fmtKg(w) + ' kg = ' + fmtKg(w * q) + ' kg';
  return '<div class="inv-item">' +
    '<div class="inv-main" data-edit="' + it.id + '">' +
      '<div class="inv-name">' + esc(it.name) + '</div>' +
      '<div class="inv-sub">' + q + ' × ' + gewichtHtml + expHtml + '</div>' +
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
        '<label class="field"><span>Gewicht/stuk (kg) <em id="weight-est-flag" class="est-flag"' +
          (v.weightEstimated ? '' : ' hidden') + '>~ geschat</em></span>' +
          '<input name="weight" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(v.weight) + '"></label>' +
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

  /* --- automatische gewichtsschatting --- */
  const itemForm = document.getElementById('item-form');
  const nameInput = itemForm.elements.name;
  const weightInput = itemForm.elements.weight;
  const estFlagEl = document.getElementById('weight-est-flag');
  let estFlag = it ? !!it.weightEstimated : false;
  let estTimer = null;
  let aiToken = 0;

  function showEstFlag() { estFlagEl.hidden = !estFlag; }

  // Alleen invullen als het veld leeg/0 is of de huidige waarde zelf een schatting is —
  // een handmatig ("hard") gewicht wordt nooit overschreven.
  function magInvullen() {
    return estFlag || !(parseFloat(weightInput.value) > 0);
  }

  function applyEstimate(viaAi) {
    if (!magInvullen()) return;
    const grams = schatGewicht(nameInput.value);
    if (grams != null) {
      weightInput.value = String(grams / 1000);
      estFlag = true;
      showEstFlag();
      return;
    }
    // Geen match: bestaand geschat gewicht hoort niet meer bij deze naam → leegmaken.
    if (estFlag) {
      weightInput.value = '';
      estFlag = false;
      showEstFlag();
    }
    if (!viaAi) return;
    // Optionele AI-haak: alleen met key én internet, anders stil overslaan.
    const naam = nameInput.value.trim();
    if (!naam) return;
    const token = ++aiToken;
    aiSchatGewicht(naam).then((g) => {
      if (g == null || token !== aiToken) return;
      if (nameInput.value.trim() !== naam || !magInvullen()) return;
      weightInput.value = String(g / 1000);
      estFlag = true;
      showEstFlag();
    });
  }

  nameInput.addEventListener('input', () => {
    clearTimeout(estTimer);
    estTimer = setTimeout(() => applyEstimate(false), 350);
  });
  nameInput.addEventListener('change', () => {
    clearTimeout(estTimer);
    applyEstimate(true);
  });
  weightInput.addEventListener('input', () => {
    // Handmatige aanpassing = hard gewicht: tilde weg.
    estFlag = false;
    showEstFlag();
  });

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
    const weight = Math.max(0, parseFloat(f.get('weight')) || 0);
    const data = {
      name,
      category: String(f.get('category')),
      qty: Math.max(0, parseInt(f.get('qty'), 10) || 0),
      weight,
      weightEstimated: estFlag && weight > 0,
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
      ui.omgevingError = null;
      ui.omgevingOpen = new Set();
      render();
    });
  });
  const fab = main.querySelector('#fab-trip');
  if (fab) fab.addEventListener('click', () => openTripSheet(null));
}

function openTripSheet(id) {
  const t = id ? state.trips.find((x) => x.id === id) : null;
  const v = t || { place: '', country: '', startDate: '', endDate: '', notes: '', camping: '' };
  openSheet(
    '<h2>' + (t ? 'Reis bewerken' : 'Reis toevoegen') + '</h2>' +
    '<form id="trip-form">' +
      '<label class="field"><span>Plaats</span><input name="place" required value="' + esc(v.place) + '" autocomplete="off"></label>' +
      '<label class="field"><span>Land</span><input name="country" required value="' + esc(v.country) + '" autocomplete="off"></label>' +
      '<label class="field"><span>Camping (optioneel)</span><input name="camping" value="' + esc(v.camping || '') + '" autocomplete="off" placeholder="bv. Yelloh Village, Saint Pabu Plage"></label>' +
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
      camping: String(f.get('camping') || '').trim(),
      startDate: String(f.get('startDate') || ''),
      endDate: String(f.get('endDate') || ''),
      notes: String(f.get('notes') || '').trim(),
    };
    if (!data.place) return;
    if (t) {
      // andere camping → oude omgevingscache klopt niet meer
      if (t.camping !== data.camping && t.omgeving) t.omgeving = null;
      Object.assign(t, data);
    } else {
      state.trips.push(Object.assign({ id: uid(), packed: {}, omgeving: null }, data));
    }
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
    renderWeer(t) +
    '<div class="subtabs">' +
      '<button data-sub="paklijst" class="' + (sub === 'paklijst' ? 'active' : '') + '">Paklijst</button>' +
      '<button data-sub="eten" class="' + (sub === 'eten' ? 'active' : '') + '">Eten</button>' +
      '<button data-sub="onderweg" class="' + (sub === 'onderweg' ? 'active' : '') + '">Onderweg</button>' +
      '<button data-sub="omgeving" class="' + (sub === 'omgeving' ? 'active' : '') + '">Omgeving</button>' +
    '</div>';
  if (sub === 'omgeving') html += renderOmgeving(t);
  else if (sub === 'eten') html += renderEten(t);
  else if (sub === 'onderweg') html += renderOnderweg(t);
  else html += renderPaklijst(t);
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

/* ---------- onderweg-benodigdheden (subtab Onderweg) ---------- */
function nieuwOnderwegLand(naam) {
  const info = LAND_INFO[naam];
  return {
    naam,
    items: info
      ? info.items.map((it) => ({
          id: uid(), label: it.label, info: it.info || '',
          status: 'open', notitie: '', custom: false,
        }))
      : [],
  };
}

// Eerste keer: land van de reisbestemming voorinvullen als startsuggestie.
// Daarna nooit meer automatisch toevoegen (doorreis = handmatig beheren).
function ensureOnderweg(t) {
  if (t.onderweg) return;
  t.onderweg = { landen: [] };
  const land = String(t.country || '').trim().toLowerCase();
  const match = EU_LANDEN.find((n) => n.toLowerCase() === land);
  if (match) t.onderweg.landen.push(nieuwOnderwegLand(match));
  save();
}

function renderOnderweg(t) {
  ensureOnderweg(t);
  const landen = t.onderweg.landen;
  let html = '<div class="alert info" style="font-size:0.83rem">Richtlijn, geen juridisch advies — ' +
    'controleer de actuele eisen per land zelf (bv. anwb.nl). Geen prijzen of tarieven.</div>';
  const beschikbaar = EU_LANDEN.filter((n) => !landen.some((l) => l.naam === n));
  html += '<div class="code-row" style="margin-bottom:16px"><select id="ow-land-select">' +
    '<option value="">— kies een land —</option>' +
    beschikbaar.map((n) => '<option>' + esc(n) + '</option>').join('') +
    '</select><button class="btn small" id="ow-land-add">Voeg toe</button></div>';
  if (!landen.length) {
    html += '<div class="empty"><span class="big">🛂</span>Nog geen landen — voeg de landen toe waar je doorheen rijdt.</div>';
  }
  for (let li = 0; li < landen.length; li++) {
    const l = landen[li];
    const info = LAND_INFO[l.naam];
    const relevant = l.items.filter((it) => it.status !== 'nvt');
    const klaar = l.items.filter((it) => it.status === 'gedaan').length;
    const secId = 'ow:' + t.id + ':' + l.naam;
    const secDef = l.items.length > 0 && klaar === relevant.length; // alles geregeld → dicht
    html += secHead(secId, secDef,
      esc(l.naam) + ' <span class="mono" style="text-transform:none;letter-spacing:0">' + klaar + ' van ' + relevant.length + ' geregeld</span>',
      '<button class="icon-btn" data-ow-delland="' + li + '" aria-label="Land verwijderen">✕</button>');
    if (isCollapsed(secId, secDef)) continue;
    html += '<div class="card" style="padding:0">';
    html += '<div class="ow-vignet mono">' +
      esc(info ? info.vignet : 'Geen vaste items voor dit land — vul hieronder zelf aan.') + '</div>';
    html += l.items.map((it) => {
      const st = it.status || 'open';
      return '<div class="ow-item' + (st === 'gedaan' ? ' done' : '') + (st === 'nvt' ? ' nvt' : '') + '">' +
        '<div class="ow-main" data-ow-edit="' + li + ':' + it.id + '">' +
          '<div class="ow-label">' + esc(it.label) + '</div>' +
          (it.info ? '<div class="ow-info">' + esc(it.info) + '</div>' : '') +
          (it.notitie ? '<div class="ow-note mono">✎ ' + esc(it.notitie) + '</div>' : '') +
        '</div>' +
        '<div class="status-seg ow-seg" data-ow-land="' + li + '" data-ow-item="' + it.id + '">' +
          '<button data-ow-st="open" class="' + (st === 'open' ? 'sel-open' : '') + '">☐</button>' +
          '<button data-ow-st="gedaan" class="' + (st === 'gedaan' ? 'sel-vol' : '') + '">✓</button>' +
          '<button data-ow-st="nvt" class="' + (st === 'nvt' ? 'sel-nvt' : '') + '">n.v.t.</button>' +
        '</div>' +
      '</div>';
    }).join('');
    html += '<form class="add-step" data-ow-add="' + li + '">' +
      '<input name="label" placeholder="Eigen item toevoegen…" autocomplete="off" required>' +
      '<button class="btn small" type="submit">+</button></form></div>';
  }
  return html;
}

// Notitie (en bij eigen items: naam/verwijderen) bewerken via bottom sheet.
function openOwItemSheet(t, landIdx, itemId) {
  const land = t.onderweg.landen[landIdx];
  const item = land && land.items.find((x) => x.id === itemId);
  if (!item) return;
  openSheet(
    '<h2>' + esc(item.custom ? 'Eigen item' : item.label) + '</h2>' +
    '<form id="ow-form">' +
      (item.custom
        ? '<label class="field"><span>Omschrijving</span><input name="label" required value="' + esc(item.label) + '" autocomplete="off"></label>'
        : (item.info ? '<p class="muted" style="margin-top:0">' + esc(item.info) + '</p>' : '')) +
      '<label class="field"><span>Notitie (bv. gekocht op…, geldig t/m…, referentie)</span>' +
        '<textarea name="notitie" rows="3">' + esc(item.notitie || '') + '</textarea></label>' +
      '<div class="sheet-actions">' +
        (item.custom ? '<button type="button" class="btn danger" id="ow-del">Verwijderen</button>' : '') +
        '<button type="button" class="btn secondary" id="ow-cancel">Annuleren</button>' +
        '<button type="submit" class="btn">Opslaan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('ow-cancel').addEventListener('click', closeSheet);
  const delBtn = document.getElementById('ow-del');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      land.items = land.items.filter((x) => x.id !== item.id);
      save(); closeSheet(); render();
      toast('Item verwijderd');
    });
  }
  document.getElementById('ow-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (item.custom) {
      const label = String(f.get('label') || '').trim();
      if (label) item.label = label;
    }
    item.notitie = String(f.get('notitie') || '').trim();
    save(); closeSheet(); render();
  });
}

function bindOnderweg(main, t) {
  const addBtn = main.querySelector('#ow-land-add');
  if (!addBtn) return; // subtab niet actief
  addBtn.addEventListener('click', () => {
    const sel = main.querySelector('#ow-land-select');
    const naam = sel.value;
    if (!naam) { toast('Kies eerst een land.'); return; }
    t.onderweg.landen.push(nieuwOnderwegLand(naam));
    save(); render();
  });
  main.querySelectorAll('[data-ow-delland]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = t.onderweg.landen[Number(btn.dataset.owDelland)];
      if (!l) return;
      t.onderweg.landen.splice(Number(btn.dataset.owDelland), 1);
      save(); render();
      toast('“' + l.naam + '” verwijderd uit deze reis');
    });
  });
  main.querySelectorAll('.ow-seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const seg = btn.closest('.ow-seg');
      const land = t.onderweg.landen[Number(seg.dataset.owLand)];
      const item = land && land.items.find((x) => x.id === seg.dataset.owItem);
      if (item) { item.status = btn.dataset.owSt; save(); render(); }
    });
  });
  main.querySelectorAll('[data-ow-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const [li, iid] = el.dataset.owEdit.split(':');
      openOwItemSheet(t, Number(li), iid);
    });
  });
  main.querySelectorAll('form[data-ow-add]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const land = t.onderweg.landen[Number(form.dataset.owAdd)];
      const label = form.elements.label.value.trim();
      if (!land || !label) return;
      land.items.push({ id: uid(), label, info: '', status: 'open', notitie: '', custom: true });
      save(); render();
    });
  });
}

/* ---------- maaltijdplanner (subtab Eten) ---------- */
const MAALTIJD_SLOTS = [['ontbijt', 'Ontbijt'], ['lunch', 'Lunch'], ['diner', 'Diner']];

function tripDays(t) {
  const days = [];
  if (!t.startDate) return days;
  const start = new Date(t.startDate + 'T12:00:00');
  const end = t.endDate ? new Date(t.endDate + 'T12:00:00') : start;
  if (isNaN(start) || isNaN(end)) return days;
  for (let d = new Date(start), i = 0; d <= end && i < 60; d.setDate(d.getDate() + 1), i++) {
    days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }
  return days;
}

function fmtDag(iso) {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

// alle "zelf koken"-maaltijden van een reis: [{ dag, slot, meal }]
function kookEntries(t) {
  const out = [];
  const meals = t.meals || {};
  for (const dag of Object.keys(meals)) {
    for (const [slot] of MAALTIJD_SLOTS) {
      const m = meals[dag] && meals[dag][slot];
      if (m && m.type === 'koken' && Array.isArray(m.ingredienten) && m.ingredienten.length) {
        out.push({ dag, slot, meal: m });
      }
    }
  }
  return out;
}

function renderEten(t) {
  if (!t.meals) t.meals = {};
  const dagen = tripDays(t);
  const nieuw = kookEntries(t).filter((e) => !e.meal.doorgerold).length;
  let html = '<button class="btn block" id="rol-alles">Alle kook-maaltijden → boodschappenlijst' +
    (nieuw ? ' (' + nieuw + ' nieuw)' : '') + '</button>';
  if (!dagen.length) {
    html += '<div class="empty">Geen reisdagen — zet eerst de reisdata via ✎.</div>';
    return html;
  }
  for (const dag of dagen) {
    const dm = t.meals[dag] || {};
    const secId = 'eten:' + t.id + ':' + dag;
    // verleden of volledig gepland diner → dicht; nog te plannen → open
    const secDef = dag < todayISO() || !!dm.diner;
    const samenvatting = MAALTIJD_SLOTS.map(([slot]) => {
      const m = dm[slot];
      if (!m) return '—';
      return m.type === 'koken' ? (m.gerecht || 'koken') : (m.plek || 'uit eten');
    }).join(' / ');
    html += secHead(secId, secDef,
      esc(fmtDag(dag)) +
      (isCollapsed(secId, secDef) ? ' <span class="sec-sum mono">' + esc(samenvatting) + '</span>' : ''),
      '');
    if (isCollapsed(secId, secDef)) continue;
    html += '<div class="card" style="padding:0">';
    for (const [slot, label] of MAALTIJD_SLOTS) {
      const m = dm[slot];
      let inhoud = '';
      let cls = '';
      if (!m) {
        // diner is verplicht: leeg diner-slot valt op, ontbijt/lunch zijn optioneel
        if (slot === 'diner') { inhoud = 'nog plannen'; cls = ' meal-missing'; }
        else { inhoud = '—'; cls = ' meal-empty'; }
      } else if (m.type === 'koken') {
        inhoud = '🍳 ' + esc(m.gerecht || 'zelf koken') +
          ' <span class="muted mono">' + (m.ingredienten || []).length + ' ingr.' +
          (m.doorgerold ? ' · ✓' : '') + '</span>';
      } else {
        inhoud = '🍽️ ' + esc(m.plek || 'uit eten') +
          (m.budget ? ' <span class="muted mono">' + esc(m.budget) + '</span>' : '');
      }
      html += '<div class="meal-row' + cls + '" data-meal-dag="' + dag + '" data-meal-slot="' + slot + '">' +
        '<span class="meal-label mono">' + label + '</span>' +
        '<span class="meal-inhoud">' + inhoud + '</span>' +
        '<span class="meal-go">›</span></div>';
    }
    html += '</div>';
  }
  return html;
}

// hoeveelheden samenvoegen: zelfde eenheid -> optellen, anders beide tonen
function mergeHoeveelheid(a, b) {
  a = String(a || '').trim(); b = String(b || '').trim();
  if (!a) return b;
  if (!b) return a;
  const re = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;
  const ma = a.match(re);
  const mb = b.match(re);
  if (ma && mb && ma[2].trim().toLowerCase() === mb[2].trim().toLowerCase()) {
    const sum = parseFloat(ma[1].replace(',', '.')) + parseFloat(mb[1].replace(',', '.'));
    const num = (Math.round(sum * 100) / 100).toString().replace('.', ',');
    return ma[2].trim() ? num + ' ' + ma[2].trim() : num;
  }
  return a + ' + ' + b;
}

function kiesShoplistSheet(trip, cb) {
  const nieuwNaam = 'Boodschappen ' + (trip.place || 'reis');
  openSheet(
    '<h2>Naar welke boodschappenlijst?</h2>' +
    '<form id="kies-lijst-form">' +
      '<label class="field"><span>Lijst</span><select name="lijst">' +
        state.shoplists.map((l) => '<option value="' + l.id + '">' + esc(l.name) + '</option>').join('') +
        '<option value="__nieuw">+ Nieuwe lijst “' + esc(nieuwNaam) + '”</option>' +
      '</select></label>' +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn secondary" id="kies-lijst-cancel">Annuleren</button>' +
        '<button type="submit" class="btn">Toevoegen</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('kies-lijst-cancel').addEventListener('click', closeSheet);
  document.getElementById('kies-lijst-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const keuze = String(new FormData(e.target).get('lijst'));
    let lijst = state.shoplists.find((l) => l.id === keuze);
    if (!lijst) {
      lijst = { id: uid(), name: nieuwNaam, items: [], standard: [] };
      state.shoplists.push(lijst);
    }
    cb(lijst);
  });
}

// Rolt kook-maaltijden door naar een boodschappenlijst. Idempotent: alleen
// maaltijden zonder doorgerold-vlag gaan mee; dedupe op ingrediëntnaam.
function rolMaaltijden(trip, entries) {
  const teDoen = entries.filter((e) => !e.meal.doorgerold);
  if (!teDoen.length) {
    toast('Niets nieuws door te rollen — alles staat al op een lijst.');
    return;
  }
  kiesShoplistSheet(trip, (lijst) => {
    if (!Array.isArray(lijst.items)) lijst.items = [];
    let toegevoegd = 0;
    let samengevoegd = 0;
    for (const e of teDoen) {
      for (const ing of e.meal.ingredienten) {
        const naam = String(ing.naam || '').trim();
        if (!naam) continue;
        const hoev = String(ing.hoeveelheid || '').trim();
        const bestaand = lijst.items.find((it) => String(it.naam).trim().toLowerCase() === naam.toLowerCase());
        if (bestaand) {
          bestaand.hoeveelheid = mergeHoeveelheid(bestaand.hoeveelheid, hoev);
          samengevoegd++;
        } else {
          lijst.items.push(nieuwShopItem(naam, hoev)); // incl. ~geschat gewicht via weights.js
          toegevoegd++;
        }
      }
      e.meal.doorgerold = true;
    }
    save(); closeSheet(); render();
    toast(toegevoegd + ' ingrediënt' + (toegevoegd === 1 ? '' : 'en') + ' toegevoegd aan “' + lijst.name + '”' +
      (samengevoegd ? ' (' + samengevoegd + ' samengevoegd)' : ''));
  });
}

function openMealSheet(t, dag, slot) {
  const slotLabel = (MAALTIJD_SLOTS.find(([s]) => s === slot) || [])[1] || slot;
  if (!t.meals) t.meals = {};
  const huidig = (t.meals[dag] && t.meals[dag][slot]) || null;
  const type = huidig ? huidig.type : 'leeg';
  openSheet(
    '<h2>' + esc(slotLabel) + ' · ' + esc(fmtDag(dag)) + '</h2>' +
    '<form id="meal-form">' +
      '<label class="field"><span>Type</span><select name="type">' +
        '<option value="leeg"' + (type === 'leeg' ? ' selected' : '') + '>Leeg / overslaan</option>' +
        '<option value="koken"' + (type === 'koken' ? ' selected' : '') + '>Zelf koken</option>' +
        '<option value="restaurant"' + (type === 'restaurant' ? ' selected' : '') + '>Restaurant / uit eten</option>' +
      '</select></label>' +
      '<div id="meal-koken" hidden>' +
        (state.recipes.length
          ? '<label class="field"><span>Uit gerechten-archief</span><div class="code-row">' +
              '<select id="meal-archief"><option value="">— kies een gerecht —</option>' +
              state.recipes.map((r) => '<option value="' + r.id + '">' + esc(r.naam) + '</option>').join('') +
              '</select>' +
              '<button type="button" class="btn small secondary" id="archief-del" hidden>Wis</button>' +
            '</div></label>'
          : '') +
        '<label class="field"><span>Gerecht</span><input name="gerecht" autocomplete="off" placeholder="bv. pasta pesto"></label>' +
        '<div class="section-label" style="margin-top:4px">Ingrediënten</div>' +
        '<div id="ing-rows"></div>' +
        '<button type="button" class="btn small secondary" id="ing-add">+ ingrediënt</button>' +
        '<label class="check-inline"><input type="checkbox" name="bewaar"> Bewaar gerecht in archief</label>' +
      '</div>' +
      '<div id="meal-restaurant" hidden>' +
        '<label class="field"><span>Naam / plek (optioneel)</span><input name="plek" autocomplete="off"></label>' +
        '<label class="field"><span>Budget-notitie (optioneel)</span><input name="budget" autocomplete="off" placeholder="bv. max €60"></label>' +
      '</div>' +
      (huidig && huidig.type === 'koken' && (huidig.ingredienten || []).length
        ? '<button type="button" class="btn small secondary block" id="meal-rol" style="margin-top:10px">' +
            (huidig.doorgerold ? '✓ Al doorgerold — nogmaals naar boodschappenlijst' : 'Deze maaltijd → boodschappenlijst') +
          '</button>'
        : '') +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn secondary" id="meal-cancel">Annuleren</button>' +
        '<button type="submit" class="btn">Opslaan</button>' +
      '</div>' +
    '</form>'
  );

  const form = document.getElementById('meal-form');
  const kokenDiv = document.getElementById('meal-koken');
  const restoDiv = document.getElementById('meal-restaurant');
  const ingRows = document.getElementById('ing-rows');

  function ingRow(naam, hoeveelheid) {
    const div = document.createElement('div');
    div.className = 'ing-row';
    div.innerHTML = '<input class="ing-naam" placeholder="ingrediënt" autocomplete="off" value="' + esc(naam || '') + '">' +
      '<input class="ing-hoev" placeholder="hoeveelheid" autocomplete="off" value="' + esc(hoeveelheid || '') + '">' +
      '<button type="button" class="icon-btn ing-del" aria-label="Verwijderen">✕</button>';
    div.querySelector('.ing-del').addEventListener('click', () => div.remove());
    return div;
  }

  function vulKoken(gerecht, ingredienten) {
    form.elements.gerecht.value = gerecht || '';
    ingRows.innerHTML = '';
    (ingredienten && ingredienten.length ? ingredienten : [{}]).forEach((i) => ingRows.appendChild(ingRow(i.naam, i.hoeveelheid)));
  }

  function leesIngredienten() {
    return Array.from(ingRows.querySelectorAll('.ing-row')).map((row) => ({
      naam: row.querySelector('.ing-naam').value.trim(),
      hoeveelheid: row.querySelector('.ing-hoev').value.trim(),
    })).filter((i) => i.naam);
  }

  function toonType() {
    const v = form.elements.type.value;
    kokenDiv.hidden = v !== 'koken';
    restoDiv.hidden = v !== 'restaurant';
  }

  // init
  if (huidig && huidig.type === 'koken') vulKoken(huidig.gerecht, huidig.ingredienten);
  else vulKoken('', []);
  if (huidig && huidig.type === 'restaurant') {
    form.elements.plek.value = huidig.plek || '';
    form.elements.budget.value = huidig.budget || '';
  }
  toonType();

  form.elements.type.addEventListener('change', toonType);
  document.getElementById('ing-add').addEventListener('click', () => {
    const row = ingRow('', '');
    ingRows.appendChild(row);
    row.querySelector('.ing-naam').focus();
  });
  document.getElementById('meal-cancel').addEventListener('click', closeSheet);

  const archiefSel = document.getElementById('meal-archief');
  const archiefDel = document.getElementById('archief-del');
  if (archiefSel) {
    archiefSel.addEventListener('change', () => {
      const r = state.recipes.find((x) => x.id === archiefSel.value);
      if (archiefDel) archiefDel.hidden = !r;
      if (r) vulKoken(r.naam, r.ingredienten);
    });
  }
  if (archiefDel) {
    archiefDel.addEventListener('click', () => {
      const r = state.recipes.find((x) => x.id === archiefSel.value);
      if (!r) return;
      state.recipes = state.recipes.filter((x) => x.id !== r.id);
      save();
      archiefSel.querySelector('option[value="' + r.id + '"]').remove();
      archiefSel.value = '';
      archiefDel.hidden = true;
      toast('“' + r.naam + '” uit archief verwijderd');
    });
  }

  const rolBtn = document.getElementById('meal-rol');
  if (rolBtn) {
    rolBtn.addEventListener('click', () => {
      // bewust óók nogmaals mogelijk: vlag tijdelijk negeren als hij al doorgerold is
      const entry = { dag, slot, meal: huidig };
      if (huidig.doorgerold) huidig.doorgerold = false;
      rolMaaltijden(t, [entry]);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.elements.type.value;
    if (!t.meals[dag]) t.meals[dag] = {};
    if (v === 'leeg') {
      delete t.meals[dag][slot];
      if (!Object.keys(t.meals[dag]).length) delete t.meals[dag];
    } else if (v === 'koken') {
      const gerecht = form.elements.gerecht.value.trim();
      const ingredienten = leesIngredienten();
      // ongewijzigde maaltijd houdt zijn doorgerold-vlag (idempotent doorrollen)
      const zelfde = huidig && huidig.type === 'koken' && huidig.gerecht === gerecht &&
        JSON.stringify(huidig.ingredienten || []) === JSON.stringify(ingredienten);
      t.meals[dag][slot] = {
        type: 'koken', gerecht, ingredienten,
        doorgerold: zelfde ? !!huidig.doorgerold : false,
      };
      if (form.elements.bewaar.checked && gerecht) {
        const bestaand = state.recipes.find((r) => r.naam.trim().toLowerCase() === gerecht.toLowerCase());
        if (bestaand) bestaand.ingredienten = ingredienten;
        else state.recipes.push({ id: uid(), naam: gerecht, ingredienten });
        toast('“' + gerecht + '” bewaard in gerechten-archief');
      }
    } else {
      t.meals[dag][slot] = {
        type: 'restaurant',
        plek: form.elements.plek.value.trim(),
        budget: form.elements.budget.value.trim(),
      };
    }
    save(); closeSheet(); render();
  });
}

/* ---------- omgeving (Geoapify) ---------- */
function fmtAfstand(m) {
  if (m < 1000) return m + ' m';
  return (m / 1000).toFixed(1).replace('.', ',') + ' km';
}

function zoekTekst(t) {
  return [t.camping, t.place, t.country].filter(Boolean).join(', ');
}

function renderOmgeving(t) {
  let html = '';
  if (ui.omgevingError) {
    html += '<div class="alert danger"><h3>Zoeken mislukt</h3><p>' + esc(ui.omgevingError) + '</p></div>';
  }
  if (ui.omgevingBusy) {
    html += '<button class="btn block" disabled><span class="spinner"></span>Bezig met zoeken…</button>';
  } else {
    html += '<button class="btn block" id="zoek-omgeving">' +
      (t.omgeving ? 'Opnieuw zoeken' : 'Zoek locatie &amp; omgeving') + '</button>' +
      '<p class="muted mono" style="margin:8px 2px 0">Zoekt op: ' + esc(zoekTekst(t)) + '</p>';
  }
  const o = t.omgeving;
  if (o) {
    html += '<div class="card" style="margin-top:12px"><strong>📍 ' + esc(o.adres) + '</strong>' +
      '<p class="muted mono" style="margin:6px 0 0">Opgehaald op ' + fmtDate(o.datum) +
      ' · straal ' + (GEOAPIFY_RADIUS_M / 1000) + ' km · ' +
      '<a href="https://www.google.com/maps?q=' + o.lat + ',' + o.lon + '" target="_blank" rel="noopener">open in kaart</a></p></div>';
    for (const g of o.groepen) {
      const open = ui.omgevingOpen.has(g.titel);
      const zichtbaar = open ? g.items : g.items.slice(0, OMGEVING_MAX_ZICHTBAAR);
      const rest = g.items.length - OMGEVING_MAX_ZICHTBAAR;
      html += '<div class="section-label">' + esc(g.titel) + '</div><div class="card" style="padding:0">';
      if (!g.items.length) {
        html += '<div class="poi-item muted">Niets gevonden binnen ' + (GEOAPIFY_RADIUS_M / 1000) + ' km.</div>';
      } else {
        html += zichtbaar.map((p) =>
          '<div class="poi-item" style="display:flex;align-items:center;gap:10px">' +
            '<div style="flex:1;min-width:0"><div class="name">' + esc(p.naam) + '</div>' +
            '<div class="detail mono">' + fmtAfstand(p.afstandM) + '</div></div>' +
            '<a class="btn small secondary" href="https://www.google.com/maps?q=' + p.lat + ',' + p.lon +
            '" target="_blank" rel="noopener" style="text-decoration:none">kaart</a>' +
          '</div>'
        ).join('');
        if (rest > 0) {
          html += '<button class="poi-more" data-meer="' + esc(g.titel) + '">' +
            (open ? 'Toon minder' : 'Toon meer (' + rest + ')') + '</button>';
        }
      }
      html += '</div>';
    }
  }
  return html;
}

async function zoekOmgeving(t) {
  ui.omgevingBusy = true;
  ui.omgevingError = null;
  render();
  try {
    const tekst = zoekTekst(t);
    const geoRes = await fetch('https://api.geoapify.com/v1/geocode/search?text=' +
      encodeURIComponent(tekst) + '&limit=1&lang=nl&apiKey=' + GEOAPIFY_KEY);
    if (!geoRes.ok) throw new Error('Locatie zoeken mislukt (HTTP ' + geoRes.status + ') — probeer het later opnieuw.');
    const geo = await geoRes.json();
    const feat = geo.features && geo.features[0];
    if (!feat || feat.properties.lat == null) {
      throw new Error('Niets gevonden voor “' + tekst + '”. Pas de campingnaam aan via ✎ en zoek opnieuw.');
    }
    const lat = feat.properties.lat;
    const lon = feat.properties.lon;
    const groepen = await Promise.all(OMGEVING_GROEPEN.map(async (g) => {
      const res = await fetch('https://api.geoapify.com/v2/places?categories=' + g.categories +
        '&filter=circle:' + lon + ',' + lat + ',' + GEOAPIFY_RADIUS_M +
        '&bias=proximity:' + lon + ',' + lat + '&limit=20&lang=nl&apiKey=' + GEOAPIFY_KEY);
      if (!res.ok) throw new Error('Omgeving ophalen mislukt (HTTP ' + res.status + ') — probeer het later opnieuw.');
      const data = await res.json();
      return {
        titel: g.titel,
        items: (data.features || [])
          .filter((f) => f.properties && f.properties.name)
          .filter((f) => !g.zonder || !(f.properties.categories || []).some((c) => c.indexOf(g.zonder) === 0))
          .map((f) => ({
            naam: f.properties.name,
            afstandM: Math.round(f.properties.distance || 0),
            lat: f.properties.lat,
            lon: f.properties.lon,
          })),
      };
    }));
    t.omgeving = { lat, lon, adres: feat.properties.formatted || tekst, datum: todayISO(), groepen };
    ui.omgevingOpen = new Set();
    save();
  } catch (e) {
    ui.omgevingError = (e && e.message) ? e.message : 'Onbekende fout. Controleer je internetverbinding.';
  } finally {
    ui.omgevingBusy = false;
    render();
  }
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
  main.querySelectorAll('[data-meer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const titel = btn.dataset.meer;
      if (ui.omgevingOpen.has(titel)) ui.omgevingOpen.delete(titel);
      else ui.omgevingOpen.add(titel);
      render();
    });
  });
  const omgevingBtn = main.querySelector('#zoek-omgeving');
  if (omgevingBtn) omgevingBtn.addEventListener('click', () => zoekOmgeving(t));
  main.querySelectorAll('[data-meal-dag]').forEach((el) => {
    el.addEventListener('click', () => openMealSheet(t, el.dataset.mealDag, el.dataset.mealSlot));
  });
  bindOnderweg(main, t);
  const rolAlles = main.querySelector('#rol-alles');
  if (rolAlles) rolAlles.addEventListener('click', () => rolMaaltijden(t, kookEntries(t)));
  laadWeer(t);
}

/* ============================== boodschappenlijsten ============================== */
function shopItemKg(it) {
  // hoeveelheid die een kaal aantal is ("2") telt als multiplier; "500 g" e.d. niet
  const m = String(it.hoeveelheid || '').trim().match(/^(\d{1,3})$/);
  const mult = m ? parseInt(m[1], 10) : 1;
  return ((Number(it.gewichtG) || 0) / 1000) * mult;
}

function shoplistKg(l) {
  return (l.items || []).reduce((s, it) => s + shopItemKg(it), 0);
}

function shoplistsTotalKg() {
  return (state.shoplists || []).reduce((s, l) => s + shoplistKg(l), 0);
}

function nieuwShopItem(naam, hoeveelheid) {
  const grams = schatGewicht(naam);
  return {
    id: uid(),
    naam,
    hoeveelheid: hoeveelheid || '',
    gewichtG: grams != null ? grams : 0,
    geschat: grams != null,
    done: false,
  };
}

function renderShoplist(l) {
  const items = l.items || [];
  const af = items.filter((it) => it.done);
  const openItems = items.filter((it) => !it.done);
  const kg = shoplistKg(l);
  const row = (it) =>
    '<div class="shop-item' + (it.done ? ' done' : '') + '">' +
      '<span class="checkbox" data-shop-toggle="' + l.id + ':' + it.id + '">' + CHECK_SVG + '</span>' +
      '<span class="label" data-shop-toggle="' + l.id + ':' + it.id + '">' + esc(it.naam) +
        (it.hoeveelheid ? ' <span class="muted mono">' + esc(it.hoeveelheid) + '</span>' : '') + '</span>' +
      ((Number(it.gewichtG) || 0) > 0
        ? '<span class="mono shop-kg' + (it.geschat ? ' w-est' : '') + '">' + (it.geschat ? '~' : '') + fmtKg(it.gewichtG / 1000) + ' kg</span>'
        : '') +
      '<button class="icon-btn" data-shop-rm="' + l.id + ':' + it.id + '" aria-label="Verwijderen">✕</button>' +
    '</div>';
  const secId = 'shop:' + l.id;
  const secDef = items.length > 0 && af.length === items.length; // alles afgevinkt → dicht
  let html = secHead(secId, secDef,
    esc(l.name) + ' <span class="mono" style="text-transform:none;letter-spacing:0">' + af.length + ' van ' + items.length +
      (kg > 0 ? ' · ~' + fmtKg(kg) + ' kg' : '') + '</span>',
    '<button class="icon-btn" data-shop-dellist="' + l.id + '" aria-label="Lijst verwijderen">✕</button>');
  if (isCollapsed(secId, secDef)) return html;
  html += '<div class="card" style="padding:0">';
  if (!items.length) {
    html += '<div class="poi-item muted">Nog leeg — voeg hieronder iets toe.</div>';
  }
  // afgevinkte items zakken automatisch naar onderen (gedimd)
  html += openItems.map(row).join('') + af.map(row).join('');
  html += '<form class="add-step" data-shop-add="' + l.id + '">' +
    '<input name="naam" placeholder="Item toevoegen…" autocomplete="off" required>' +
    '<input name="hoeveelheid" class="shop-qty" placeholder="aantal" autocomplete="off">' +
    '<button class="btn small" type="submit">+</button></form></div>';
  html += '<div class="shop-actions">' +
    '<button class="btn small secondary" data-shop-clear="' + l.id + '">Wis afgevinkte</button>' +
    '<button class="btn small secondary" data-shop-savestd="' + l.id + '">Bewaar als standaard</button>' +
    ((l.standard && l.standard.length)
      ? '<button class="btn small secondary" data-shop-resetstd="' + l.id + '">Reset naar standaard</button>'
      : '') +
  '</div>';
  return html;
}

function renderBoodschappen() {
  let html = '<div class="list-head"><span class="section-label">Boodschappenlijsten</span>' +
    '<button class="btn small" id="shop-new">+ Nieuwe lijst</button></div>';
  if (!state.shoplists.length) {
    html += '<div class="card muted" style="margin-bottom:4px">Nog geen boodschappenlijst. ' +
      'Afvinken in de winkel is live te zien op het andere toestel.</div>';
  }
  html += state.shoplists.map(renderShoplist).join('');
  return html;
}

function openShoplistSheet(onCreated) {
  openSheet(
    '<h2>Nieuwe boodschappenlijst</h2>' +
    '<form id="shoplist-form">' +
      '<label class="field"><span>Naam</span><input name="name" required value="Boodschappen" autocomplete="off"></label>' +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn secondary" id="shoplist-cancel">Annuleren</button>' +
        '<button type="submit" class="btn">Aanmaken</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('shoplist-cancel').addEventListener('click', closeSheet);
  document.getElementById('shoplist-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = String(new FormData(e.target).get('name') || '').trim() || 'Boodschappen';
    const l = { id: uid(), name, items: [], standard: [] };
    state.shoplists.push(l);
    save(); closeSheet(); render();
    if (typeof onCreated === 'function') onCreated(l);
  });
}

function bindBoodschappen(main) {
  const byId = (id) => state.shoplists.find((l) => l.id === id);
  const nieuw = main.querySelector('#shop-new');
  if (nieuw) nieuw.addEventListener('click', () => openShoplistSheet());
  main.querySelectorAll('[data-shop-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const [lid, iid] = el.dataset.shopToggle.split(':');
      const l = byId(lid); if (!l) return;
      const it = l.items.find((x) => x.id === iid);
      if (it) { it.done = !it.done; save(); render(); }
    });
  });
  main.querySelectorAll('[data-shop-rm]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [lid, iid] = btn.dataset.shopRm.split(':');
      const l = byId(lid); if (!l) return;
      l.items = l.items.filter((x) => x.id !== iid);
      save(); render();
    });
  });
  main.querySelectorAll('[data-shop-dellist]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = byId(btn.dataset.shopDellist); if (!l) return;
      state.shoplists = state.shoplists.filter((x) => x.id !== l.id);
      save(); render();
      toast('Lijst “' + l.name + '” verwijderd');
    });
  });
  main.querySelectorAll('[data-shop-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = byId(btn.dataset.shopClear); if (!l) return;
      const n = l.items.filter((x) => x.done).length;
      if (!n) { toast('Er is niets afgevinkt.'); return; }
      l.items = l.items.filter((x) => !x.done);
      save(); render();
      toast(n + ' afgevinkte regel' + (n === 1 ? '' : 's') + ' gewist');
    });
  });
  main.querySelectorAll('[data-shop-savestd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = byId(btn.dataset.shopSavestd); if (!l) return;
      l.standard = (l.items || []).map((it) => ({
        naam: it.naam, hoeveelheid: it.hoeveelheid || '',
        gewichtG: Number(it.gewichtG) || 0, geschat: !!it.geschat,
      }));
      save(); render();
      toast('Standaardlijst bewaard (' + l.standard.length + ' items)');
    });
  });
  main.querySelectorAll('[data-shop-resetstd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = byId(btn.dataset.shopResetstd); if (!l || !l.standard || !l.standard.length) return;
      l.items = l.standard.map((s) => Object.assign({ id: uid(), done: false }, s));
      save(); render();
      toast('Hersteld naar standaard (' + l.items.length + ' items)');
    });
  });
  main.querySelectorAll('form[data-shop-add]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const l = byId(form.dataset.shopAdd); if (!l) return;
      const naam = form.elements.naam.value.trim();
      if (!naam) return;
      if (!Array.isArray(l.items)) l.items = [];
      l.items.push(nieuwShopItem(naam, form.elements.hoeveelheid.value.trim()));
      save(); render();
    });
  });
}

/* ============================== lijsten ============================== */
function lijstenSecties() {
  const secs = state.shoplists.map((l) => ({
    id: 'shop:' + l.id,
    def: (l.items || []).length > 0 && l.items.every((it) => it.done),
  }));
  for (const key of ['vertrek', 'aankomst', 'inpaklijst']) {
    const s = checklistSec(key);
    secs.push({ id: s.id, def: s.def });
  }
  return secs;
}

function renderLijsten() {
  const secs = lijstenSecties();
  const anyOpen = secs.some((s) => !isCollapsed(s.id, s.def));
  return '<div class="collapse-all-row"><button class="btn small secondary" id="collapse-all">' +
      (anyOpen ? 'Alles inklappen' : 'Alles uitklappen') + '</button></div>' +
    renderBoodschappen() +
    renderChecklist('vertrek', 'Vertrek') + renderChecklist('aankomst', 'Aankomst') +
    renderChecklist('inpaklijst', 'Inpaklijst');
}

function checklistSec(key) {
  const list = state.checklists[key];
  const done = list.filter((s) => s.done).length;
  // afgeronde lijsten starten ingeklapt, onafgemaakte open
  return { id: 'chk:' + key, def: list.length > 0 && done === list.length, done, total: list.length };
}

function renderChecklist(key, title) {
  const list = state.checklists[key];
  const sec = checklistSec(key);
  let html = secHead(sec.id, sec.def,
    esc(title) + ' <span class="mono" style="text-transform:none;letter-spacing:0">' + sec.done + '/' + sec.total + '</span>',
    '<button class="btn small secondary" data-reset="' + key + '">Reset</button>');
  if (isCollapsed(sec.id, sec.def)) return html;
  html += '<div class="card" style="padding:0">';
  let prevGroup = null;
  html += list.map((s) =>
    (s.group && s.group !== prevGroup ? '<div class="check-group">' + esc(prevGroup = s.group) + '</div>' : '') +
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
  bindBoodschappen(main);
  const allBtn = main.querySelector('#collapse-all');
  if (allBtn) {
    allBtn.addEventListener('click', () => {
      const secs = lijstenSecties();
      const anyOpen = secs.some((s) => !isCollapsed(s.id, s.def));
      for (const s of secs) collapsedMap[s.id] = anyOpen;
      saveCollapsed();
      render();
    });
  }
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
    '<div class="section-label">Koppeling</div>' +
    '<div class="card">' +
      '<p class="muted" style="margin-top:0">Beide telefoons met dezelfde huishoud-code zien en bewerken dezelfde data.</p>' +
      '<label class="field"><span>Code van dit toestel</span>' +
        '<div class="code-row"><input id="own-code" class="mono" readonly value="' + esc(householdCode()) + '">' +
        '<button class="btn small secondary" id="btn-copy-code">Kopieer code</button></div></label>' +
      '<label class="field"><span>Plak code van het andere toestel</span>' +
        '<div class="code-row"><input id="join-code" class="mono" placeholder="bv. 3fa9c1d27e80b465" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<button class="btn small" id="btn-join">Koppel</button></div></label>' +
      '<p class="muted mono" style="margin-bottom:0">Sync: ' + esc(syncInfo.status) +
        (syncInfo.detail ? ' — ' + esc(syncInfo.detail) : '') + '</p>' +
    '</div>' +
    '<div class="section-label">Gewichtsschatting (optioneel, AI)</div>' +
    '<div class="card">' +
      '<p class="muted" style="margin-top:0">Onbekende items (geen match in de gewichtstabel) mogen via Claude geschat worden. ' +
        'Zonder key of internet wordt dit stil overgeslagen. De key blijft alleen op dit toestel — nooit gesynct of geëxporteerd.</p>' +
      '<label class="field"><span>Anthropic API-key</span>' +
        '<input id="set-anthropic" type="password" placeholder="sk-ant-…" autocomplete="off" value="' + esc(getAnthropicKey()) + '"></label>' +
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
    '<p class="muted" style="text-align:center">Camper Compagnon v1.2.1 · gedeeld via huishoud-code, offline blijft alles werken</p>';
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
  main.querySelector('#set-anthropic').addEventListener('change', (e) => {
    setAnthropicKey(e.target.value.trim());
    toast(e.target.value.trim() ? 'API-key lokaal opgeslagen' : 'API-key verwijderd');
  });
  main.querySelector('#btn-copy-code').addEventListener('click', async () => {
    const code = householdCode();
    try {
      await navigator.clipboard.writeText(code);
      toast('Code gekopieerd — plak hem op het andere toestel');
    } catch (e) {
      const input = main.querySelector('#own-code');
      input.select();
      try { document.execCommand('copy'); toast('Code gekopieerd'); } catch (e2) { toast('Kopiëren mislukt — selecteer de code handmatig.'); }
    }
  });
  main.querySelector('#btn-join').addEventListener('click', () => {
    const raw = main.querySelector('#join-code').value.trim().toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(raw)) {
      toast('Dat lijkt geen geldige code — verwacht 16 tekens (0-9, a-f).');
      return;
    }
    if (raw === householdCode()) { toast('Dit toestel gebruikt deze code al.'); return; }
    koppelHousehold(raw);
    render();
    toast('Gekoppeld! Data wordt nu gedeeld via dit huishouden.');
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
          inpaklijst: Array.isArray(parsed.checklists && parsed.checklists.inpaklijst) ? parsed.checklists.inpaklijst : d.checklists.inpaklijst,
        },
        shoplists: Array.isArray(parsed.shoplists) ? parsed.shoplists : [],
        recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
        settings: Object.assign({}, d.settings, parsed.settings || {}),
      };
      save(); render();
      toast('Import gelukt — alle data vervangen');
    } catch (e) {
      toast('Import mislukt: ' + (e.message || 'ongeldige JSON'));
    }
  });
}

/* ============================== camper ==============================
   Specs en waterpas-ijking staan in een eigen key-prefix (camper:spec / camper:level),
   los van het hoofdschema (camper:v1) en bewust NIET gesynct. */
const CAMPER_SPEC_KEY = 'camper:spec:v1';

const CAMPER_SPECS = [
  { key: 'onderstel',      label: 'Onderstel',          def: 'Fiat Ducato 2.3 Multijet', wide: true },
  { key: 'brandstof',      label: 'Brandstof',          def: 'Diesel (Euro 6)' },
  { key: 'transmissie',    label: 'Transmissie',        def: 'Automaat' },
  { key: 'vermogen',       label: 'Vermogen',           def: '150 pk' },
  { key: 'lengte',         label: 'Lengte',             def: '7,49 m' },
  { key: 'breedte',        label: 'Breedte',            def: '2,30 m' },
  { key: 'hoogte',         label: 'Hoogte',             def: '2,90 m' },
  { key: 'mtm',            label: 'Max. massa (MTM)',   def: '3.500 kg' },
  { key: 'leeggewicht',    label: 'Leeggewicht',        def: '3.184 kg' },
  { key: 'rijklaar',       label: 'Rijklaar gewicht',   def: '3.285 kg' },
  { key: 'bandenspanning', label: 'Bandenspanning',     def: '5,0 bar' },
  { key: 'verswater',      label: 'Verswatertank',      def: '', placeholder: 'Instelbaar — L' },
  { key: 'afvalwater',     label: 'Afvalwatertank',     def: '', placeholder: 'Instelbaar — L' },
];

function loadCamperSpec() {
  try { return JSON.parse(localStorage.getItem(CAMPER_SPEC_KEY)) || {}; } catch (e) { return {}; }
}
function saveCamperSpec(obj) {
  try { localStorage.setItem(CAMPER_SPEC_KEY, JSON.stringify(obj)); }
  catch (e) { toast('Opslaan mislukt — opslag vol of geblokkeerd.'); }
}

function renderCamper() {
  const sub = ui.camperSub === 'waterpas' ? 'waterpas' : 'gegevens';
  let html = '<div class="subtabs">' +
    '<button data-csub="gegevens" class="' + (sub === 'gegevens' ? 'active' : '') + '">Gegevens</button>' +
    '<button data-csub="waterpas" class="' + (sub === 'waterpas' ? 'active' : '') + '">Waterpas</button>' +
  '</div>';
  html += sub === 'waterpas' ? renderCamperWaterpas() : renderCamperGegevens();
  return html;
}

function renderCamperGegevens() {
  const stored = loadCamperSpec();
  let html = '<div class="camper-hero">' +
    '<div class="ch-kicker">Notin Progress</div>' +
    '<div class="ch-title">Sevilla · 2017</div>' +
    '<div class="ch-plate">HTP-56-F</div>' +
  '</div>';
  html += '<div class="section-label">Specificaties</div>';
  html += '<div class="card spec-grid">';
  for (const sp of CAMPER_SPECS) {
    const has = Object.prototype.hasOwnProperty.call(stored, sp.key);
    const val = has ? stored[sp.key] : sp.def;
    const empty = !val;
    html += '<label class="field spec-field' + (sp.wide ? ' spec-wide' : '') + (empty ? ' spec-empty' : '') + '">' +
      '<span>' + esc(sp.label) + '</span>' +
      '<input type="text" data-spec="' + esc(sp.key) + '" value="' + esc(val) + '" ' +
        'placeholder="' + esc(sp.placeholder || 'Instelbaar') + '" autocomplete="off"></label>';
  }
  html += '</div>';
  html += '<p class="muted" style="text-align:center">Tik op een veld om het aan te passen — wordt lokaal bewaard.</p>';
  return html;
}

function renderCamperWaterpas() {
  return '<div class="card level-card">' +
    '<div class="level-circle" id="level-circle">' +
      '<span class="level-cross-h"></span><span class="level-cross-v"></span>' +
      '<span class="level-ring"></span>' +
      '<span class="level-bubble" id="level-bubble"></span>' +
    '</div>' +
    '<div class="level-readout">' +
      '<div class="lr-item"><span class="lr-label">Voor / achter</span><span class="lr-val mono" id="level-pitch">–</span></div>' +
      '<div class="lr-item"><span class="lr-label">Links / rechts</span><span class="lr-val mono" id="level-roll">–</span></div>' +
    '</div>' +
    '<div id="level-error" class="alert danger" hidden></div>' +
    '<button class="btn block" id="level-activate">Activeer waterpas</button>' +
    '<button class="btn block secondary" id="level-calibrate" hidden>Kalibreer — huidige stand = nul</button>' +
    '<p class="muted level-disclaimer">Indicatie op basis van de telefoonsensor — geen precisie-instrument.</p>' +
  '</div>';
}

/* ---------- waterpas: state & sensorlogica ---------- */
const LEVEL_OFFSET_KEY = 'camper:level:offset';
let levelOffset = (() => {
  try { return JSON.parse(localStorage.getItem(LEVEL_OFFSET_KEY)) || { beta: 0, gamma: 0 }; }
  catch (e) { return { beta: 0, gamma: 0 }; }
})();
let lastWasLevel = false;
let levelActive = false;
let lastBeta = 0, lastGamma = 0;

// per sensor-update
function onOrientation(ev) {
  if (ev.beta == null || ev.gamma == null) return;
  lastBeta = ev.beta;
  lastGamma = ev.gamma;
  const pitch = ev.beta  - levelOffset.beta;   // voor/achter
  const roll  = ev.gamma - levelOffset.gamma;  // links/rechts
  renderLevel(pitch, roll);

  // haptiek wanneer binnen ±0,5° van nul (alleen op overgang, niet continu)
  const isLevel = Math.abs(pitch) <= 0.5 && Math.abs(roll) <= 0.5;
  if (isLevel && !lastWasLevel && navigator.vibrate) navigator.vibrate(40);
  lastWasLevel = isLevel;
}

// bubble-positie: clamp ±10° → straal in px
function renderLevel(pitch, roll) {
  const bubble = document.getElementById('level-bubble');
  if (!bubble) return; // weergave niet (meer) zichtbaar
  const R = 44; // px, straal van de cirkel
  const clamp = (v) => Math.max(-10, Math.min(10, v)) / 10;
  const x = clamp(roll)  * R;   // bubble naar de hoge zijde
  const y = clamp(pitch) * R;
  bubble.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';

  const isLevel = Math.abs(pitch) <= 0.5 && Math.abs(roll) <= 0.5;
  const circle = document.getElementById('level-circle');
  if (circle) circle.classList.toggle('is-level', isLevel);
  const pe = document.getElementById('level-pitch');
  const re = document.getElementById('level-roll');
  if (pe) pe.textContent = pitch.toFixed(1).replace('.', ',') + '°';
  if (re) re.textContent = roll.toFixed(1).replace('.', ',') + '°';
}

// iOS 13+ vraagt expliciet toestemming, alleen vanuit een tik
async function activateLevel() {
  if (typeof DeviceOrientationEvent === 'undefined') {
    showLevelError('Bewegingssensor niet beschikbaar op dit toestel.');
    return;
  }
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') { showLevelError('Toegang tot bewegingssensor geweigerd.'); return; }
    } catch (e) { showLevelError('Sensor niet beschikbaar.'); return; }
  }
  if (!levelActive) {
    window.addEventListener('deviceorientation', onOrientation, true);
    levelActive = true;
  }
  const err = document.getElementById('level-error');
  if (err) err.hidden = true;
  updateLevelButtons();
}

function stopLevel() {
  if (!levelActive) return;
  window.removeEventListener('deviceorientation', onOrientation, true);
  levelActive = false;
  lastWasLevel = false;
}

function showLevelError(msg) {
  const el = document.getElementById('level-error');
  if (el) { el.textContent = msg; el.hidden = false; }
}

function updateLevelButtons() {
  const act = document.getElementById('level-activate');
  const cal = document.getElementById('level-calibrate');
  if (act) act.hidden = levelActive;
  if (cal) cal.hidden = !levelActive;
}

// kalibreren: huidige stand = nul
function calibrateLevel(currentBeta, currentGamma) {
  levelOffset = { beta: currentBeta, gamma: currentGamma };
  try { localStorage.setItem(LEVEL_OFFSET_KEY, JSON.stringify(levelOffset)); } catch (e) { /* oké */ }
}

function bindCamper(main) {
  main.querySelectorAll('[data-csub]').forEach((btn) => {
    btn.addEventListener('click', () => { ui.camperSub = btn.dataset.csub; render(); });
  });

  if (ui.camperSub === 'waterpas') {
    updateLevelButtons();
    // listener nog actief uit eerdere render? toon meteen de laatste stand
    if (levelActive) renderLevel(lastBeta - levelOffset.beta, lastGamma - levelOffset.gamma);
    const act = main.querySelector('#level-activate');
    if (act) act.addEventListener('click', activateLevel);
    const cal = main.querySelector('#level-calibrate');
    if (cal) cal.addEventListener('click', () => {
      calibrateLevel(lastBeta, lastGamma);
      lastWasLevel = false;
      renderLevel(lastBeta - levelOffset.beta, lastGamma - levelOffset.gamma);
      toast('Waterpas gekalibreerd — huidige stand is nu nul');
    });
    return;
  }

  main.querySelectorAll('input[data-spec]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const stored = loadCamperSpec();
      stored[inp.dataset.spec] = inp.value.trim();
      saveCamperSpec(stored);
      const field = inp.closest('.spec-field');
      if (field) field.classList.toggle('spec-empty', !inp.value.trim());
    });
  });
}

/* ============================== weer (Open-Meteo) ============================== */
const WEER_CACHE_PREFIX = 'camper:weer:';
const WEER_CACHE_TTL_MS = 3600000; // 1 uur

const WEERCODE = {
  0:  ['☀️', 'Helder'],
  1:  ['🌤️', 'Overwegend helder'],
  2:  ['⛅', 'Deels bewolkt'],
  3:  ['☁️', 'Bewolkt'],
  45: ['🌫️', 'Mist'],
  48: ['🌫️', 'Rijpige mist'],
  51: ['🌦️', 'Lichte motregen'],
  53: ['🌦️', 'Motregen'],
  55: ['🌧️', 'Dichte motregen'],
  61: ['🌧️', 'Lichte regen'],
  63: ['🌧️', 'Regen'],
  65: ['🌧️', 'Zware regen'],
  71: ['🌨️', 'Lichte sneeuw'],
  73: ['🌨️', 'Sneeuw'],
  75: ['❄️', 'Zware sneeuw'],
  77: ['🌨️', 'Sneeuwkorrels'],
  80: ['🌦️', 'Buien'],
  81: ['🌧️', 'Stevige buien'],
  82: ['🌧️', 'Zware buien'],
  85: ['🌨️', 'Sneeuwbuien'],
  86: ['❄️', 'Zware sneeuwbuien'],
  95: ['⛈️', 'Onweer'],
  96: ['⛈️', 'Onweer met hagel'],
  99: ['⛈️', 'Zware hagel'],
};

function weerCacheKey(lat, lon) {
  return WEER_CACHE_PREFIX + Number(lat).toFixed(2) + ':' + Number(lon).toFixed(2);
}

function leesWeerCache(lat, lon) {
  try {
    const raw = localStorage.getItem(weerCacheKey(lat, lon));
    if (!raw) return null;
    const e = JSON.parse(raw);
    return (e && e.ts && Array.isArray(e.days)) ? e : null;
  } catch (_) { return null; }
}

function schrijfWeerCache(lat, lon, days) {
  try { localStorage.setItem(weerCacheKey(lat, lon), JSON.stringify({ ts: Date.now(), days })); }
  catch (_) { /* opslag vol */ }
}

function weerVensterDagen() {
  const today = todayISO();
  const out = [];
  const d = new Date(today + 'T12:00:00');
  for (let i = 0; i < 10; i++) {
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const weerBezig = new Set();
const weerMislukt = new Set();

function renderWeer(t) {
  const lat = t.omgeving && t.omgeving.lat != null ? t.omgeving.lat : null;
  const lon = t.omgeving && t.omgeving.lon != null ? t.omgeving.lon : null;

  if (lat == null || lon == null) {
    return '<div class="weer-blok"><span class="muted" style="font-size:0.83rem">Geen locatie bekend voor deze reis.</span></div>';
  }

  const venster = weerVensterDagen();

  const key = weerCacheKey(lat, lon);
  const cache = leesWeerCache(lat, lon);

  if (!cache) {
    return weerMislukt.has(key)
      ? '<div class="weer-blok"><span class="muted" style="font-size:0.83rem">Weer nu niet beschikbaar</span></div>'
      : '<div class="weer-blok"><span class="muted" style="font-size:0.83rem">Weer ophalen…</span></div>';
  }

  const tegels = venster.map((iso) => {
    const d = cache.days.find((x) => x.iso === iso);
    if (!d) return '';
    const wc = WEERCODE[d.weercode] || ['🌡️', 'Onbekend'];
    const dagLabel = new Date(iso + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' });
    const maxT = d.maxTemp != null ? Math.round(d.maxTemp) + '°' : '—';
    const minT = d.minTemp != null ? Math.round(d.minTemp) + '°' : '—';
    const neerslag = d.neerslagKans != null ? d.neerslagKans + '%' : '';
    return '<div class="weer-tegel" title="' + esc(wc[1]) + '">' +
      '<div class="wt-dag">' + esc(dagLabel) + '</div>' +
      '<div class="wt-icoon">' + wc[0] + '</div>' +
      '<div class="wt-temp"><span class="wt-max">' + maxT + '</span><span class="wt-min">' + minT + '</span></div>' +
      (neerslag ? '<div class="wt-neerslag">' + neerslag + '</div>' : '') +
    '</div>';
  }).filter(Boolean).join('');

  if (!tegels) {
    return '<div class="weer-blok"><span class="muted" style="font-size:0.83rem">Geen weerdata beschikbaar voor deze periode.</span></div>';
  }

  const stale = (Date.now() - cache.ts) > WEER_CACHE_TTL_MS;
  return '<div class="weer-blok">' +
    (stale ? '<div class="weer-bijgewerkt">bijgewerkt om ' + new Date(cache.ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) + '</div>' : '') +
    '<div class="weer-rij">' + tegels + '</div>' +
  '</div>';
}

async function laadWeer(t) {
  const lat = t.omgeving && t.omgeving.lat != null ? t.omgeving.lat : null;
  const lon = t.omgeving && t.omgeving.lon != null ? t.omgeving.lon : null;
  if (lat == null || lon == null) return;

  const key = weerCacheKey(lat, lon);
  const cache = leesWeerCache(lat, lon);
  if (cache && (Date.now() - cache.ts) < WEER_CACHE_TTL_MS) return;
  if (weerBezig.has(key)) return;
  if (weerMislukt.has(key)) return;

  weerBezig.add(key);
  try {
    const url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + lat + '&longitude=' + lon +
      '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=auto&forecast_days=10&wind_speed_unit=kmh';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const d = json.daily;
    if (!d || !Array.isArray(d.time)) throw new Error('Ongeldige respons');
    const days = d.time.map((iso, i) => ({
      iso,
      weercode: d.weathercode ? d.weathercode[i] : null,
      maxTemp: d.temperature_2m_max ? d.temperature_2m_max[i] : null,
      minTemp: d.temperature_2m_min ? d.temperature_2m_min[i] : null,
      neerslagKans: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
    }));
    schrijfWeerCache(lat, lon, days);
  } catch (_) {
    if (!leesWeerCache(lat, lon)) weerMislukt.add(key);
  } finally {
    weerBezig.delete(key);
    if (ui.tab === 'reizen' && ui.tripView && ui.tripView.id === t.id) render();
  }
}

/* ============================== router & render ============================== */
const TITLES = {
  voorraad: 'Voorraad', wensen: 'Wensen', reizen: 'Reizen',
  lijsten: 'Lijsten', camper: 'Camper', instellingen: 'Instellingen',
};

function render() {
  const main = document.getElementById('main');
  document.getElementById('screen-title').textContent =
    ui.tab === 'reizen' && ui.tripView ? 'Reis' : TITLES[ui.tab];

  // sensor stilzetten zodra we de waterpas-weergave verlaten
  if (!(ui.tab === 'camper' && ui.camperSub === 'waterpas')) stopLevel();

  let html = '';
  switch (ui.tab) {
    case 'voorraad': html = renderVoorraad(); break;
    case 'wensen': html = renderWensen(); break;
    case 'reizen': html = renderReizen(); break;
    case 'lijsten': html = renderLijsten(); break;
    case 'camper': html = renderCamper(); break;
    case 'instellingen': html = renderInstellingen(); break;
  }
  main.innerHTML = html;

  switch (ui.tab) {
    case 'voorraad': bindVoorraad(main); break;
    case 'wensen': bindWensen(main); break;
    case 'reizen': bindReizen(main); break;
    case 'lijsten': bindLijsten(main); break;
    case 'camper': bindCamper(main); break;
    case 'instellingen': bindInstellingen(main); break;
  }

  // inklapbare sectie-koppen (Lijsten, Eten, Onderweg)
  main.querySelectorAll('.sec-toggle').forEach((btn) => {
    btn.addEventListener('click', () => toggleCollapsed(btn.dataset.sec, btn.dataset.secdef === '1'));
  });

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

/* ---------- service worker + update-melding ---------- */
// Geen automatische harde reload (je kunt midden in het invullen zitten):
// zodra een nieuwe SW actief is, verschijnt een tapbare melding.
let updateBannerShown = false;

function showUpdateBanner() {
  if (updateBannerShown) return;
  updateBannerShown = true;
  const el = document.createElement('button');
  el.id = 'update-banner';
  el.className = 'update-banner';
  el.textContent = 'Nieuwe versie beschikbaar — tik om te vernieuwen';
  el.addEventListener('click', () => window.location.reload());
  document.body.appendChild(el);
  // geen requestAnimationFrame: die staat stil zolang de pagina niet zichtbaar is
  setTimeout(() => el.classList.add('show'), 30);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      // Melding pas als de nieuwe SW de pagina écht overgenomen heeft
      // (controllerchange = geactiveerd ÉN geclaimd) — eerder herladen zou de
      // oude cache nog een keer serveren. De allereerste claim (verse
      // installatie) telt niet; elke wissel daarna is een echte update.
      let wasControlled = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (wasControlled) showUpdateBanner();
        wasControlled = true;
      });
      // check op updates wanneer de app weer naar voren komt
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => { /* offline */ });
      });
    } catch (e) { /* offline blijft werken zonder */ }
  });
}

initSync();
