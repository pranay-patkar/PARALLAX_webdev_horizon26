// ===== RIDER LOCATION MAP (Leaflet.js) =====
// Injected into Manager dashboard

let _riderMap       = null;
let _riderMarkers   = [];
let _riderMapInited = false;

const RIDERS = [
  { id: 1, name: 'Arjun K.',   lat: 19.0760, lng: 72.8777, status: 'delivering', order: '#4521', eta: 4,  dist: 1.2 },
  { id: 2, name: 'Ravi M.',    lat: 19.0820, lng: 72.8850, status: 'delivering', order: '#4522', eta: 7,  dist: 2.1 },
  { id: 3, name: 'Sneha P.',   lat: 19.0700, lng: 72.8700, status: 'idle',       order: null,    eta: 0,  dist: 0   },
  { id: 4, name: 'Kiran T.',   lat: 19.0790, lng: 72.8900, status: 'delayed',    order: '#4518', eta: 18, dist: 3.4 },
  { id: 5, name: 'Deepak R.',  lat: 19.0850, lng: 72.8650, status: 'delivering', order: '#4523', eta: 5,  dist: 1.8 },
  { id: 6, name: 'Meera S.',   lat: 19.0730, lng: 72.8800, status: 'idle',       order: null,    eta: 0,  dist: 0   },
  { id: 7, name: 'Amit V.',    lat: 19.0810, lng: 72.8720, status: 'delivering', order: '#4524', eta: 9,  dist: 2.7 },
  { id: 8, name: 'Pooja L.',   lat: 19.0760, lng: 72.8950, status: 'delayed',    order: '#4519', eta: 22, dist: 4.1 },
];

function getRiderColor(status) {
  return status === 'delivering' ? '#16a34a'
       : status === 'delayed'    ? '#dc2626'
       : '#6b7280';
}

function getRiderIcon(status) {
  const color = getRiderColor(status);
  const emoji = status === 'delivering' ? '🛵' : status === 'delayed' ? '⚠️' : '⏸';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:#fff;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      border:2px solid #fff;
      cursor:pointer;
    ">${emoji}</div>`,
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
  });
}

function buildPopup(r) {
  const statusColor = getRiderColor(r.status);
  const statusLabel = r.status === 'delivering' ? '🟢 Delivering'
                    : r.status === 'delayed'    ? '🔴 Delayed'
                    : '⚫ Idle';
  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:160px;padding:4px">
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">${r.name}</div>
      <div style="font-size:12px;color:${statusColor};font-weight:600;margin-bottom:4px">${statusLabel}</div>
      ${r.order ? `<div style="font-size:12px;margin-bottom:2px">Order: <strong>${r.order}</strong></div>` : ''}
      ${r.eta   ? `<div style="font-size:12px;margin-bottom:2px">ETA: <strong>${r.eta} mins</strong></div>` : ''}
      ${r.dist  ? `<div style="font-size:12px">Distance: <strong>${r.dist} km</strong></div>` : ''}
    </div>`;
}

function initRiderMap() {
  if (_riderMapInited) return;
  const el = document.getElementById('riderMap');
  if (!el || typeof L === 'undefined') return;

  _riderMap = L.map('riderMap', { zoomControl: true, scrollWheelZoom: false })
               .setView([19.0780, 72.8800], 14);

  // Dark/light aware tile layer
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  L.tileLayer(
    isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
  ).addTo(_riderMap);

  // Warehouse marker
  const warehouseIcon = L.divIcon({
    className: '',
    html: `<div style="background:#1B2B4B;color:#fff;border-radius:6px;padding:4px 8px;font-size:11px;font-family:'IBM Plex Mono',monospace;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏪 WH-01</div>`,
    iconAnchor: [30, 12],
  });
  L.marker([19.0760, 72.8777], { icon: warehouseIcon }).addTo(_riderMap);

  // Rider markers
  _riderMarkers = RIDERS.map(r => {
    const m = L.marker([r.lat, r.lng], { icon: getRiderIcon(r.status) })
               .addTo(_riderMap)
               .bindPopup(buildPopup(r));
    return { marker: m, rider: r };
  });

  _riderMapInited = true;
}

function updateRiderMap() {
  if (!_riderMapInited || !_riderMap) return;
  const d = liveData;

  // Update rider statuses based on scenario
  RIDERS.forEach((r, i) => {
    // Nudge position slightly
    r.lat += (Math.random() - 0.5) * 0.0008;
    r.lng += (Math.random() - 0.5) * 0.0008;

    // Scenario-aware status
    if (d.delivery > 20) {
      // delivery crisis — most riders delayed
      r.status = i < 5 ? 'delayed' : i < 7 ? 'delivering' : 'idle';
      r.eta    = r.status === 'delayed' ? Math.round(d.delivery + Math.random() * 10) : Math.round(5 + Math.random() * 5);
    } else if (d.orders > 160) {
      // rush hour — all riders active
      r.status = i < 6 ? 'delivering' : 'delayed';
      r.eta    = Math.round(d.delivery + (Math.random() - 0.5) * 4);
    } else {
      // normal
      r.status = i < 4 ? 'delivering' : i < 6 ? 'idle' : i === 6 ? 'delivering' : 'delayed';
      r.eta    = r.status === 'delivering' ? Math.round(d.delivery + (Math.random() - 0.5) * 3) : 0;
    }

    const entry = _riderMarkers[i];
    entry.rider = r;
    entry.marker.setLatLng([r.lat, r.lng]);
    entry.marker.setIcon(getRiderIcon(r.status));
    entry.marker.setPopupContent(buildPopup(r));
  });

  // Update summary legend
  const delivering = RIDERS.filter(r => r.status === 'delivering').length;
  const delayed    = RIDERS.filter(r => r.status === 'delayed').length;
  const idle       = RIDERS.filter(r => r.status === 'idle').length;
  const legend     = document.getElementById('riderLegend');
  if (legend) {
    legend.innerHTML = `
      <span style="color:#16a34a">🟢 ${delivering} delivering</span>
      <span style="color:#dc2626">🔴 ${delayed} delayed</span>
      <span style="color:#6b7280">⚫ ${idle} idle</span>`;
  }
}

function renderRiderMapCard() {
  return `
  <div class="card" id="riderMapCard" style="margin-bottom:16px">
    <div class="card-header">
      <div>
        <div class="card-title">🛵 Live Rider Tracker</div>
        <div class="card-subtitle">Mumbai — real-time delivery positions</div>
      </div>
      <div id="riderLegend" style="display:flex;gap:16px;font-size:12px;font-family:'IBM Plex Mono',monospace"></div>
    </div>
    <div id="riderMap" style="height:320px;border-radius:4px;overflow:hidden;border:1px solid var(--border)"></div>
  </div>`;
}

// Re-init map tile layer on theme change
function refreshMapTheme() {
  if (!_riderMap) return;
  _riderMap.eachLayer(l => { if (l instanceof L.TileLayer) _riderMap.removeLayer(l); });
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  L.tileLayer(
    isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
  ).addTo(_riderMap);
}
