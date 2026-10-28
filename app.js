(() => {
'use strict';

/* =====================================================================
 * 工具
 * ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const raf = () => new Promise(r => requestAnimationFrame(() => r()));

function fmtDur(s) {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
function fmtSize(b) {
  if (!b && b !== 0) return '—';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}
const dMD = new Intl.DateTimeFormat('zh-Hant', { month: 'long', day: 'numeric', weekday: 'short' });
const dYMD = new Intl.DateTimeFormat('zh-Hant', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const dT = new Intl.DateTimeFormat('zh-Hant', { hour: '2-digit', minute: '2-digit', hour12: false });
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function dayLabel(ts) {
  const d = new Date(ts), now = new Date();
  const k = dayKey(ts);
  if (k === dayKey(now.getTime())) return '今天';
  if (k === dayKey(now.getTime() - 864e5)) return '昨天';
  return (d.getFullYear() === now.getFullYear() ? dMD : dYMD).format(d);
}

const IC = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4M5 12v8h14v-8"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.6C1.5 6.800 4 4 7.100 4c1.900 0 3.300 1 4.900 2.800C13.600 5 15 4 16.900 4 20 4 22.500 6.800 21.300 10.400 19.500 15.400 12 20 12 20z"/>',
  photos: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  albums: '<rect x="4" y="9" width="16" height="11" rx="3"/><path d="M7 6h10M9 3h6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M18.700 5.300l-2.100 2.100M7.400 16.600l-2.100 2.100"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  more: '<circle cx="5" cy="12" r="1.600" fill="currentColor"/><circle cx="12" cy="12" r="1.600" fill="currentColor"/><circle cx="19" cy="12" r="1.600" fill="currentColor"/>',
  minus: '<path d="M5 12h14"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.500 13.500h5"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.500v5l4.500-2.500z" fill="currentColor"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.600"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

/* =====================================================================
 * 小型 UI：Toast / 選單 / 對話框 / 進度
 * ===================================================================== */
let toastT;
function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}

function sheet(title, opts) {
  return new Promise(res => {
    const root = $('#sheet');
    root.innerHTML = `<div class="sheet-bg"></div><div class="sheet-card"><div class="sheet-group">${title ? `<div class="sheet-title">${esc(title)}</div>` : ''}${opts.map((o, i) => `<button class="sheet-btn ${o.destructive ? 'danger' : ''}" data-i="${i}">${esc(o.label)}</button>`).join('')}</div><button class="sheet-btn cancel" data-i="-1">取消</button></div>`;
    root.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    const close = v => { root.classList.remove('open'); setTimeout(() => { root.hidden = true; root.innerHTML = ''; }, 280); res(v); };
    root.onclick = e => {
      const b = e.target.closest('[data-i]');
      if (b) { const i = +b.dataset.i; close(i >= 0 ? opts[i].value : null); }
      else if (e.target.classList.contains('sheet-bg')) close(null);
    };
  });
}

function dialog(html, { input = null, ok = '好', cancel = true } = {}) {
  return new Promise(res => {
    const root = $('#dialog');
    root.innerHTML = `<div class="dlg-bg"></div><form class="dlg-card">${html}${input !== null ? `<input class="dlg-input" maxlength="40" value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}" autocomplete="off">` : ''}<div class="dlg-btns">${cancel ? '<button type="button" data-a="cancel">取消</button>' : ''}<button type="submit">${esc(ok)}</button></div></form>`;
    root.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    const inp = $('input', root);
    if (inp) setTimeout(() => { inp.focus(); inp.select(); }, 80);
    const close = v => { root.classList.remove('open'); setTimeout(() => { root.hidden = true; root.innerHTML = ''; }, 240); res(v); };
    $('form', root).onsubmit = e => { e.preventDefault(); close(inp ? (inp.value.trim() || null) : true); };
    root.onclick = e => { if (e.target.dataset.a === 'cancel' || e.target.classList.contains('dlg-bg')) close(inp ? null : false); };
  });
}
const askText = (title, value = '', placeholder = '') => dialog(`<h3>${esc(title)}</h3>`, { input: { value, placeholder } });

const Progress = {
  show(t) { $('#progress').hidden = false; this.set(t, 0); },
  set(t, f) { $('#pg-text').textContent = t; $('#pg-fill').style.width = `${Math.round(clamp(f, 0, 1) * 100)}%`; },
  hide() { $('#progress').hidden = true; },
};

/* =====================================================================
 * 資料庫（IndexedDB）
 *   items  : 每個項目的資訊 + 縮圖
 *   blobs  : 原始檔案（單獨存放，列表載入時不用讀大檔）
 *   albums : 自建相簿
 *   meta   : 手勢鎖雜湊等
 * ===================================================================== */
const DBNAME = 'photovault';
const DB = (() => {
  let db;
  const wrap = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort')); });
  const tx = (s, m = 'readonly') => db.transaction(s, m);
  return {
    open() {
      return new Promise((res, rej) => {
        const r = indexedDB.open(DBNAME, 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          d.createObjectStore('items', { keyPath: 'id' });
          d.createObjectStore('blobs');
          d.createObjectStore('albums', { keyPath: 'id' });
          d.createObjectStore('meta');
        };
        r.onsuccess = () => { db = r.result; res(); };
        r.onerror = () => rej(r.error);
      });
    },
    getAll: s => wrap(tx(s).objectStore(s).getAll()),
    get: (s, k) => wrap(tx(s).objectStore(s).get(k)),
    put: (s, v, k) => { const t = tx(s, 'readwrite'); t.objectStore(s).put(v, k); return done(t); },
    del: (s, k) => { const t = tx(s, 'readwrite'); t.objectStore(s).delete(k); return done(t); },
    putItem(meta, blob) {
      const t = tx(['items', 'blobs'], 'readwrite');
      t.objectStore('items').put(meta);
      if (blob) t.objectStore('blobs').put(blob, meta.id);
      return done(t);
    },
    putItems(list) { const t = tx('items', 'readwrite'); list.forEach(m => t.objectStore('items').put(m)); return done(t); },
    delItems(ids) {
      const t = tx(['items', 'blobs'], 'readwrite');
      ids.forEach(id => { t.objectStore('items').delete(id); t.objectStore('blobs').delete(id); });
      return done(t);
    },
    async wipe() {
      if (db) db.close();
      await new Promise(res => { const r = indexedDB.deleteDatabase(DBNAME); r.onsuccess = r.onerror = r.onblocked = () => res(); });
    },
  };
})();

/* =====================================================================
 * 狀態
 * ===================================================================== */
