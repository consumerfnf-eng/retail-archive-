/* ============================================
   F&F Retail Archive - Configuration
   설정값 모음 (시트 URL, 브랜드 그룹핑, Fabric 분류)
   ============================================ */

// ============================================
// 표준 컬럼 매핑 (CONFIG보다 먼저 와야 함!)
// ============================================
const DEFAULT_COLUMNS = {
  season: 'season',
  country: 'country',
  brand: 'brand',
  gender: 'gender',
  category: 'category',
  product_name: 'product_name',
  color: 'color',
  hex: 'image_hex_color',
  image_url: 'image_url',
  fabric: 'material',
};

const CONFIG = {
  SHEETS: [
    { id: '1iqyZhiZhEtKC3HKSI_bRFT_V8nxEy4HyaBTn5TOm644', gid: '0', label: '애슬레저',        defaultCountry: 'GL', columns: DEFAULT_COLUMNS },
    { id: '1hRSkBD82TnzqusqH79qy-k0kSMGGqx5XbTk5dbnA1-A', gid: '0', label: '아웃도어·스포츠', defaultCountry: 'GL', columns: DEFAULT_COLUMNS },
    { id: '1VOOVTnp_T8YUqb_O06a_O02VNM3_jEJTLwIXfTEsKx0', gid: '0', label: '럭셔리',          defaultCountry: 'GL', columns: DEFAULT_COLUMNS },
    { id: '1tA9UpzRober_qfosSOv2hwkrq5d8hAG-jeEn8dY21RQ', gid: '0', label: '중국 컬러',       defaultCountry: 'CN', columns: DEFAULT_COLUMNS },
    { id: '1ie6e9jQAkauBdBssqCH1DuyZHcGLyb2KDTysFdHV3Vc', gid: '0', label: '국내 브랜드',     defaultCountry: 'KR', columns: DEFAULT_COLUMNS },
    ],

  getCsvUrl(sheet) {
    return `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv&gid=${sheet.gid}`;
  },

  PAGE_SIZE: 60
};

// ============================================
// 브랜드 그룹 분류 (좌측 사이드바 표시 순서)
// ============================================
const BRAND_GROUP_ORDER = ["럭셔리", "컨템포러리", "애슬레저", "아웃도어·스포츠", "코트", "기타"];

// ============================================
// Country 코드 → 라벨 매핑
// ============================================
const COUNTRY_ORDER = ["GL", "EU", "CN", "KR"];
const COUNTRY_LABEL = {
  "GL": "Global",
  "EU": "Europe · 유럽",
  "CN": "China · 중국",
  "KR": "Korea · 한국"
};

function normalizeCountry(val) {
  if (!val) return null;
  const s = val.toString().trim().toUpperCase();
  if (!s) return null;
  if (s === "GL" || s === "GLOBAL" || s === "글로벌") return "GL";
  if (s === "EU" || s === "EUROPE" || s === "유럽") return "EU";
  if (s === "CN" || s === "CHINA" || s === "중국") return "CN";
  if (s === "KR" || s === "KOREA" || s === "한국") return "KR";
  return s;
}

function countryLabel(code) {
  return COUNTRY_LABEL[code] || code || "—";
}

// 명시적 브랜드 → 그룹 매핑
const BRAND_GROUP_MAP = {
  // === 컨템포러리 ===
  "론론": "컨템포러리",
  "파르티멘토 우먼": "컨템포러리",
  "튜드먼트": "컨템포러리",
  "더바넷": "컨템포러리",
  "던스트": "컨템포러리",
  "레이브": "컨템포러리",
  "르바": "컨템포러리",
  "썸웨어버터": "컨템포러리",
  "썸웨어 버터": "컨템포러리",
  "Urban Revivo": "컨템포러리",
  "Rosemoo": "컨템포러리",
  "Miss Sixty": "컨템포러리",
  "MO&Co.": "컨템포러리",
  "MO&Co": "컨템포러리",
  "JNBY": "컨템포러리",
  "Uniqlo": "컨템포러리",
  "Ralph Lauren": "컨템포러리",

  // === 애슬레저 ===
  "Lululemon": "애슬레저",
  "ALO YOGA": "애슬레저",
  "Aritzia": "애슬레저",
  "Skims": "애슬레저",
  "Sporty and Rich": "애슬레저",
  "Adanola": "애슬레저",

  // === 아웃도어·스포츠 ===
  "On": "아웃도어·스포츠",
  "On Running": "아웃도어·스포츠",
  "FILA": "아웃도어·스포츠",
  "Adidas": "아웃도어·스포츠",
  "Puma": "아웃도어·스포츠",
  "Asics": "아웃도어·스포츠",
  "New Balance": "아웃도어·스포츠",
  "The North Face": "아웃도어·스포츠",
  "Salomon": "아웃도어·스포츠",
  "Sansan Gear": "아웃도어·스포츠",
  "Nike": "아웃도어·스포츠",
  "Kolon Sport": "아웃도어·스포츠",
  "Kailas": "아웃도어·스포츠",
  "Columbia": "아웃도어·스포츠",
  "Goldwin": "아웃도어·스포츠",
  "Descente": "아웃도어·스포츠",
  "Anta Sports": "아웃도어·스포츠",
  "Anta": "아웃도어·스포츠",
  "Bodywild": "아웃도어·스포츠",
  "Balabala": "아웃도어·스포츠",
  "K-Swiss": "아웃도어·스포츠",
  "Ducati": "아웃도어·스포츠",

  // === 코트 ===
  // (court) 포함 브랜드명은 getBrandGroup()에서 자동 처리
  "Lacoste": "코트",
};

