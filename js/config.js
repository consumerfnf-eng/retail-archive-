/* ============================================
   F&F Retail Archive - Configuration
   설정값 모음 (시트 URL, 브랜드 그룹핑, Fabric 분류)
   ============================================ */

const CONFIG = {
  // ============================================
  // 다중 Google Sheets 설정
  // 새 시트 추가 시 SHEETS 배열에 객체 추가
  // ============================================
  SHEETS: [
    {
      id: '1iqyZhiZhEtKC3HKSI_bRFT_V8nxEy4HyaBTn5TOm644',
      gid: '0',
      label: '애슬레저',           // 카테고리 그룹 라벨
      defaultSeason: '2025-12',    // season 컬럼 없을 때 fallback
      // 컬럼 매핑 (시트마다 다를 수 있어서 명시)
      columns: {
        season: null,              // season 컬럼 없음
        brand: 'brand',
        gender: 'gender',
        category: 'category1',     // 'category1' 사용
        product_name: 'product_name',
        color: 'color',
        hex: 'image_hex_color',
        image_url: 'image_url',
        debug: 'debug',
        fabric: 'fabric'           // J열
      }
    },
    {
      id: '1hRSkBD82TnzqusqH79qy-k0kSMGGqx5XbTk5dbnA1-A',
      gid: '0',
      label: '아웃도어·스포츠',
      defaultSeason: '2025-09',
      columns: {
        season: 'season',          // A열에 season
        brand: 'brand',
        gender: 'gender',
        category: 'category',
        product_name: 'product_name',
        color: null,               // color 컬럼 없음
        hex: 'image_hex_color',
        image_url: 'image_url',
        debug: 'debug',
        fabric: null               // fabric 비어있음 (나중에 추가)
      }
    },
    {
      id: '1VOOVTnp_T8YUqb_O06a_O02VNM3_jEJTLwIXfTEsKx0',
      gid: '0',
      label: '럭셔리',
      defaultSeason: '2025-12',
      columns: {
        season: 'season',
        brand: 'brand',
        gender: 'gender',
        category: 'category',
        product_name: 'product_name',
        color: 'color',
        hex: 'image_hex_color',
        image_url: 'image_url',
        debug: 'debug',
        fabric: 'material'         // 럭셔리 시트는 'material' 컬럼이 fabric
      }
    }
  ],

  // 시트 CSV export URL 생성
  getCsvUrl(sheet) {
    return `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv&gid=${sheet.gid}`;
  },

  // 페이지당 표시 제품 수
  PAGE_SIZE: 60
};

// ============================================
// 브랜드 그룹 분류 (좌측 사이드바 표시 순서)
// 시트의 label과 매칭 - 시트가 자동으로 그룹 결정
// ============================================
const BRAND_GROUP_ORDER = ["럭셔리", "애슬레저", "아웃도어·스포츠", "국내 브랜드", "기타"];

// 명시적 브랜드 → 그룹 매핑 (시트 라벨로 자동 결정되지만, 예외 처리용)
// 비워두면 시트의 label이 그대로 brandGroup이 됨
const BRAND_GROUP_MAP = {
  // 필요 시 여기에 예외 추가
  // 예: "ALO YOGA": "애슬레저"
};

// ============================================
// Fabric 카테고리 정의 (12개 그룹)
// ============================================
const FABRIC_CATEGORIES = [
  { key: "cotton_100",   label: "Cotton 100%",     short: "Cotton\n100%",    color: "#c98f5e" },
  { key: "cotton_blend", label: "Cotton Blend",    short: "Cotton\nBlend",   color: "#8a6f57" },
  { key: "denim",        label: "Denim",           short: "Denim",           color: "#3f5d8f" },
  { key: "synth_perf",   label: "Synthetic Performance", short: "Synth\nPerf",  color: "#cc785c" },
  { key: "synth_blend",  label: "Synthetic Blend", short: "Synth\nBlend",    color: "#a85a3f" },
  { key: "wool_cash",    label: "Wool / Cashmere", short: "Wool\nCash",      color: "#6a5587" },
  { key: "modal_tencel", label: "Modal / Tencel",  short: "Modal\nTencel",   color: "#5b8f93" },
  { key: "down_insul",   label: "Down / Insulation", short: "Down\nInsul",   color: "#d8c452" },
  { key: "leather",      label: "Leather / Suede", short: "Leather",         color: "#5c4236" },
  { key: "fauxfur",      label: "Faux Fur / Sherpa", short: "Faux Fur\nSherpa", color: "#b89e86" },
  { key: "silk_satin",   label: "Silk / Satin",    short: "Silk\nSatin",     color: "#c98aa6" },
  { key: "other",        label: "Other",           short: "Other",           color: "#8d8c86" }
];

/**
 * Fabric 문자열 → 카테고리 키 자동 분류
 * 시트에 fabric 컬럼이 비어있으면 null 반환
 */
function classifyFabric(fabricStr) {
  if (!fabricStr || !fabricStr.trim()) return null;
  const s = fabricStr.toLowerCase();

  // Denim
  if (/\b(denim|jean)\b/.test(s)) return "denim";

  // Leather / Suede / Nubuck
  if (/\b(leather|suede|nubuck|nappa|calfskin|lambskin|sheepskin)\b/.test(s)) return "leather";

  // Faux Fur / Sherpa / Fleece / Teddy / Shearling
  if (/\b(faux\s*fur|sherpa|shearling|fleece|teddy|fur|mohair)\b/.test(s)) return "fauxfur";

  // Down / Insulation / Padded
  if (/\b(down|primaloft|thinsulate|insulation|padded|puffer|longue\s*saison)\b/.test(s)) return "down_insul";

  // Wool / Cashmere
  if (/\b(wool|cashmere|merino|alpaca|tweed|gabardine)\b/.test(s)) return "wool_cash";

  // Silk / Satin
  if (/\b(silk|satin|charmeuse)\b/.test(s)) return "silk_satin";

  // Modal / Tencel / Lyocell / Viscose
  if (/\b(modal|tencel|lyocell|viscose|rayon|bamboo)\b/.test(s)) return "modal_tencel";

  // Cotton 분류
  const isCotton = /\b(cotton|poplin|piquet|jersey|gabardine|corduroy|flannel)\b/.test(s);
  if (isCotton) {
    if (/100\s*%?\s*cotton|cotton\s*100/.test(s)) return "cotton_100";
    if (/\b(blend|stretch|elastane|spandex|polyester|nylon)\b/.test(s)) return "cotton_blend";
    // 단순히 cotton만 명시된 경우 = cotton_100
    if (/^[^,&+]*cotton[^,&+]*$/.test(s.trim())) return "cotton_100";
    return "cotton_blend";
  }

  // 합성섬유
  const hasSynth = /\b(polyester|nylon|elastane|spandex|lycra|polyamide|acrylic|recycled\s*poly|ripstop)\b/.test(s);
  if (hasSynth) {
    if (/100\s*%/.test(s) && !/\b(and|\+|,|blend)\b/.test(s)) return "synth_perf";
    if (/\b(cotton|wool|silk|linen)\b/.test(s)) return "synth_blend";
    return "synth_perf";
  }

  return "other";
}

/** fabric 키 → label */
function fabricLabel(key) {
  const f = FABRIC_CATEGORIES.find(c => c.key === key);
  return f ? f.label : "Other";
}
function fabricColor(key) {
  const f = FABRIC_CATEGORIES.find(c => c.key === key);
  return f ? f.color : "#8d8c86";
}
