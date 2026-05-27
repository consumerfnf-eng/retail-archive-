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
  view: "gallery",
  page: 1,
  facetOpen: {
    Period: true,
    Country: true,            // 새 facet
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