const DEFAULTS = { theme: 'auto', order: 'asc', lockAfter: 0 };
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('pv_settings') || '{}') }; } catch { return { ...DEFAULTS }; }
}
const S = {
  items: [], map: new Map(), albums: [],
  settings: loadSettings(),
  nav: { tab: 'library', album: null },
  selecting: false, selected: new Set(),
};
let unlocked = false;
let suspendUntil = 0;
const scrollMemo = {};
let lastKey = null;

function saveSettings() { localStorage.setItem('pv_settings', JSON.stringify(S.settings)); }
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#ffffff');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

function sortItems() {
  S.items.sort((a, b) => a.createdAt - b.createdAt || a.addedAt - b.addedAt);
  S.map = new Map(S.items.map(i => [i.id, i]));
}
const byId = id => S.map.get(id);
const durOf = it => it.duration || 0;

const thumbURLs = new Map();
function tURL(it) {
  let u = thumbURLs.get(it.id);
  if (!u) { u = URL.createObjectURL(it.thumb); thumbURLs.set(it.id, u); }
  return u;
}
function dropThumbURL(id) { const u = thumbURLs.get(id); if (u) { URL.revokeObjectURL(u); thumbURLs.delete(id); } }

/* =====================================================================
 * 手勢密碼盤（九點）
 * ===================================================================== */
function PatternPad(root, onDone) {
  const P = i => [50 + 100 * (i % 3), 50 + 100 * Math.floor(i / 3)];
  const dots = [...Array(9)].map((_, i) => { const [x, y] = P(i); return `<g class="dot"><circle class="hit" cx="${x}" cy="${y}" r="40"/><circle class="ring" cx="${x}" cy="${y}" r="26"/><circle class="core" cx="${x}" cy="${y}" r="8"/></g>`; }).join('');
  root.innerHTML = `<svg viewBox="0 0 300 300" class="pad-svg"><polyline class="pad-line" points=""/>${dots}</svg>`;
  const svg = $('svg', root), line = $('.pad-line', svg), els = $$('.dot', svg);
  let seq = [], down = false, busy = false, cur = null;

  const pt = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * 300 / r.width, (e.clientY - r.top) * 300 / r.height]; };
  const hit = (x, y) => { for (let i = 0; i < 9; i++) { const [cx, cy] = P(i); if (Math.hypot(x - cx, y - cy) < 38) return i; } return -1; };
  const draw = () => { const pts = seq.map(P); if (cur) pts.push(cur); line.setAttribute('points', pts.map(p => p.join(',')).join(' ')); };
  const push = i => { seq.push(i); els[i].classList.add('on'); navigator.vibrate?.(6); };
  function add(i) {
    if (seq.includes(i)) return;
    if (seq.length) {
      const a = seq[seq.length - 1];
      const ra = Math.floor(a / 3), ca = a % 3, ri = Math.floor(i / 3), ci = i % 3;
      const dr = Math.abs(ra - ri), dc = Math.abs(ca - ci);
      if ((dr === 0 || dr === 2) && (dc === 0 || dc === 2) && dr + dc > 0) {
        const m = ((ra + ri) / 2) * 3 + (ca + ci) / 2;
        if (!seq.includes(m)) push(m);
      }
    }
    push(i);
  }
  function reset() { seq = []; cur = null; down = false; busy = false; els.forEach(d => d.classList.remove('on')); root.classList.remove('error'); draw(); }
  svg.addEventListener('pointerdown', e => {
    if (busy) return;
    e.preventDefault(); svg.setPointerCapture(e.pointerId);
    reset(); down = true;
    const [x, y] = pt(e); const i = hit(x, y); if (i >= 0) add(i);
    cur = [x, y]; draw();
  });
  svg.addEventListener('pointermove', e => {
    if (!down) return;
    const [x, y] = pt(e); const i = hit(x, y); if (i >= 0) add(i);
    cur = [x, y]; draw();
  });
  const end = () => {
    if (!down) return;
    down = false; cur = null; draw();
    if (seq.length) { busy = true; onDone(seq.slice()); }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  return {
    reset,
    async clear(ms = 0) { if (ms) await sleep(ms); reset(); },
    async flash(ms = 650) { root.classList.add('error'); navigator.vibrate?.([30, 40, 30]); await sleep(ms); reset(); },
    disable(v) { busy = v; },
  };
}

/* =====================================================================
 * 鎖定畫面
 * ===================================================================== */
