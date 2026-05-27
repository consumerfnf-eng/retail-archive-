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
  brandGroups: new Set(),    // 카테고리 그룹 필터 (애슬레저/아웃도어/럭셔리)
  brands: new Set(),
  categories: new Set(),
  subcategories: new Set(),
  fabrics: new Set(),
  view: "gallery",
  page: 1,
  facetOpen: {
    Period: true,
    BrandGroups: true,        // 새 facet
    Brands: true,
    Categories: true,
    Subcategories: false,
    Fabric: false
  },
  brandGroupsOpen: new Set(),
  drillDown: null,
  fabricCategoryView: "all"  // 분석 화면 카테고리 드롭다운 (all, top, bottom, outerwear, ...)
};
