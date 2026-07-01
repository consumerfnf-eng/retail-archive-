/* ============================================
   F&F Retail Archive - Utilities
   유틸 함수 모음
   ============================================ */

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uniq = a => [...new Set(a)];

const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const monthLabel = m => {
     if (!m || !m.includes("-")) return m || "";
     const [y, mm] = m.split("-");
     const month = parseInt(mm, 10);
     if (month < 1 || month > 12) return m;
     const q = Math.ceil(month / 3);
     return y + " " + q + "Q";
};

const PH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

/* ============================================
   이미지 프록시
   referer 차단하는 도메인(KREAM 등)은 프록시로 우회
   여러 프록시를 fallback으로 시도
   ============================================ */
const PROXY_DOMAINS = [
  'kream-phinf.pstatic.net',
  'pstatic.net',
  'naver.net',
  'kreamcdn.com'
];

// 프록시 후보들 - 순서대로 시도
const PROXY_PROVIDERS = [
  url => `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`,
  url => `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

function needsProxy(url) {
  if (!url || !url.trim()) return false;
  return PROXY_DOMAINS.some(d => url.includes(d));
}

function proxyImage(url, providerIdx) {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (trimmed.includes('images.weserv.nl') || trimmed.includes('wsrv.nl') ||
      trimmed.includes('allorigins') || trimmed.includes('corsproxy')) return trimmed;
  if (!needsProxy(trimmed)) return trimmed;
  const idx = providerIdx || 0;
  const provider = PROXY_PROVIDERS[idx];
  if (!provider) return trimmed;  // 모든 프록시 시도 끝나면 원본
  return provider(trimmed);
}

/* 이미지 fallback 핸들러 - onerror에서 다음 프록시 시도 */
function imgFallback(imgEl, origUrl) {
  const tried = parseInt(imgEl.dataset.tried || '0', 10);
  const nextIdx = tried + 1;
  if (nextIdx >= PROXY_PROVIDERS.length) {
    // 모든 프록시 실패 - 숨김
    imgEl.style.display = 'none';
    return;
  }
  imgEl.dataset.tried = nextIdx;
  imgEl.src = proxyImage(origUrl, nextIdx);
}

/* hex -> 색계열 그룹핑 (도넛 차트용) */
function colorFamily(hex) {
  const h = hex.replace('#','');
  if (h.length < 6) return {name:"기타", rep:hex};
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  const l = (max+min) / 2;
  if (d < 22) {
    if (l < 55)  return {name:"Black",       rep:"#1d1d1b"};
    if (l < 140) return {name:"Grey",        rep:"#8d8c86"};
    if (l < 205) return {name:"Light Grey",  rep:"#cbc9c1"};
    return {name:"White / Ivory", rep:"#eeeae0"};
  }
  let hue = 0;
  if (max === r) hue = ((g-b)/d) % 6;
  else if (max === g) hue = (b-r)/d + 2;
  else hue = (r-g)/d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  // 베이지/브라운 (저채도 따뜻한색)
  if (hue < 45 && d < 95 && l < 175) return {name:"Brown / Tan", rep:"#8a6f57"};
  if (hue < 16 || hue >= 345) return {name:"Red",    rep:"#b6403a"};
  if (hue < 45)  return {name:"Orange / Beige", rep:"#c98f5e"};
  if (hue < 70)  return {name:"Yellow", rep:"#d8c452"};
  if (hue < 160) return {name:"Green",  rep:"#5c7d54"};
  if (hue < 200) return {name:"Teal",   rep:"#5b8f93"};
  if (hue < 255) return {name:"Blue",   rep:"#3f5d8f"};
  if (hue < 290) return {name:"Purple", rep:"#6a5587"};
  return {name:"Pink", rep:"#c98aa6"};
}

/* CSV 셀 이스케이프 */
function csvCell(v) {
  v = (v == null ? "" : String(v));
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function stamp() {
  const d = new Date();
  return d.getFullYear() +
    ("0"+(d.getMonth()+1)).slice(-2) +
    ("0"+d.getDate()).slice(-2);
}

function showToast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2400);
}

/* 히트맵 셀 색 농도 - 비중에 따라 색 진해짐 */
function heatColor(pct, baseColor) {
  // pct: 0~100
  // 0% → 패널 배경, 100% → baseColor
  if (pct === 0) return null;
  // 최소 농도 보장 (1% 이상이면 보이게)
  const alpha = Math.max(0.15, Math.min(1, pct / 50));
  // hex → rgba
  const h = baseColor.replace('#','');
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