/**
 * 브랜드명에서 괄호 태그 제거한 순수 브랜드명 반환
 * "FILA (CN)" → "FILA", "Nike (court)(EU)" → "Nike"
 */
function cleanBrandName(brandName) {
  if (!brandName) return brandName;
  return brandName.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * 브랜드명에서 (CN)/(KR)/(EU) 등 country 태그 추출
 * (court)는 country 아니므로 무시
 */
function getBrandCountryTag(brandName) {
  if (!brandName) return null;
  const tags = [...brandName.matchAll(/\(([A-Za-z]{2,3})\)/g)].map(m => m[1].toUpperCase());
  const countryTags = tags.filter(t => t !== "COURT");
  return countryTags.length > 0 ? countryTags[0] : null;
}

/**
 * 브랜드명 → 그룹 반환
 * (court) 포함 → 코트
 * 그 외 → MAP 조회 (태그 제거 후 clean 이름으로)
 * country prefix는 절대 붙이지 않음 — country는 country 필드로만 구분
 */
function getBrandGroup(brandName) {
  if (!brandName) return null;
  if (brandName.toLowerCase().includes("(court)")) return "코트";
  const clean = cleanBrandName(brandName);
  return BRAND_GROUP_MAP[brandName] ?? BRAND_GROUP_MAP[clean] ?? null;
}

// ============================================
// Fabric 카테고리 정의 (12개 그룹)
// ============================================
const FABRIC_CATEGORIES = [
  { key: "cotton_100",   label: "Cotton 100%",           short: "Cotton\n100%",     color: "#c98f5e" },
  { key: "cotton_blend", label: "Cotton Blend",          short: "Cotton\nBlend",    color: "#8a6f57" },
  { key: "denim",        label: "Denim",                 short: "Denim",            color: "#3f5d8f" },
  { key: "synth_perf",   label: "Synthetic Performance", short: "Synth\nPerf",      color: "#cc785c" },
  { key: "synth_blend",  label: "Synthetic Blend",       short: "Synth\nBlend",     color: "#a85a3f" },
  { key: "wool_cash",    label: "Wool / Cashmere",       short: "Wool\nCash",       color: "#6a5587" },
  { key: "modal_tencel", label: "Modal / Tencel",        short: "Modal\nTencel",    color: "#5b8f93" },
  { key: "down_insul",   label: "Down / Insulation",     short: "Down\nInsul",      color: "#d8c452" },
  { key: "leather",      label: "Leather / Suede",       short: "Leather",          color: "#5c4236" },
  { key: "fauxfur",      label: "Faux Fur / Sherpa",     short: "Faux Fur\nSherpa", color: "#b89e86" },
  { key: "silk_satin",   label: "Silk / Satin",          short: "Silk\nSatin",      color: "#c98aa6" },
  { key: "other",        label: "Other",                 short: "Other",            color: "#8d8c86" }
];

function classifyFabric(fabricStr) {
  if (!fabricStr || !fabricStr.trim()) return null;
  const s = fabricStr.toLowerCase();

  if (/\b(denim|jean)\b/.test(s)) return "denim";
  if (/\b(leather|suede|nubuck|nappa|calfskin|lambskin|sheepskin)\b/.test(s)) return "leather";
  if (/\b(faux\s*fur|sherpa|shearling|fleece|teddy|fur|mohair)\b/.test(s)) return "fauxfur";
  if (/\b(down|primaloft|thinsulate|insulation|padded|puffer|longue\s*saison)\b/.test(s)) return "down_insul";
  if (/\b(wool|cashmere|merino|alpaca|tweed|gabardine)\b/.test(s)) return "wool_cash";
  if (/\b(silk|satin|charmeuse)\b/.test(s)) return "silk_satin";
  if (/\b(modal|tencel|lyocell|viscose|rayon|bamboo)\b/.test(s)) return "modal_tencel";

  const isCotton = /\b(cotton|poplin|piquet|jersey|gabardine|corduroy|flannel)\b/.test(s);
  if (isCotton) {
    if (/100\s*%?\s*cotton|cotton\s*100/.test(s)) return "cotton_100";
    if (/\b(blend|stretch|elastane|spandex|polyester|nylon)\b/.test(s)) return "cotton_blend";
    if (/^[^,&+]*cotton[^,&+]*$/.test(s.trim())) return "cotton_100";
    return "cotton_blend";
  }

  const hasSynth = /\b(polyester|nylon|elastane|spandex|lycra|polyamide|acrylic|recycled\s*poly|ripstop)\b/.test(s);
  if (hasSynth) {
    if (/100\s*%/.test(s) && !/\b(and|\+|,|blend)\b/.test(s)) return "synth_perf";
    if (/\b(cotton|wool|silk|linen)\b/.test(s)) return "synth_blend";
    return "synth_perf";
  }

  return "other";
}

function fabricLabel(key) {
  const f = FABRIC_CATEGORIES.find(c => c.key === key);
  return f ? f.label : "Other";
}
function fabricColor(key) {
  const f = FABRIC_CATEGORIES.find(c => c.key === key);
  return f ? f.color : "#8d8c86";
}