const Lock = (() => {
  const el = $('#lock'), msg = $('#lock-msg'), title = $('#lock-title'), cancelBtn = $('#lock-cancel'), forgot = $('#lock-forgot');
  const MIN = 4;
  let waiter = null, cancelled = false;
  const pad = PatternPad($('#lock-pad'), seq => { if (waiter) { const r = waiter; waiter = null; r(seq); } else pad.reset(); });
  const nextSeq = () => new Promise(r => { waiter = r; pad.disable(false); });
  cancelBtn.onclick = () => { cancelled = true; if (waiter) { const r = waiter; waiter = null; r(null); } };
  forgot.onclick = () => wipeAll();

  const setText = (t, m = '', err = false) => { title.textContent = t; msg.textContent = m; msg.classList.toggle('err', !!err); };
  const rand = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
  async function hash(salt, seq) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${seq.join('')}`));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const failState = () => { try { return JSON.parse(localStorage.getItem('pv_fail') || '{"n":0,"until":0}'); } catch { return { n: 0, until: 0 }; } };
  const setFail = s => localStorage.setItem('pv_fail', JSON.stringify(s));

  function show() {
    cancelled = false;
    el.hidden = false; el.classList.remove('out');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  }
  function hide() {
    el.classList.add('out');
    setTimeout(() => { el.hidden = true; el.classList.remove('in', 'out'); }, 340);
  }

  async function runVerify(cancelable) {
    const rec = await DB.get('meta', 'lock');
    if (!rec) return true;
    cancelBtn.hidden = !cancelable;
    forgot.hidden = cancelable;
    let note = null;
    for (;;) {
      const fs = failState();
      if (fs.until > Date.now()) {
        pad.disable(true);
        while (Date.now() < fs.until && !cancelled) {
          setText('嘗試次數過多', `請在 ${Math.ceil((fs.until - Date.now()) / 1000)} 秒後再試`, true);
          await sleep(400);
        }
        if (cancelled) return false;
        note = null;
      }
      setText('輸入手勢密碼', note || '', !!note);
      const seq = await nextSeq();
      if (!seq) return false;
      if (await hash(rec.salt, seq) === rec.hash) { setFail({ n: 0, until: 0 }); await pad.clear(120); return true; }
      const n = fs.n + 1;
      const wait = n % 5 === 0 ? Math.min(300, 30 * 2 ** (n / 5 - 1)) * 1000 : 0;
      setFail({ n, until: wait ? Date.now() + wait : 0 });
      note = '手勢不正確';
      await pad.flash();
    }
  }

  async function runCreate(cancelable, first = '設定手勢密碼') {
    cancelBtn.hidden = !cancelable;
    forgot.hidden = true;
    let note = null;
    for (;;) {
      setText(first, note || `請畫出至少 ${MIN} 個點`, !!note);
      const a = await nextSeq();
      if (!a) return false;
      if (a.length < MIN) { note = `至少需要連接 ${MIN} 個點`; await pad.flash(); continue; }
      await pad.clear(180);
      setText('再畫一次以確認', '');
      const b = await nextSeq();
      if (!b) return false;
      if (a.join() !== b.join()) { note = '兩次手勢不一致，請重新設定'; await pad.flash(); continue; }
      const salt = rand();
      await DB.put('meta', { salt, hash: await hash(salt, a) }, 'lock');
      await pad.clear(180);
      return true;
    }
  }

  return {
    /** 啟動時：沒有密碼就設定，有就驗證 */
    async gate() {
      show();
      const rec = await DB.get('meta', 'lock');
      if (!rec) await runCreate(false);
      else await runVerify(false);
      hide();
    },
    async lockNow() { show(); await runVerify(false); hide(); },
    async change() {
      show();
      let ok = await runVerify(true);
      if (ok) ok = await runCreate(true, '設定新的手勢密碼');
      hide();
      if (ok) toast('手勢密碼已更新');
    },
  };
})();

/* =====================================================================
 * 影像處理：縮圖、尺寸、影片第一幀
 * ===================================================================== */
function canvasBlob(c, type = 'image/jpeg', q = 0.82) {
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), type, q));
}
async function loadImg(blob) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try { await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw e; }
  return { img, url };
}
async function photoInfo(blob) {
  const { img, url } = await loadImg(blob);
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    const k = Math.min(1, 560 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { thumb: await canvasBlob(c), w, h, duration: 0 };
  } finally { URL.revokeObjectURL(url); }
}
function placeholderThumb() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 320;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 320, 320);
  gr.addColorStop(0, '#3a3f55'); gr.addColorStop(1, '#1d2030'); g.fillStyle = gr; g.fillRect(0, 0, 320, 320);
  return canvasBlob(c);
}
async function videoInfo(blob) {
  const url = URL.createObjectURL(blob);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  v.src = url + '#t=0.001';
  const result = await new Promise(res => {
    let fin = false;
    const finish = r => { if (fin) return; fin = true; clearTimeout(t); res(r); };
    const t = setTimeout(() => finish(null), 15000);
    v.onerror = () => finish(null);
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(0.05, (v.duration || 1) / 2); } catch { /* ignore */ } };
    v.onseeked = async () => {
      try {
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) return finish(null);
        const k = Math.min(1, 560 / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        finish({ thumb: await canvasBlob(c), w, h, duration: isFinite(v.duration) ? v.duration : 0 });
      } catch { finish(null); }
    };
  });
  v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  if (result) return result;
  return { thumb: await placeholderThumb(), w: 16, h: 9, duration: 0, noThumb: true };
}
const isVideoFile = f => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name || '');
async function buildItem(file, extra = {}) {
  const video = isVideoFile(file);
  const info = video ? await videoInfo(file) : await photoInfo(file);
  const lm = file.lastModified;
  return {
    id: uid(), type: video ? 'video' : 'photo',
    name: file.name || `${video ? 'VID' : 'IMG'}_${Date.now()}`,
    mime: file.type || (video ? 'video/mp4' : 'image/jpeg'),
    size: file.size, createdAt: lm && lm <= Date.now() + 864e5 ? lm : Date.now(), addedAt: Date.now(),
    fav: false, albums: [],
    thumb: info.thumb, w: info.w, h: info.h, duration: info.duration,
    ...extra,
  };
}

/* =====================================================================
 * 畫面：頁首 / 網格 / 相簿 / 設定
 * ===================================================================== */
const hdrBtn = (act, label, arg = '', cls = '') => `<button class="tbtn ${cls}" data-act="${act}" data-arg="${esc(arg)}">${label}</button>`;
const hdrIcon = (act, icon, arg = '') => `<button class="tbtn" data-act="${act}" data-arg="${esc(arg)}" aria-label="${act}">${ic(icon)}</button>`;

function smartAlbum(key) { return key === 'fav' ? { name: '收藏', filter: i => i.fav } : { name: '影片', filter: i => i.type === 'video' }; }
function albumInfo(key) {
  if (key === 'fav' || key === 'videos') return { ...smartAlbum(key), smart: true };
  const a = S.albums.find(x => x.id === key);
  return a ? { name: a.name, filter: i => i.albums.includes(key), smart: false, rec: a } : null;
}
function currentList() {
  let list;
  if (S.nav.tab === 'library') list = S.items;
  else if (S.nav.tab === 'albums' && S.nav.album) { const a = albumInfo(S.nav.album); list = a ? S.items.filter(a.filter) : []; }
  else list = [];
  return S.settings.order === 'desc' ? [...list].reverse() : list;
}
const viewKey = () => S.nav.tab + (S.nav.album ? ':' + S.nav.album : '');

function renderHeader() {
  const h = $('#hdr'); const { tab, album } = S.nav;
  let l = '', title = '', r = '';
  const list = currentList();
  if (S.selecting) {
    l = hdrBtn('cancel-sel', '取消');
    title = S.selected.size ? `已選取 ${S.selected.size} 項` : '選取項目';
    r = hdrBtn('sel-all', S.selected.size && S.selected.size === list.length ? '取消全選' : '全選');
  } else if (tab === 'library') {
    title = '圖庫';
    r = (list.length ? hdrBtn('select', '選取') : '') + hdrIcon('import', 'plus');
  } else if (tab === 'albums' && !album) {
    title = '相簿'; r = hdrIcon('new-album', 'plus');
  } else if (tab === 'albums') {
    const a = albumInfo(album);
    l = `<button class="tbtn" data-act="back">${ic('back')}相簿</button>`;
    title = a ? a.name : '';
    r = (list.length ? hdrBtn('select', '選取') : '') + hdrIcon('album-menu', 'more');
  } else { title = '設定'; }
  h.innerHTML = `<div class="l">${l}</div><h1>${esc(title)}</h1><div class="r">${r}</div>`;
}

function gridHTML(list, emptyText) {
  if (!list.length) {
    const inAlbumSmart = S.nav.album === 'fav' || S.nav.album === 'videos';
    return `<div class="empty">${ic(S.nav.album === 'videos' ? 'film' : 'photos')}<h2>${esc(emptyText || '還沒有相片或影片')}</h2>${inAlbumSmart ? '' : '<p>點下方按鈕，從 iPhone 相簿選取相片和影片導入。</p><button class="big" data-act="import">導入相片與影片</button>'}</div>`;
  }
  let html = '', cur = null, open = false;
  for (const it of list) {
    const k = dayKey(it.createdAt);
    if (k !== cur) {
      if (open) html += '</div>';
      html += `<div class="day">${esc(dayLabel(it.createdAt))}</div><div class="grid">`;
      cur = k; open = true;
    }
    const sel = S.selected.has(it.id);
    html += `<button class="cell${sel ? ' sel' : ''}" data-id="${it.id}"><img src="${tURL(it)}" alt="" draggable="false" decoding="async" onload="this.classList.add('ld')">${it.type === 'video' ? `<span class="badge dur">${fmtDur(durOf(it))}</span>` : ''}${it.fav ? `<span class="badge fav">${ic('heart', 'fill')}</span>` : ''}<span class="chk">${ic('check')}</span></button>`;
  }
  if (open) html += '</div>';
  const np = list.filter(i => i.type === 'photo').length, nv = list.length - np;
  const parts = []; if (np) parts.push(`${np} 張相片`); if (nv) parts.push(`${nv} 部影片`);
  return html + `<div class="count">${parts.join('、')}</div>`;
}

function albumsHTML() {
  const card = (key, name, items, iconName) => {
    const cover = items.length ? items[items.length - 1] : null;
    return `<button class="album" data-act="open-album" data-arg="${esc(key)}"><div class="cover">${cover ? `<img src="${tURL(cover)}" alt="" decoding="async">` : ic(iconName)}</div><b>${esc(name)}</b><span>${items.length}</span></button>`;
  };
  const fav = S.items.filter(i => i.fav), vid = S.items.filter(i => i.type === 'video');
  let html = `<div class="sec">智慧相簿</div><div class="albums">${card('fav', '收藏', fav, 'heart')}${card('videos', '影片', vid, 'film')}</div>`;
  html += `<div class="sec">我的相簿</div>`;
  if (!S.albums.length) html += `<div class="foot" style="margin:10px 16px 0">點右上角「＋」建立相簿，把相片和影片分門別類。</div>`;
  else html += `<div class="albums">${S.albums.map(a => card(a.id, a.name, S.items.filter(i => i.albums.includes(a.id)), 'albums')).join('')}</div>`;
  return html;
}

function seg(key, opts) {
  return `<div class="seg">${opts.map(([v, label]) => `<button data-act="seg" data-key="${key}" data-arg="${v}" class="${String(S.settings[key]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
}
function settingsHTML() {
  return `
  <div class="group"><h3>外觀</h3><div class="box"><div class="row col">${seg('theme', [['auto', '自動'], ['light', '淺色'], ['dark', '深色']])}</div></div></div>
  <div class="group"><h3>排序</h3><div class="box"><div class="row col">${seg('order', [['asc', '最新在底部'], ['desc', '最新在頂部']])}</div></div></div>
  <div class="group"><h3>安全</h3><div class="box">
    <div class="row col"><div>離開 App 後鎖定</div>${seg('lockAfter', [[0, '立即'], [30, '30 秒'], [300, '5 分鐘']])}</div>
    <button class="row btn" data-act="chpass">更改手勢密碼</button>
    <button class="row btn" data-act="lock-now">立即鎖定</button>
  </div><div class="foot">手勢密碼只是介面鎖，用來擋住別人隨手翻看；它不會加密檔案。忘記密碼時，只能清除所有資料後重設。</div></div>
  <div class="group"><h3>儲存空間</h3><div class="box">
    <div class="row"><span>相簿內容</span><span class="v" id="st-items">—</span></div>
    <div class="row"><span>佔用空間</span><span class="v" id="st-use">—</span></div>
    <div class="row"><span>持久儲存</span><span class="v" id="st-persist">—</span></div>
  </div><div class="foot">所有相片與影片只存在這台裝置的這個 App 裡。刪除主畫面圖示會一併刪除全部內容，建議定期用「匯出」備份。</div></div>
  <div class="group"><div class="box"><button class="row btn danger" data-act="wipe">清除所有資料…</button></div></div>
  <div class="foot" style="text-align:center;margin:20px 0 8px">相簿 · 離線 · 版本 1.0</div>`;
}
async function fillStorage() {
  const total = S.items.reduce((a, i) => a + (i.size || 0), 0);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  set('#st-items', `${S.items.filter(i => i.type === 'photo').length} 張相片・${S.items.filter(i => i.type === 'video').length} 部影片`);
  set('#st-use', fmtSize(total));
  try {
    const p = await navigator.storage?.persisted?.();
    set('#st-persist', p ? '已啟用' : '未啟用');
  } catch { set('#st-persist', '—'); }
}

function renderTabbar() {
  const tabs = [['library', '圖庫', 'photos'], ['albums', '相簿', 'albums'], ['settings', '設定', 'gear']];
  $('#tabbar').innerHTML = tabs.map(([k, label, icon]) => `<button data-act="tab" data-arg="${k}" class="${S.nav.tab === k ? 'on' : ''}">${ic(icon)}<span>${label}</span></button>`).join('');
}
function renderSelbar() {
  const inUserAlbum = S.nav.tab === 'albums' && S.nav.album && !['fav', 'videos'].includes(S.nav.album);
  const none = S.selected.size === 0 ? 'disabled' : '';
  $('#selbar').innerHTML = `<button data-act="sel-share" ${none} aria-label="匯出">${ic('share')}</button><button data-act="sel-fav" ${none} aria-label="收藏">${ic('heart')}</button><button data-act="sel-album" ${none} aria-label="加入相簿">${ic('folderPlus')}</button>${inUserAlbum ? `<button data-act="sel-remove" ${none} aria-label="移出相簿">${ic('minus')}</button>` : ''}<button class="danger" data-act="sel-del" ${none} aria-label="刪除">${ic('trash')}</button>`;
}
function updateSelUI() {
  $('#app').classList.toggle('selecting', S.selecting);
  renderHeader(); renderSelbar();
  $$('.cell').forEach(c => c.classList.toggle('sel', S.selected.has(c.dataset.id)));
}

function render(opts = {}) {
  const sc = $('#scroller'); const key = viewKey();
  if (lastKey && sc.firstElementChild) scrollMemo[lastKey] = sc.scrollTop;
  const { tab, album } = S.nav;
  let body;
  if (tab === 'library') body = gridHTML(currentList());
  else if (tab === 'albums' && !album) body = albumsHTML();
  else if (tab === 'albums') {
    const a = albumInfo(album);
    body = a ? gridHTML(currentList(), album === 'fav' ? '沒有收藏' : album === 'videos' ? '沒有影片' : '相簿是空的') : '';
  } else body = settingsHTML();
  renderHeader(); renderTabbar(); renderSelbar();
  $('#app').classList.toggle('selecting', S.selecting);
  sc.className = 'scroller' + (opts.anim ? ' ' + opts.anim : '');
  sc.innerHTML = body;
  const gridView = tab === 'library' || (tab === 'albums' && album);
  let top = 0;
  if (opts.toEnd && gridView && S.settings.order === 'asc') top = sc.scrollHeight;
  else if (opts.keepScroll && key in scrollMemo) top = scrollMemo[key];
  else if (gridView && S.settings.order === 'asc' && !(key in scrollMemo)) top = sc.scrollHeight;
  else if (key in scrollMemo && !opts.reset) top = scrollMemo[key];
  sc.scrollTop = top;
  lastKey = key;
  if (tab === 'settings') fillStorage();
}

/* =====================================================================
 * 導入 / 刪除 / 收藏 / 相簿 / 匯出
 * ===================================================================== */
function pickFiles() {
  suspendUntil = Date.now() + 120000;
  const p = $('#picker'); p.value = ''; p.click();
}
$('#picker').addEventListener('change', async e => {
  suspendUntil = 0;
  const files = [...e.target.files].filter(f => /^(image|video)\//.test(f.type) || /\.(heic|heif|jpe?g|png|gif|webp|avif|mp4|mov|m4v)$/i.test(f.name));
  if (files.length) await importFiles(files);
});

async function importFiles(files) {
  const total = files.length; let ok = 0, fail = 0;
  const inUserAlbum = S.nav.tab === 'albums' && S.nav.album && !['fav', 'videos'].includes(S.nav.album) ? S.nav.album : null;
  Progress.show(`正在導入 1 / ${total}`);
  for (let i = 0; i < total; i++) {
    Progress.set(`正在導入 ${i + 1} / ${total}`, i / total);
    try {
      const meta = await buildItem(files[i]);
      if (inUserAlbum) meta.albums = [inUserAlbum];
      if (S.nav.tab === 'albums' && S.nav.album === 'fav') meta.fav = true;
      await DB.putItem(meta, files[i]);
      S.items.push(meta); ok++;
    } catch (err) {
      console.error(err); fail++;
      if (err && err.name === 'QuotaExceededError') { toast('儲存空間不足，已停止導入'); break; }
    }
  }
  Progress.hide();
  sortItems();
  render({ toEnd: true });
  toast(fail ? `已導入 ${ok} 項，${fail} 項失敗` : `已導入 ${ok} 項`);
}

async function deleteItems(ids) {
  const n = ids.length;
  const v = await sheet(n === 1 ? '要刪除這個項目嗎？此操作無法復原。' : `要刪除這 ${n} 個項目嗎？此操作無法復原。`, [{ label: n === 1 ? '刪除' : `刪除 ${n} 個項目`, value: 'del', destructive: true }]);
  if (v !== 'del') return false;
  await DB.delItems(ids);
  ids.forEach(dropThumbURL);
  const set = new Set(ids);
  S.items = S.items.filter(i => !set.has(i.id));
  sortItems();
  ids.forEach(id => S.selected.delete(id));
  toast('已刪除');
  return true;
}

async function toggleFav(ids) {
  const its = ids.map(byId).filter(Boolean);
  const all = its.every(i => i.fav);
  its.forEach(i => { i.fav = !all; });
  await DB.putItems(its);
  return !all;
}

async function pickAlbum() {
  const v = await sheet('加入相簿', [...S.albums.map(a => ({ label: a.name, value: a.id })), { label: '新增相簿…', value: '__new' }]);
  if (v === '__new') return createAlbum();
  return v;
}
async function createAlbum() {
  const name = await askText('新增相簿', '', '相簿名稱');
  if (!name) return null;
  const a = { id: uid(), name, created: Date.now() };
  await DB.put('albums', a); S.albums.push(a);
  return a.id;
}
async function addToAlbum(ids, albumId) {
  const its = ids.map(byId).filter(Boolean);
  its.forEach(i => { if (!i.albums.includes(albumId)) i.albums.push(albumId); });
  await DB.putItems(its);
}
async function removeFromAlbum(ids, albumId) {
  const its = ids.map(byId).filter(Boolean);
  its.forEach(i => { i.albums = i.albums.filter(a => a !== albumId); });
  await DB.putItems(its);
}

function fileNameOf(it) {
  const ext = it.type === 'video' ? (it.mime.includes('quicktime') ? 'mov' : 'mp4') : (it.mime.includes('png') ? 'png' : it.mime.includes('webp') ? 'webp' : it.mime.includes('gif') ? 'gif' : 'jpg');
  return /\.[a-z0-9]{2,4}$/i.test(it.name) ? it.name : `${it.name}.${ext}`;
}
async function exportItems(ids) {
  const its = ids.map(byId).filter(Boolean);
  if (!its.length) return;
  suspendUntil = Date.now() + 180000;
  try {
    const files = await Promise.all(its.map(async it => {
      const blob = await DB.get('blobs', it.id);
      return new File([blob], fileNameOf(it), { type: blob.type || it.mime });
    }));
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files }); }
      catch (e) { if (e.name !== 'AbortError') { console.error(e); toast('匯出失敗'); } }
    } else {
      for (const f of files) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
        document.body.appendChild(a); a.click(); a.remove(); await sleep(300);
      }
    }
  } finally { suspendUntil = 0; }
}

async function wipeAll() {
  const v = await sheet('這會刪除此 App 內所有相片、影片與手勢密碼，無法復原。', [{ label: '清除所有資料並重設', value: 'wipe', destructive: true }]);
  if (v !== 'wipe') return;
  await DB.wipe();
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch { /* ignore */ }
  location.reload();
}

/* =====================================================================
 * 檢視器：縮放 / 平移 / 滑動切換 / 下滑關閉
 * ===================================================================== */
const V = { open: false, ids: [], i: 0, s: 1, x: 0, y: 0, url: null, tok: 0 };
const vEl = $('#viewer'), vStage = $('.v-stage', vEl), vSlide = $('.v-slide', vEl);
$('[data-act="v-back"]').innerHTML = ic('back');
$('[data-act="v-more"]').innerHTML = ic('more');
$('[data-act="v-share"]').innerHTML = ic('share');
$('[data-act="v-del"]').innerHTML = ic('trash');
const vCur = () => byId(V.ids[V.i]);
const vMedia = () => $('.v-media', vSlide);

function applyT(anim) {
  const m = vMedia(); const it = vCur();
  if (!m || !it || it.type !== 'photo') return;
  m.style.transition = anim ? 'transform .32s cubic-bezier(.2,.8,.2,1)' : 'none';
  m.style.transform = `translate3d(${V.x}px,${V.y}px,0) scale(${V.s})`;
}
function fitted() {
  const it = vCur(); const sr = vStage.getBoundingClientRect();
  const ar = (it.w || 1) / (it.h || 1);
  let fw = sr.width, fh = fw / ar;
  if (fh > sr.height) { fh = sr.height; fw = fh * ar; }
  return { fw, fh, sw: sr.width, sh: sr.height };
}
function bounds(s) { const f = fitted(); return { mx: Math.max(0, (f.fw * s - f.sw) / 2), my: Math.max(0, (f.fh * s - f.sh) / 2) }; }
function settle() {
  V.s = clamp(V.s, 1, 6);
  if (V.s < 1.02) { V.s = 1; V.x = 0; V.y = 0; }
  const b = bounds(V.s);
  V.x = clamp(V.x, -b.mx, b.mx); V.y = clamp(V.y, -b.my, b.my);
  applyT(true);
}
function setVBg(p) { vEl.style.setProperty('--vbg', String(1 - p)); }

function updateVChrome() {
  const it = vCur(); if (!it) return;
  $('#v-day').textContent = dayLabel(it.createdAt);
  $('#v-time').textContent = dT.format(new Date(it.createdAt));
  const f = $('[data-act="v-fav"]'); f.innerHTML = ic('heart', it.fav ? 'fill' : '');
}

function bindMeta(video, it) {
  video.addEventListener('loadedmetadata', () => {
    if (!it.duration && isFinite(video.duration)) { it.duration = video.duration; DB.putItems([it]).catch(() => {}); }
  });
}

async function mountMedia() {
  const it = vCur(); if (!it) return;
  const tok = ++V.tok;
  if (V.url) { URL.revokeObjectURL(V.url); V.url = null; }
  V.s = 1; V.x = 0; V.y = 0;
  vSlide.innerHTML = '';
  vSlide.className = 'v-slide' + (it.type === 'video' ? ' video' : '');
  vEl.classList.remove('chrome-off');
  updateVChrome();
  let media;
  if (it.type === 'photo') {
    media = document.createElement('img'); media.className = 'v-media'; media.draggable = false; media.src = tURL(it);
    vSlide.appendChild(media);
  } else {
    media = document.createElement('video'); media.className = 'v-media';
    media.controls = true; media.playsInline = true; media.preload = 'metadata'; media.poster = tURL(it);
    media.setAttribute('playsinline', ''); media.setAttribute('webkit-playsinline', '');
    bindMeta(media, it);
    vSlide.appendChild(media);
  }
  const blob = await DB.get('blobs', it.id);
  if (tok !== V.tok || !blob) return;
  V.url = URL.createObjectURL(blob);
  if (it.type === 'photo') {
    const url = V.url, full = new Image(); full.src = url;
    try { await full.decode(); } catch { /* 仍嘗試顯示 */ }
    if (tok === V.tok) media.src = url;
  } else media.src = V.url;
}

async function openViewer(id, ids) {
  V.ids = ids; V.i = Math.max(0, ids.indexOf(id)); V.open = true;
  vEl.hidden = false; vEl.style.removeProperty('--vbg');
  vEl.classList.remove('closing'); vEl.classList.add('opening');
  vSlide.style.transform = ''; vSlide.style.opacity = '';
  mountMedia();
  setTimeout(() => vEl.classList.remove('opening'), 320);
}
async function closeViewer(animate = true) {
  if (!V.open) return;
  V.open = false; V.tok++;
  const v = $('video', vSlide); if (v) v.pause();
  const fin = () => {
    vEl.hidden = true; vEl.classList.remove('closing', 'chrome-off'); vSlide.innerHTML = '';
    vSlide.style.transform = ''; vSlide.style.opacity = ''; vEl.style.removeProperty('--vbg');
    if (V.url) { URL.revokeObjectURL(V.url); V.url = null; }
    if (unlocked) render({ keepScroll: true });
  };
  if (animate) { vEl.classList.add('closing'); setTimeout(fin, 240); } else fin();
}

async function goTo(dir) {
  const ni = V.i + dir;
  if (ni < 0 || ni >= V.ids.length) return bounceBack();
  const W = vStage.clientWidth;
  const v = $('video', vSlide); if (v) v.pause();
  vSlide.style.transition = 'transform .2s cubic-bezier(.4,0,.8,.6)';
  vSlide.style.transform = `translateX(${-dir * W}px)`;
  await sleep(190);
  V.i = ni;
  vSlide.style.transition = 'none';
  vSlide.style.transform = `translateX(${dir * W * 0.6}px)`;
  mountMedia();
  await raf(); await raf();
  vSlide.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
  vSlide.style.transform = 'translateX(0)';
}
function bounceBack() {
  vSlide.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
  vSlide.style.transform = 'translate(0,0) scale(1)';
  vEl.style.setProperty('--vbg', '1');
  vEl.classList.remove('chrome-off');
}

const ptrs = new Map();
let g = null, lastTap = 0, lastTapPt = null, tapTimer = null;
function toggleChrome() { vEl.classList.toggle('chrome-off'); }
function videoZoneBlocked(e) {
  const m = vMedia(); if (!m) return true;
  const r = m.getBoundingClientRect();
  return e.clientY > r.bottom - 110 || e.clientY < r.top || e.clientX < r.left || e.clientX > r.right;
}
vStage.addEventListener('pointerdown', e => {
  const it = vCur(); if (!it) return;
  if (it.type === 'video' && videoZoneBlocked(e)) return;
  try { vStage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) g = { mode: 'wait', sx: e.clientX, sy: e.clientY, t: performance.now(), x0: V.x, y0: V.y };
  else if (ptrs.size === 2 && it.type === 'photo') startPinch();
});
function startPinch() {
  const [a, b] = [...ptrs.values()]; const r = vStage.getBoundingClientRect();
  g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: V.s, x0: V.x, y0: V.y,
    fx: (a.x + b.x) / 2 - r.left - r.width / 2, fy: (a.y + b.y) / 2 - r.top - r.height / 2 };
}
vStage.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!g) return;
  const it = vCur(); if (!it) return;
  if (g.mode === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()]; const r = vStage.getBoundingClientRect();
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2 - r.left - r.width / 2, cy = (a.y + b.y) / 2 - r.top - r.height / 2;
    const s = clamp(g.s0 * d / g.d0, 0.6, 6), k = s / g.s0;
    V.s = s; V.x = cx - (g.fx - g.x0) * k; V.y = cy - (g.fy - g.y0) * k;
    applyT(false); return;
  }
  if (ptrs.size > 1) return;
  const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
  if (g.mode === 'wait') {
    if (Math.hypot(dx, dy) < 8) return;
    if (V.s > 1.02 && it.type === 'photo') g.mode = 'pan';
    else g.mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : (dy > 0 ? 'dismiss' : 'ignore');
  }
  if (g.mode === 'pan') {
    const b = bounds(V.s);
    let nx = g.x0 + dx, ny = g.y0 + dy;
    if (nx > b.mx) nx = b.mx + (nx - b.mx) * 0.3; else if (nx < -b.mx) nx = -b.mx + (nx + b.mx) * 0.3;
    if (ny > b.my) ny = b.my + (ny - b.my) * 0.3; else if (ny < -b.my) ny = -b.my + (ny + b.my) * 0.3;
    V.x = nx; V.y = ny; applyT(false);
  } else if (g.mode === 'swipe') {
    const edge = (dx > 0 && V.i === 0) || (dx < 0 && V.i === V.ids.length - 1);
    vSlide.style.transition = 'none';
    vSlide.style.transform = `translateX(${edge ? dx * 0.33 : dx}px)`;
  } else if (g.mode === 'dismiss') {
    const p = clamp(dy / 420, 0, 1);
    vSlide.style.transition = 'none';
    vSlide.style.transform = `translate(${dx * 0.6}px,${dy}px) scale(${1 - p * 0.28})`;
    setVBg(p * 0.9);
    vEl.classList.add('chrome-off');
  }
});
function onUp(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (!g) return;
  const it = vCur();
  if (g.mode === 'pinch') {
    if (ptrs.size === 1) {
      const p = [...ptrs.values()][0];
      g = { mode: V.s > 1.02 ? 'pan' : 'ignore', sx: p.x, sy: p.y, x0: V.x, y0: V.y, t: performance.now() };
      return;
    }
    if (ptrs.size === 0) { settle(); g = null; }
    return;
  }
  if (ptrs.size > 0) return;
  const dx = e.clientX - g.sx, dy = e.clientY - g.sy, dt = Math.max(1, performance.now() - g.t);
  const mode = g.mode; g = null;
  if (!it) return;
  if (mode === 'wait' && e.type === 'pointerup') {
    if (it.type === 'video') { const v = vMedia(); if (v) (v.paused ? v.play() : v.pause()); return; }
    const now = performance.now();
    if (now - lastTap < 300 && lastTapPt && Math.hypot(lastTapPt.x - e.clientX, lastTapPt.y - e.clientY) < 36) {
      clearTimeout(tapTimer); lastTap = 0; doubleTap(e.clientX, e.clientY);
    } else {
      lastTap = now; lastTapPt = { x: e.clientX, y: e.clientY };
      clearTimeout(tapTimer); tapTimer = setTimeout(toggleChrome, 260);
    }
  } else if (mode === 'pan' || (mode === 'ignore' && V.s !== 1)) settle();
  else if (mode === 'swipe') {
    const W = vStage.clientWidth, v = dx / dt, dir = dx < 0 ? 1 : -1;
    if ((Math.abs(dx) > W * 0.22 || Math.abs(v) > 0.45) && V.i + dir >= 0 && V.i + dir < V.ids.length) goTo(dir); else bounceBack();
  } else if (mode === 'dismiss') {
    if (dy > 110 || dy / dt > 0.6) closeViewer(true); else bounceBack();
  }
}
vStage.addEventListener('pointerup', onUp);
vStage.addEventListener('pointercancel', onUp);
function doubleTap(cx, cy) {
  const r = vStage.getBoundingClientRect();
  const fx = cx - r.left - r.width / 2, fy = cy - r.top - r.height / 2;
  if (V.s > 1.05) { V.s = 1; V.x = 0; V.y = 0; }
  else { const s1 = 2.6, k = s1 / V.s; V.x = fx - (fx - V.x) * k; V.y = fy - (fy - V.y) * k; V.s = s1; }
  settle();
}
let wheelT;
vStage.addEventListener('wheel', e => {
  const it = vCur(); if (!it || it.type !== 'photo') return;
  e.preventDefault();
  const r = vStage.getBoundingClientRect();
  const fx = e.clientX - r.left - r.width / 2, fy = e.clientY - r.top - r.height / 2;
  const s = clamp(V.s * Math.exp(-e.deltaY * 0.002), 0.8, 6), k = s / V.s;
  V.x = fx - (fx - V.x) * k; V.y = fy - (fy - V.y) * k; V.s = s;
  applyT(false); clearTimeout(wheelT); wheelT = setTimeout(settle, 160);
}, { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
document.addEventListener('keydown', e => {
  if (!V.open) return;
  if (e.key === 'Escape') closeViewer(true);
  else if (e.key === 'ArrowRight') goTo(1);
  else if (e.key === 'ArrowLeft') goTo(-1);
});

async function viewerDelete() {
  const it = vCur(); if (!it) return;
  const ok = await deleteItems([it.id]);
  if (!ok) return;
  V.ids.splice(V.i, 1);
  if (!V.ids.length) { closeViewer(true); return; }
  V.i = Math.min(V.i, V.ids.length - 1);
  vSlide.style.transition = 'none'; vSlide.style.transform = ''; vSlide.style.opacity = '0';
  mountMedia();
  await raf();
  vSlide.style.transition = 'opacity .25s'; vSlide.style.opacity = '1';
}
async function viewerMore() {
  const it = vCur(); if (!it) return;
  const inAlbum = S.nav.tab === 'albums' && S.nav.album && !['fav', 'videos'].includes(S.nav.album);
  const opts = [{ label: '加入相簿', value: 'album' }];
  if (inAlbum) opts.push({ label: '從此相簿移除', value: 'remove' });
  opts.push({ label: '詳細資訊', value: 'info' });
  const v = await sheet('', opts);
  if (v === 'album') { const id = await pickAlbum(); if (id) { await addToAlbum([it.id], id); toast('已加入相簿'); } }
  else if (v === 'remove') {
    await removeFromAlbum([it.id], S.nav.album); toast('已從相簿移除');
    V.ids.splice(V.i, 1);
    if (!V.ids.length) closeViewer(true); else { V.i = Math.min(V.i, V.ids.length - 1); mountMedia(); }
  } else if (v === 'info') {
    const rows = [['名稱', it.name], ['類型', it.type === 'video' ? '影片' : '相片'], ['尺寸', `${it.w} × ${it.h}`], ['大小', fmtSize(it.size)], ['日期', `${dayLabel(it.createdAt)} ${dT.format(new Date(it.createdAt))}`]];
    if (it.type === 'video') rows.push(['時長', fmtDur(it.duration)]);
    await dialog(`<h3>詳細資訊</h3><div class="body">${rows.map(([a, b]) => `<div><b>${a}</b><span>${esc(b)}</span></div>`).join('')}</div>`, { ok: '好', cancel: false });
  }
}

/* =====================================================================
 * 事件分派
 * ===================================================================== */
let suppressClick = false;
const H = {
  tab(a) { S.nav = { tab: a, album: null }; S.selecting = false; S.selected.clear(); render({ anim: 'fade' }); },
  import() { pickFiles(); },
  select() { S.selecting = true; S.selected.clear(); updateSelUI(); },
  'cancel-sel'() { S.selecting = false; S.selected.clear(); updateSelUI(); },
  'sel-all'() {
    const list = currentList();
    if (S.selected.size === list.length) S.selected.clear(); else list.forEach(i => S.selected.add(i.id));
    updateSelUI();
  },
  async 'new-album'() { const id = await createAlbum(); if (id) render({ keepScroll: true }); },
  'open-album'(a) { S.nav = { tab: 'albums', album: a }; S.selecting = false; S.selected.clear(); render({ anim: 'push', reset: true }); },
  back() { S.nav = { tab: 'albums', album: null }; S.selecting = false; S.selected.clear(); render({ anim: 'pop' }); },
  async 'album-menu'() {
    const key = S.nav.album, a = albumInfo(key); if (!a) return;
    const opts = [];
    if (!a.smart) opts.push({ label: '導入到此相簿', value: 'import' }, { label: '重新命名', value: 'rename' }, { label: '刪除相簿（保留其中的相片）', value: 'del', destructive: true });
    else opts.push({ label: '選取', value: 'select' });
    const v = await sheet(a.name, opts);
    if (v === 'import') pickFiles();
    else if (v === 'select') H.select();
    else if (v === 'rename') {
      const n = await askText('重新命名相簿', a.rec.name, '相簿名稱');
      if (n) { a.rec.name = n; await DB.put('albums', a.rec); render({ keepScroll: true }); }
    } else if (v === 'del') {
      const its = S.items.filter(i => i.albums.includes(key));
      its.forEach(i => { i.albums = i.albums.filter(x => x !== key); });
      if (its.length) await DB.putItems(its);
      await DB.del('albums', key); S.albums = S.albums.filter(x => x.id !== key);
      S.nav = { tab: 'albums', album: null }; render({ anim: 'pop' }); toast('已刪除相簿');
    }
  },
  async 'sel-share'() { await exportItems([...S.selected]); },
  async 'sel-fav'() { const on = await toggleFav([...S.selected]); toast(on ? '已加入收藏' : '已取消收藏'); S.selecting = false; S.selected.clear(); render({ keepScroll: true }); },
  async 'sel-album'() {
    const id = await pickAlbum(); if (!id) return;
    await addToAlbum([...S.selected], id); toast('已加入相簿'); S.selecting = false; S.selected.clear(); render({ keepScroll: true });
  },
  async 'sel-remove'() {
    await removeFromAlbum([...S.selected], S.nav.album); toast('已從相簿移除'); S.selecting = false; S.selected.clear(); render({ keepScroll: true });
  },
  async 'sel-del'() {
    if (await deleteItems([...S.selected])) { S.selecting = false; S.selected.clear(); render({ keepScroll: true }); }
  },
  seg(a, t) {
    const k = t.dataset.key; S.settings[k] = k === 'lockAfter' ? +a : a; saveSettings();
    if (k === 'theme') applyTheme();
    render({ keepScroll: true });
  },
  chpass() { Lock.change(); },
  'lock-now'() { lockNow(); },
  wipe() { wipeAll(); },
  /* 檢視器 */
  'v-back'() { closeViewer(true); },
  async 'v-share'() { const it = vCur(); if (it) await exportItems([it.id]); },
  async 'v-fav'() { const it = vCur(); if (!it) return; await toggleFav([it.id]); updateVChrome(); },
  'v-del'() { viewerDelete(); },
  'v-more'() { viewerMore(); },
};

document.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
  const t = e.target.closest('[data-act]');
  if (t) { const fn = H[t.dataset.act]; if (fn) fn(t.dataset.arg, t, e); return; }
  const cell = e.target.closest('.cell');
  if (cell) {
    const id = cell.dataset.id;
    if (S.selecting) {
      if (S.selected.has(id)) S.selected.delete(id); else S.selected.add(id);
      updateSelUI();
    } else openViewer(id, currentList().map(i => i.id));
  }
});
// 長按進入多選
(() => {
  let timer = null, sx = 0, sy = 0;
  document.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.cell'); if (!cell || S.selecting) return;
    sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => {
      timer = null; suppressClick = true; navigator.vibrate?.(12);
      S.selecting = true; S.selected = new Set([cell.dataset.id]); updateSelUI();
    }, 480);
  });
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  document.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel(); });
  document.addEventListener('pointerup', () => { cancel(); setTimeout(() => { suppressClick = false; }, 60); });
  document.addEventListener('pointercancel', cancel);
  document.addEventListener('contextmenu', e => { if (e.target.closest('.cell,.v-media')) e.preventDefault(); });
})();

/* =====================================================================
 * 鎖定時機（離開 App 時）
 * ===================================================================== */
let hiddenAt = 0;
async function lockNow() {
  if (!unlocked) return;
  unlocked = false;
  closeViewer(false);
  $('#sheet').hidden = true; $('#dialog').hidden = true; $('#cover').hidden = true;
  S.selecting = false; S.selected.clear();
  await Lock.lockNow();
  unlocked = true;
  render({ keepScroll: true });
}
document.addEventListener('visibilitychange', () => {
  if (!unlocked) return;
  const busy = Date.now() < suspendUntil;
  if (document.hidden) {
    hiddenAt = Date.now();
    if (busy) return;
    if (S.settings.lockAfter === 0) lockNow(); else $('#cover').hidden = false;
  } else {
    $('#cover').hidden = true;
    if (!busy && S.settings.lockAfter > 0 && Date.now() - hiddenAt > S.settings.lockAfter * 1000) lockNow();
  }
});

/* =====================================================================
 * 啟動
 * ===================================================================== */
async function enterApp() {
  const [items, albums] = await Promise.all([DB.getAll('items'), DB.getAll('albums')]);
  S.items = items; S.albums = albums.sort((a, b) => a.created - b.created);
  sortItems();
  $('#app').hidden = false;
  render({ reset: true });
  unlocked = true;
  try { navigator.storage?.persist?.(); } catch { /* ignore */ }
}

async function start() {
  try { await DB.open(); }
  catch (e) {
    console.error(e);
    alert('這個瀏覽器無法使用本機儲存（IndexedDB）。若使用的是無痕模式，請改用一般模式。');
    return;
  }
  await Lock.gate();
  await enterApp();
}

(function boot() {
  applyTheme();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  let skip = false; try { skip = sessionStorage.getItem('pv_skipguide') === '1'; } catch { /* ignore */ }
  if (isIOS && !standalone && !skip) {
    const guide = $('#guide'); guide.hidden = false;
    $('#guide-skip').onclick = () => {
      try { sessionStorage.setItem('pv_skipguide', '1'); } catch { /* ignore */ }
      guide.hidden = true; start();
    };
  } else start();
})();

})();
