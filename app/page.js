'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/* ================= 常數與小工具 ================= */
const DEF_CFG = {
  statuses: [{ v: 'want', label: '🤤 想吃' }, { v: 'visited', label: '✅ 吃過' }],
  prices: [
    { v: '1', label: '$ <200' }, { v: '2', label: '$$ 200–500' },
    { v: '3', label: '$$$ 500–1000' }, { v: '4', label: '$$$$ 1000+' },
  ],
  parks: [
    { v: 'own', label: '🅿️ 自帶停車位' }, { v: 'nearby', label: '50m 內有停車場' },
    { v: 'none', label: '不好停' }, { v: 'unknown', label: '不確定' },
  ],
};
const G_PRICE = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

function haversine(a, b) {
  const R = 6371000, r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = (m) => (m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km');
const gmapsLink = (r) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.name + ' ' + r.lat + ',' + r.lng);

const fromRow = (r) => ({
  id: r.id, name: r.name, type: r.type || '', status: r.status, price: r.price || '',
  parking: r.parking || 'unknown', dishes: r.dishes || [], notes: r.notes || '',
  lat: r.lat, lng: r.lng, createdAt: r.created_at,
});

async function placesFetch(kind, params) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
    body: JSON.stringify({ kind, ...params }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'HTTP ' + res.status);
  return j;
}

/* ================= 共用元件 ================= */
function Chips({ options, value, onChange, multi }) {
  const selected = multi ? value : [value];
  return (
    <div className="chips">
      {options.map((o) => (
        <div key={o.v} className={'chip' + (selected.includes(o.v) ? ' sel' : '')}
          onClick={() => {
            if (multi) onChange(selected.includes(o.v) ? value.filter((x) => x !== o.v) : [...value, o.v]);
            else onChange(o.v);
          }}>
          {o.label}
        </div>
      ))}
    </div>
  );
}

function Card({ r, dist, lbl, onEdit, onDel }) {
  const bcls = r.status === 'want' ? 'want' : r.status === 'visited' ? 'visited' : 'other';
  const showPark = r.parking && r.parking !== 'unknown' && r.parking !== 'none';
  return (
    <div className="card">
      <h3>
        {r.name}
        <span className={'badge ' + bcls}>{lbl('statuses', r.status) || r.status}</span>
        {showPark && <span className="parkTag">{lbl('parks', r.parking)}</span>}
      </h3>
      <div className="meta">
        {dist != null && <span>📏 {fmtDist(dist)}</span>}
        {r.type && <span>{r.type}</span>}
        {r.price && <span>{lbl('prices', r.price)}</span>}
        {r.parking === 'none' && <span>{lbl('parks', 'none')}</span>}
      </div>
      {r.dishes?.length > 0 && (
        <div className="dishes">{r.dishes.map((d, i) => <span key={i} className="dish">⭐ {d}</span>)}</div>
      )}
      {r.notes && <div className="note">{r.notes}</div>}
      <div className="actions">
        <a className="link" href={gmapsLink(r)} target="_blank" rel="noreferrer">🌐 Google 評論</a>
        <button onClick={() => onEdit(r.id)}>✏️ 編輯</button>
        <button className="danger" onClick={() => onDel(r.id)}>刪除</button>
      </div>
    </div>
  );
}

function GoogleCard({ p, parkState, onCheckParking, onCollect }) {
  return (
    <div className="card">
      <h3>{p.name}</h3>
      <div className="meta">
        <span className="rating">★ {p.rating.toFixed(1)}</span>
        <span>({p.cnt} 則評論)</span>
        <span>📏 {fmtDist(p.d)}</span>
        {p.price ? <span>{G_PRICE[p.price]}</span> : null}
      </div>
      <div className="meta">{p.addr}</div>
      <div className="actions">
        <a className="link" href={p.uri} target="_blank" rel="noreferrer">🌐 看評論</a>
        <button onClick={onCheckParking}>
          {parkState === 'loading' ? <span className="spin" /> : parkState || '🅿️ 查 50m 停車'}
        </button>
        <button onClick={onCollect}>➕ 收藏</button>
      </div>
    </div>
  );
}

