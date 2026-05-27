/* ============================================
   F&F Retail Archive - Main App
   초기화, 렌더링, 이벤트 바인딩
   ============================================ */

/* ---- 메인 렌더 ---- */
function renderContent() {
  const data = filtered();
  $("#content").innerHTML = state.view === "gallery"
    ? renderGallery(data)
    : renderAnalytics(data);

  if (state.view === "gallery") {
    // 카드 클릭 → 모달
    $$(".pcard").forEach(c => c.onclick = () => openModal(data[+c.dataset.idx]));
    // X 버튼 → 제거
    $$(".card-x").forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      removed.add(b.dataset.rm);
      render();
    });
    // 복원 전체
    const ra = $("#restoreAll");
    if (ra) ra.onclick = () => { removed.clear(); render(); };
    // 제거 목록 보기
    const vr = $("#viewRemoved");
    if (vr) vr.onclick = openRemovedModal;
    // 페이저
    $$(".pager button[data-pg]").forEach(b => b.onclick = () => {
      state.page = +b.dataset.pg;
      renderContent();
      $(".main").scrollTo({top:0, behavior:"smooth"});
    });
  } else {
    // 분석 화면 이벤트
    bindAnalyticsEvents(data);
  }
}

function render() {
  buildGenderTabs();
  buildFacets();
  buildCrumbs();
  renderContent();
  const data = filtered();
  $("#topStat").innerHTML = `<b>${data.length}</b> products · ` +
    `<b>${uniq(data.map(d => d.brand)).length}</b> brands · ` +
    `<b>${uniq(RETAIL_DATA.map(d => d.season || d.month)).length}</b> seasons`;
}

/* ---- 전역 이벤트 바인딩 ---- */
function bindGlobalEvents() {
  // 모달 외부 클릭 닫기
  $("#modal").onclick = e => {
    if (e.target.id === "modal") $("#modal").classList.remove("open");
  };
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") $("#modal").classList.remove("open");
  });

  // 뷰 토글
  $$(".viewtoggle button").forEach(b => b.onclick = () => {
    state.view = b.dataset.view;
    state.drillDown = null;  // 뷰 바꾸면 드릴다운 초기화
    $$(".viewtoggle button").forEach(x => x.classList.toggle("active", x === b));
    renderContent();
  });

  // 필터 초기화
  $("#resetBtn").onclick = () => {
    state.months.clear();
    state.brands.clear();
    state.categories.clear();
    state.subcategories.clear();
    state.fabrics.clear();
    state.page = 1;
    state.drillDown = null;
    render();
  };

  // CSV 다운로드
  $("#csvColorFiltered").onclick = () =>
    download(`color_raw_filtered_${stamp()}.csv`, colorRows(filtered()));
  $("#csvColorAll").onclick = () =>
    download(`color_raw_all_${stamp()}.csv`, colorRows(RETAIL_DATA.filter(d => !removed.has(d._id))));
  $("#csvProducts").onclick = () =>
    download(`products_${stamp()}.csv`, productRows(filtered()));
}

/* ---- 초기화 ---- */
async function init() {
  try {
    // 1. Google Sheets에서 데이터 로드
    RETAIL_DATA = await loadFromSheet();

    if (!RETAIL_DATA.length) {
      showLoaderError("시트에서 유효한 데이터를 찾을 수 없습니다. 시트 구조를 확인하세요.");
      return;
    }

    // 2. 전역 이벤트 바인딩
    bindGlobalEvents();

    // 3. 최초 렌더
    render();

    // 4. 로딩 화면 숨기기
    hideLoader();

    console.log(`[App] 초기화 완료: ${RETAIL_DATA.length}개 제품`);
  } catch (err) {
    showLoaderError(err.message || "알 수 없는 오류가 발생했습니다.");
    console.error("[App] 초기화 실패:", err);
  }
}

// DOM 준비되면 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
