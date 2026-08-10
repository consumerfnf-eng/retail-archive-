/* ============================================
   F&F Retail Archive - State Management
   전역 상태 객체
   ============================================ */

// 데이터는 sheet-loader가 채워줌
let RETAIL_DATA = [];

// 잘못 분류된 제품 숨김 (세션 동안 유지)
const removed = new Set();

// 전역 상태
const state = {
  gender: "All",
  months: new Set(),
  countries: new Set(),       // 국가 필터 (GL/CN/KR)
  brandGroups: new Set(),
  brands: new Set(),
  categories: new Set(),
  subcategories: new Set(),
  fabrics: new Set(),

  // === 제품명 키워드 검색 / 저장 그룹 (keywords.js) ===
  kwGroups: [],               // [{id, label, include:[], exclude:[]}] · localStorage 영속
  kwActive: new Set(),        // 현재 켜져 있는 그룹 id (여러 개면 OR)
  kwQuery: "",                // 검색창에 입력 중인 임시 키워드
  kwEditing: null,            // 수정 중인 그룹 id

  // === 분석 화면 전용 필터 (사이드바와 독립) ===
  analyticsFilter: {
    months: new Set(),
    countries: new Set(),
    brandGroups: new Set(),
    brands: new Set(),
    // category는 도표 안 드롭다운(fabricCategoryView)으로 따로 처리
  },

  view: "gallery",
  page: 1,
  facetOpen: {
    Period: true,
    Country: true,
    BrandGroups: true,
    Brands: true,
    Categories: true,
    Subcategories: false,
    Fabric: false
  },
  brandGroupsOpen: new Set(),
  drillDown: null,
  fabricCategoryView: "all"
};