/* ================= 登入畫面 ================= */
function Login() {
  return (
    <div className="login">
      <div className="loginCard">
        <div className="logo">🍽️</div>
        <h1>口袋餐廳</h1>
        <p>記錄想吃與吃過的餐廳<br />用 Google 帳號登入，跨裝置雲端同步</p>
        <button className="gbtn"
          onClick={() => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          })}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.55 13.3l7.98 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.55c0-1.57-.15-3.1-.4-4.55H24v9.1h12.4c-.55 2.9-2.2 5.35-4.7 7l7.3 5.65C43.35 37.6 46.1 31.65 46.1 24.55z" />
            <path fill="#FBBC05" d="M10.55 28.5a14.4 14.4 0 0 1 0-9l-7.98-6.2a24 24 0 0 0 0 21.4l7.98-6.2z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.15 15.85-5.8l-7.3-5.65c-2 1.35-4.6 2.15-8.55 2.15-6.3 0-11.6-4.2-13.45-10l-7.98 6.2C6.5 42.6 14.6 48 24 48z" />
          </svg>
          使用 Google 登入
        </button>
        <p style={{ marginTop: 18, fontSize: 12 }}>登入只用來辨識你的資料，不會讀取你的信件或 Google Maps 帳號內容</p>
      </div>
    </div>
  );
}

/* ================= 主程式 ================= */
function App({ session }) {
  const user = session.user;
  const [data, setData] = useState([]);
  const [cfg, setCfg] = useState(DEF_CFG);
  const [tab, setTab] = useState('nearby');
  const [myLoc, setMyLoc] = useState(null);
  const [locStatus, setLocStatus] = useState('尚未定位');
  const [nearbyText, setNearbyText] = useState('📍 取得目前位置後，列出你記錄過的附近餐廳');
  const [searchCenter, setSearchCenter] = useState(null); // {lat,lng,auto}
  const myLocRef = useRef(null);

  const lbl = useCallback((list, v) => {
    const o = cfg[list].find((o) => o.v === v);
    return o ? o.label : v && v !== 'unknown' ? v : '';
  }, [cfg]);

  /* ---- 載入雲端資料 ---- */
  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase.from('restaurants').select('*').order('created_at');
      if (!error && rows) setData(rows.map(fromRow));
      const { data: s } = await supabase.from('user_settings').select('cfg').maybeSingle();
      if (s?.cfg && Object.keys(s.cfg).length) {
        setCfg({ ...JSON.parse(JSON.stringify(DEF_CFG)), ...s.cfg });
      }
    })();
  }, [user.id]);

  async function persistCfg(next) {
    setCfg(next);
    await supabase.from('user_settings').upsert({ user_id: user.id, cfg: next, updated_at: new Date().toISOString() });
  }

  /* ---- 定位 ---- */
  const refreshLocation = useCallback(() => {
    setLocStatus('定位中…');
    if (!navigator.geolocation) { setLocStatus('此瀏覽器不支援定位'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        myLocRef.current = loc;
        setMyLoc(loc);
        setSearchCenter((c) => (!c || c.auto ? { ...loc, auto: true } : c));
        setLocStatus('📍 已定位');
        setNearbyText('📍 依目前位置由近到遠');
      },
      () => {
        setLocStatus('定位失敗（需 https 與授權）');
        setNearbyText('⚠️ 無法定位，可在「搜尋」用地圖選定點');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);
  useEffect(() => { refreshLocation(); }, [refreshLocation]);

  /* ---- 新增 / 編輯表單 ---- */
  const emptyForm = { name: '', type: '', status: DEF_CFG.statuses[0].v, price: '', parking: 'unknown', dishes: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [formLoc, setFormLoc] = useState(null);
  const [fAddr, setFAddr] = useState('');
  const [fLocText, setFLocText] = useState('尚未設定位置');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function resetForm() {
    setForm({ ...emptyForm, status: cfg.statuses[0]?.v || 'want' });
    setFormLoc(null); setFAddr(''); setFLocText('尚未設定位置'); setEditingId(null);
  }

  async function geocodeAddr() {
    const q = fAddr.trim();
    if (!q) { alert('請先輸入地址或店名'); return; }
    setFLocText('查詢座標中…');
    try {
      const params = { textQuery: q, maxResultCount: 1 };
      if (myLocRef.current) params.bias = { ...myLocRef.current, radius: 50000 };
      const j = await placesFetch('searchText', params);
      const p = (j.places || [])[0];
      if (!p) { setFLocText('❌ 查不到這個地址，請改用「🗺️ 地圖選點」'); return; }
      const loc = { lat: p.location.latitude, lng: p.location.longitude };
      setFormLoc(loc);
      if (!form.name && !/\d+(巷|弄|號)/.test(q)) setF('name', q); // 輸入的是店名就順便帶入
      const label = p.displayName?.text || p.formattedAddress || '';
      setFLocText(`✅ ${label}（${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}）`);
    } catch (e) { setFLocText('查詢失敗：' + e.message); }
  }

  function useCurrentLoc() {
    if (!myLoc) { alert('尚未定位成功，請改用地圖選點'); return; }
    setFormLoc({ ...myLoc });
    setFLocText(`已用目前位置（${myLoc.lat.toFixed(5)}, ${myLoc.lng.toFixed(5)}）`);
  }

  async function saveRestaurant() {
    const name = form.name.trim();
    if (!name) { alert('請填餐廳名稱'); return; }
    if (!formLoc) { alert('請設定位置（用目前位置或地圖選點）'); return; }
    setSaving(true);
    const row = {
      name, type: form.type.trim(),
      status: form.status || cfg.statuses[0]?.v || 'want',
      price: form.price || '', parking: form.parking || 'unknown',
      dishes: form.dishes.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      notes: form.notes.trim(), lat: formLoc.lat, lng: formLoc.lng,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('restaurants').update(row).eq('id', editingId);
        if (error) throw error;
        setData((d) => d.map((x) => (x.id === editingId ? { ...x, ...row } : x)));
      } else {
        const { data: ins, error } = await supabase.from('restaurants').insert(row).select().single();
        if (error) throw error;
        setData((d) => [...d, fromRow(ins)]);
      }
      resetForm(); setTab('nearby');
    } catch (e) { alert('儲存失敗：' + e.message); }
    setSaving(false);
  }

  function editRestaurant(id) {
    const r = data.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({
      name: r.name, type: r.type || '', status: r.status, price: String(r.price || ''),
      parking: r.parking || 'unknown', dishes: (r.dishes || []).join(', '), notes: r.notes || '',
    });
    setFormLoc({ lat: r.lat, lng: r.lng });
    setFLocText(`位置（${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}）`);
    setTab('add');
  }

  async function delRestaurant(id) {
    const r = data.find((x) => x.id === id);
    if (!confirm(`刪除「${r?.name}」？`)) return;
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) { alert('刪除失敗：' + error.message); return; }
    setData((d) => d.filter((x) => x.id !== id));
  }

  /* ---- 搜尋 ---- */
  const [kw, setKw] = useState('');
  const [sPrices, setSPrices] = useState([]);
  const [sDist, setSDist] = useState('1000');
  const [sPark, setSPark] = useState('');
  const [mine, setMine] = useState(null);       // null = 還沒搜過
  const [gState, setGState] = useState('idle'); // idle | loading | done | error
  const [gPlaces, setGPlaces] = useState([]);
  const [gError, setGError] = useState('');
  const [parkResults, setParkResults] = useState({});

  function matchKeyword(r, k) {
    if (!k) return true;
    const hay = (r.name + ' ' + (r.type || '') + ' ' + (r.dishes || []).join(' ') + ' ' + (r.notes || '')).toLowerCase();
    return k.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }

  async function doSearch() {
    const center = searchCenter || myLoc;
    if (!center) { alert('請先定位，或按「改定點」在地圖上選一個定點'); return; }
    const k = kw.trim();
    const maxD = Number(sDist);

    let m = data.map((r) => ({ r, d: haversine(center, r) }))
      .filter((x) => x.d <= maxD)
      .filter((x) => matchKeyword(x.r, k))
      .filter((x) => !sPrices.length || sPrices.includes(x.r.price))
      .filter((x) => {
        if (!sPark) return true;
        if (sPark === '__any') return x.r.parking === 'own' || x.r.parking === 'nearby';
        return x.r.parking === sPark;
      });
    m.sort((a, b) => {
      const w = (s) => { const i = cfg.statuses.findIndex((o) => o.v === s.r.status); return i < 0 ? 99 : i; };
      return w(a) - w(b) || a.d - b.d;
    });
    setMine(m);
    setParkResults({});

    setGState('loading');
    try {
      const j = await placesFetch('searchText', {
        textQuery: (k || '餐廳') + ' 餐廳',
        maxResultCount: 15,
        bias: { lat: center.lat, lng: center.lng, radius: Math.min(maxD, 50000) },
      });
      const excludeNames = m.map((x) => x.r.name);
      let places = (j.places || []).map((p) => ({
        id: p.id, name: p.displayName?.text || '', rating: p.rating || 0, cnt: p.userRatingCount || 0,
        lat: p.location?.latitude, lng: p.location?.longitude, addr: p.formattedAddress || '',
        uri: p.googleMapsUri,
        price: { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 }[p.priceLevel] || 0,
      }))
        .map((p) => ({ ...p, d: haversine(center, p) }))
        .filter((p) => p.d <= maxD)
        .filter((p) => !excludeNames.some((n) => (n && p.name.includes(n)) || (p.name && n.includes(p.name))));
      places.sort((a, b) => b.rating - a.rating || b.cnt - a.cnt);
      setGPlaces(places); setGState('done');
    } catch (e) { setGError(e.message); setGState('error'); }
  }

  async function checkParking(p) {
    setParkResults((s) => ({ ...s, [p.id]: 'loading' }));
    try {
      const j = await placesFetch('parkingNearby', { lat: p.lat, lng: p.lng, radius: 50 });
      const n = (j.places || []).length;
      setParkResults((s) => ({ ...s, [p.id]: n ? `🅿️ 50m內有 ${n} 個停車場` : '50m 內無停車場' }));
    } catch { setParkResults((s) => ({ ...s, [p.id]: '查詢失敗' })); }
  }

  function collectPlace(p) {
    resetForm();
    setForm((f) => ({ ...f, name: p.name, price: p.price ? String(p.price) : '' }));
    setFormLoc({ lat: p.lat, lng: p.lng });
    setFLocText(`已設定位置（${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}）`);
    setTab('add');
  }

  /* ---- 地圖選點 ---- */
  const [mapOpen, setMapOpen] = useState(false);
  const [mapMode, setMapMode] = useState('form');
  const mapObj = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    if (!mapOpen) return;
    let alive = true;
    (async () => {
      const L = (await import('leaflet')).default;
      leafletRef.current = L;
      await new Promise((r) => setTimeout(r, 80));
      if (!alive) return;
      const start = formLoc || searchCenter || myLoc || { lat: 25.0339, lng: 121.5645 };
      const placeMarker = (latlng) => {
        if (markerRef.current) markerRef.current.setLatLng(latlng);
        else markerRef.current = L.marker(latlng, {
          icon: L.divIcon({ className: 'pin', html: '📍', iconSize: [30, 30], iconAnchor: [15, 28] }),
        }).addTo(mapObj.current);
      };
      if (!mapObj.current) {
        mapObj.current = L.map('map').setView([start.lat, start.lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapObj.current);
        mapObj.current.on('click', (e) => placeMarker(e.latlng));
      } else {
        mapObj.current.setView([start.lat, start.lng], 16);
        mapObj.current.invalidateSize();
      }
      placeMarker([start.lat, start.lng]);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapOpen]);

  function openMapPicker(mode) { setMapMode(mode); setMapOpen(true); }
  function confirmMapPick() {
    if (!markerRef.current) { alert('請先點地圖選一個位置'); return; }
    const ll = markerRef.current.getLatLng();
    const loc = { lat: ll.lat, lng: ll.lng };
    if (mapMode === 'center') {
      setSearchCenter({ ...loc, auto: false });
    } else {
      setFormLoc(loc);
      setFLocText(`已設定位置（${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}）`);
    }
    setMapOpen(false);
  }

  /* ---- 設定：自訂選項 ---- */
  const [optInputs, setOptInputs] = useState({ statuses: '', prices: '', parks: '' });
  function addOpt(k) {
    const t = optInputs[k].trim();
    if (!t) return;
    if (cfg[k].some((o) => o.label === t || o.v === t)) { alert('已有相同選項'); return; }
    persistCfg({ ...cfg, [k]: [...cfg[k], { v: t, label: t }] });
    setOptInputs((s) => ({ ...s, [k]: '' }));
  }
  function delOpt(k, i) {
    const o = cfg[k][i];
    if (o.v === 'unknown') { alert('「不確定」是預設值，無法刪除'); return; }
    if (cfg[k].length <= 1) { alert('至少要保留一個選項'); return; }
    if (!confirm(`刪除選項「${o.label}」？已使用此選項的記錄會保留原值。`)) return;
    persistCfg({ ...cfg, [k]: cfg[k].filter((_, j) => j !== i) });
  }

  /* ---- 匯出 / 匯入 JSON ---- */
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '口袋餐廳備份_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  }
  async function importData(ev) {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      const arr = JSON.parse(await f.text());
      if (!Array.isArray(arr)) throw new Error('格式錯誤');
      const exist = new Set(data.map((r) => r.name + '|' + r.lat?.toFixed(5) + ',' + r.lng?.toFixed(5)));
      const rows = arr
        .filter((r) => r.name && isFinite(r.lat) && isFinite(r.lng))
        .filter((r) => !exist.has(r.name + '|' + (+r.lat).toFixed(5) + ',' + (+r.lng).toFixed(5)))
        .map((r) => ({
          name: r.name, type: r.type || '', status: r.status || 'want', price: String(r.price || ''),
          parking: r.parking || 'unknown', dishes: r.dishes || [], notes: r.notes || '',
          lat: +r.lat, lng: +r.lng,
        }));
      if (!rows.length) { alert('沒有可匯入的新記錄（可能都已存在）'); return; }
      const { data: ins, error } = await supabase.from('restaurants').insert(rows).select();
      if (error) throw error;
      setData((d) => [...d, ...ins.map(fromRow)]);
      alert(`匯入完成，新增 ${ins.length} 筆`);
    } catch (e) { alert('匯入失敗：' + e.message); }
  }

  /* ---- Google Maps Takeout CSV 匯入 ---- */
  const [gmapsStatus, setGmapsStatus] = useState('');
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n' || c === '\r') {
          if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
          if (c === '\r' && text[i + 1] === '\n') i++;
        } else cur += c;
      }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  async function importGmapsCsv(ev) {
    const files = [...ev.target.files];
    ev.target.value = '';
    if (!files.length) return;
    let items = [];
    for (const f of files) {
      const rows = parseCSV(await f.text());
      if (!rows.length) continue;
      const head = rows[0].map((h) => h.trim().toLowerCase());
      const iT = head.findIndex((h) => ['標題', 'title'].includes(h));
      const iN = head.findIndex((h) => ['附註', 'note'].includes(h));
      const iU = head.findIndex((h) => ['網址', 'url'].includes(h));
      if (iT < 0) { setGmapsStatus(`「${f.name}」不是 Google Maps 已儲存清單的 CSV，已略過`); continue; }
      rows.slice(1).forEach((r) => {
        const name = (r[iT] || '').trim();
        if (!name) return;
        items.push({
          name, note: iN >= 0 ? (r[iN] || '').trim() : '', url: iU >= 0 ? (r[iU] || '').trim() : '',
          list: f.name.replace(/\.csv$/i, ''),
        });
      });
    }
    const exist = new Set(data.map((r) => r.name));
    items = items.filter((it) => !exist.has(it.name));
    if (!items.length) { setGmapsStatus('沒有可匯入的新地點（可能都已存在）'); return; }
    if (!confirm(`找到 ${items.length} 個新地點，要全部匯入嗎？\n（狀態設為「想吃」，座標自動查出，約需 ${Math.ceil(items.length / 2)} 秒）`)) return;
    let rows = [], fail = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      setGmapsStatus(`匯入中 ${i + 1}/${items.length}：${it.name}`);
      let loc = null;
      const m = it.url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || it.url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m) loc = { lat: +m[1], lng: +m[2] }; // 網址裡有座標就直接用，不耗 API
      if (!loc) {
        try {
          const params = { textQuery: it.name, maxResultCount: 1 };
          if (myLocRef.current) params.bias = { ...myLocRef.current, radius: 50000 };
          const j = await placesFetch('searchText', params);
          const p = (j.places || [])[0];
          if (p) loc = { lat: p.location.latitude, lng: p.location.longitude };
        } catch { /* ignore */ }
      }
      if (!loc) { fail.push(it.name); continue; }
      rows.push({
        name: it.name, type: '', status: cfg.statuses[0]?.v || 'want', price: '', parking: 'unknown',
        dishes: [], notes: [it.note, '來自 Google Maps 清單：' + it.list].filter(Boolean).join('\n'),
        lat: loc.lat, lng: loc.lng,
      });
    }
    let ok = 0;
    if (rows.length) {
      const { data: ins, error } = await supabase.from('restaurants').insert(rows).select();
      if (error) { setGmapsStatus('寫入資料庫失敗：' + error.message); return; }
      setData((d) => [...d, ...ins.map(fromRow)]);
      ok = ins.length;
    }
    setGmapsStatus(`✅ 完成：匯入 ${ok} 筆` + (fail.length ? `；查不到座標 ${fail.length} 筆（${fail.join('、')}），可手動新增` : ''));
  }

  /* ---- 附近清單 ---- */
  const nearbyList = data
    .map((r) => ({ r, d: myLoc ? haversine(myLoc, r) : null }))
    .sort((a, b) => (a.d ?? 9e9) - (b.d ?? 9e9));

  /* ---- 停車下拉選項 ---- */
  const parkOptions = [];
  if (cfg.parks.some((o) => o.v === 'own') && cfg.parks.some((o) => o.v === 'nearby'))
    parkOptions.push({ v: '__any', label: '自帶或 50m 內有停車場' });
  cfg.parks.filter((o) => o.v !== 'unknown').forEach((o) => parkOptions.push(o));

  /* ================= 畫面 ================= */
  return (
    <>
      <header>
        <h1>🍽️ 口袋餐廳</h1>
        <div id="locStatus">{locStatus}</div>
      </header>

      <main>
        {/* ===== 附近 ===== */}
        <section className={'tab' + (tab === 'nearby' ? ' active' : '')}>
          <div className="locBox">
            <span>{nearbyText}</span>
            <button className="btn mini" onClick={refreshLocation}>重新定位</button>
          </div>
          {data.length === 0 ? (
            <div className="empty">還沒有任何記錄。<br />去「➕ 記錄」新增第一間餐廳吧！</div>
          ) : (
            nearbyList.map((x) => (
              <Card key={x.r.id} r={x.r} dist={x.d} lbl={lbl} onEdit={editRestaurant} onDel={delRestaurant} />
            ))
          )}
        </section>

        {/* ===== 搜尋 ===== */}
        <section className={'tab' + (tab === 'search' ? ' active' : '')}>
          <div className="locBox">
            <span>
              {searchCenter && !searchCenter.auto
                ? `📍 定點：自訂（${searchCenter.lat.toFixed(4)}, ${searchCenter.lng.toFixed(4)}）`
                : '📍 定點：目前位置'}
            </span>
            <button className="btn mini" onClick={() => openMapPicker('center')}>改定點</button>
          </div>

          <label className="f">想吃什麼？（關鍵字：牛排、火鍋、店名、菜名⋯）</label>
          <input type="text" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="例如：牛排"
            enterKeyHint="search" onKeyDown={(e) => e.key === 'Enter' && doSearch()} />

          <label className="f">價位（每人，可複選）</label>
          <Chips options={cfg.prices} value={sPrices} onChange={setSPrices} multi />

          <div className="row">
            <div>
              <label className="f">距離範圍</label>
              <select value={sDist} onChange={(e) => setSDist(e.target.value)}>
                <option value="500">500 公尺</option>
                <option value="1000">1 公里</option>
                <option value="2000">2 公里</option>
                <option value="5000">5 公里</option>
                <option value="99999000">不限</option>
              </select>
            </div>
            <div>
              <label className="f">停車條件</label>
              <select value={sPark} onChange={(e) => setSPark(e.target.value)}>
                <option value="">不限</option>
                {parkOptions.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <button className="btn" onClick={doSearch}>🔍 搜尋</button>
          <p className="hint">結果順序：①你記錄過「想吃」的 → ②你吃過的 → ③附近 Google 高評價餐廳。停車條件套用在你自己的記錄；Google 結果可逐間按「查停車」。</p>

          {mine !== null && (
            <>
              <div className="secTitle">📒 我的口袋名單 <span className="cnt">{mine.length} 間（想吃優先）</span></div>
              {mine.length
                ? mine.map((x) => <Card key={x.r.id} r={x.r} dist={x.d} lbl={lbl} onEdit={editRestaurant} onDel={delRestaurant} />)
                : <div className="empty" style={{ padding: 14 }}>沒有符合的記錄</div>}

              <div className="secTitle">🌐 附近 Google 高評價 <span className="cnt">評價高→低</span></div>
              {gState === 'loading' && <div className="empty" style={{ padding: 14 }}><span className="spin" /> 搜尋中…</div>}
              {gState === 'error' && <div className="empty" style={{ padding: 14 }}>Google 搜尋失敗：{gError}</div>}
              {gState === 'done' && (gPlaces.length
                ? gPlaces.map((p) => (
                    <GoogleCard key={p.id} p={p} parkState={parkResults[p.id]}
                      onCheckParking={() => checkParking(p)} onCollect={() => collectPlace(p)} />
                  ))
                : <div className="empty" style={{ padding: 14 }}>Google 找不到符合的餐廳</div>)}
            </>
          )}
        </section>

        {/* ===== 新增 / 編輯 ===== */}
        <section className={'tab' + (tab === 'add' ? ' active' : '')}>
          <h2 style={{ fontSize: 17 }}>{editingId ? '✏️ 編輯：' + form.name : '➕ 記錄一間餐廳'}</h2>

          <label className="f">餐廳名稱 *</label>
          <input type="text" value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="例如：教父牛排" />

          <label className="f">類型</label>
          <input type="text" value={form.type} onChange={(e) => setF('type', e.target.value)} list="typeList" placeholder="例如：牛排" />
          <datalist id="typeList">
            <option value="牛排" /><option value="火鍋" /><option value="日式" /><option value="韓式" />
            <option value="中式" /><option value="義式" /><option value="美式" /><option value="燒肉" />
            <option value="小吃" /><option value="甜點" /><option value="咖啡" /><option value="早午餐" />
          </datalist>

          <label className="f">狀態 <span style={{ fontWeight: 400, color: 'var(--muted)' }}>（可在設定新增選項）</span></label>
          <Chips options={cfg.statuses} value={form.status} onChange={(v) => setF('status', v)} />

          <label className="f">價位（每人）</label>
          <Chips options={cfg.prices} value={form.price} onChange={(v) => setF('price', v)} />

          <label className="f">停車</label>
          <Chips options={cfg.parks} value={form.parking} onChange={(v) => setF('parking', v)} />

          <label className="f">推薦菜（逗號分隔）</label>
          <input type="text" value={form.dishes} onChange={(e) => setF('dishes', e.target.value)} placeholder="例如：肋眼牛排, 蒜香奶油麵包" />

          <label className="f">備註</label>
          <textarea value={form.notes} onChange={(e) => setF('notes', e.target.value)} placeholder="例如：要先訂位、週一公休" />

          <label className="f">位置 *</label>
          <input type="text" value={fAddr} onChange={(e) => setFAddr(e.target.value)} enterKeyHint="search"
            placeholder="輸入地址或店名，例如：台北市信義區市府路45號"
            onKeyDown={(e) => e.key === 'Enter' && geocodeAddr()} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sub" style={{ marginTop: 0 }} onClick={geocodeAddr}>🔎 地址轉座標</button>
            <button className="btn sub" style={{ marginTop: 0 }} onClick={useCurrentLoc}>📍 目前位置</button>
            <button className="btn sub" style={{ marginTop: 0 }} onClick={() => openMapPicker('form')}>🗺️ 地圖選點</button>
          </div>
          <p className="hint">{fLocText}</p>

          <button className="btn" onClick={saveRestaurant} disabled={saving}>
            {saving ? '儲存中…' : editingId ? '更新' : '儲存'}
          </button>
          {editingId && <button className="btn sub" onClick={resetForm}>取消編輯</button>}
        </section>

        {/* ===== 設定 ===== */}
        <section className={'tab' + (tab === 'settings' ? ' active' : '')}>
          <h2 style={{ fontSize: 17 }}>⚙️ 設定</h2>

          <div className="secTitle">👤 帳號</div>
          <div className="account">
            {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" referrerPolicy="no-referrer" />}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user.user_metadata?.full_name || 'Google 帳號'}</div>
              <div className="em">{user.email}</div>
            </div>
          </div>
          <button className="btn sub" onClick={() => supabase.auth.signOut()}>登出</button>

          <div className="secTitle" style={{ marginTop: 26 }}>🏷️ 自訂選項（點 ✕ 可刪除）</div>
          {[
            ['statuses', '狀態選項', '例如：💔 雷店'],
            ['prices', '價位選項', '例如：$$$$$ 2000+'],
            ['parks', '停車選項', '例如：🛵 機車好停'],
          ].map(([k, title, ph]) => (
            <div key={k}>
              <label className="f">{title}</label>
              <div className="chips">
                {cfg[k].map((o, i) => (
                  <div key={o.v} className="chip">
                    {o.label}<span className="del" onClick={() => delOpt(k, i)}>✕</span>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <input type="text" value={optInputs[k]} placeholder={ph}
                  onChange={(e) => setOptInputs((s) => ({ ...s, [k]: e.target.value }))} />
                <button className="btn mini" onClick={() => addOpt(k)}>新增</button>
              </div>
            </div>
          ))}
          <p className="hint">刪除選項後，已使用該選項的舊記錄會保留原本的值。</p>

          <div className="secTitle" style={{ marginTop: 26 }}>📦 資料（{data.length} 筆記錄）</div>
          <div className="row">
            <button className="btn sub" style={{ marginTop: 0 }} onClick={exportData}>匯出備份</button>
            <button className="btn sub" style={{ marginTop: 0 }} onClick={() => document.getElementById('importFile').click()}>匯入備份</button>
          </div>
          <input type="file" id="importFile" accept=".json" style={{ display: 'none' }} onChange={importData} />
          <p className="hint">資料已存在雲端，任何裝置登入同一個 Google 帳號都看得到。「匯入備份」也可用來搬移舊版（單檔網頁）匯出的 JSON。</p>

          <div className="secTitle" style={{ marginTop: 26 }}>🗺️ 從 Google Maps「已儲存」匯入</div>
          <p className="hint">
            1. 開 <a href="https://takeout.google.com" target="_blank" rel="noreferrer">takeout.google.com</a> →「取消全選」→ 只勾「<b>已儲存</b>」→ 下一步 → 建立匯出<br />
            2. 收到信後下載 ZIP、解壓縮，每個清單是一個 CSV 檔（如「想去的地方.csv」）<br />
            3. 在下方選擇 CSV 檔（可多選），座標會自動查出，狀態預設「想吃」
          </p>
          <button className="btn sub" style={{ marginTop: 8 }} onClick={() => document.getElementById('gmapsCsv').click()}>選擇 CSV 檔匯入</button>
          <input type="file" id="gmapsCsv" accept=".csv" multiple style={{ display: 'none' }} onChange={importGmapsCsv} />
          <p className="hint">{gmapsStatus}</p>

          <div className="secTitle" style={{ marginTop: 26 }}>📲 安裝到手機</div>
          <p className="hint">手機瀏覽器開啟本站網址 → 分享 → 「加入主畫面」，就像 app 一樣使用。</p>
        </section>
      </main>

      {/* bottom nav */}
      <nav>
        {[
          ['nearby', '📍', '附近'], ['search', '🔍', '搜尋'], ['add', '➕', '記錄'], ['settings', '⚙️', '設定'],
        ].map(([t, ic, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            <span className="ic">{ic}</span>{label}
          </button>
        ))}
      </nav>

      {/* map picker modal（常駐 DOM，地圖物件可重用） */}
      <div id="mapModal" className={mapOpen ? 'open' : ''}>
        <div className="sheet">
          <b>{mapMode === 'center' ? '點地圖設定搜尋定點' : '點地圖選擇餐廳位置'}</b>
          <div id="map" />
          <button className="btn" style={{ marginTop: 0 }} onClick={confirmMapPick}>確認這個位置</button>
          <button className="btn sub" onClick={() => setMapOpen(false)}>取消</button>
        </div>
      </div>
    </>
  );
}

/* ================= 入口 ================= */
export default function Page() {
  const [session, setSession] = useState(undefined); // undefined = 載入中

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return <div className="loadingScreen"><span className="spin" /> 載入中…</div>;
  if (!session) return <Login />;
  return <App key={session.user.id} session={session} />;
}
