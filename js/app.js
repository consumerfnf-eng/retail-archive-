/* ============================================
   F&F Retail Archive - Main App
   초기화, 렌더링, 이벤트 바인딩
   ============================================ */

/* ---- 상단 view 컨트롤 (갤러리 모드 / 분석 모드) ---- */
function renderViewControls() {
  const vc = $("#viewControls");
  if (!vc) return;

  if (state.view === "analytics") {
    // 분석 화면: "← 갤러리로 돌아가기" 버튼
    vc.innerHTML = `<button class="back-to-gallery" id="backToGallery">
      ← 갤러리로 돌아가기
    </button>`;
    const btn = $("#backToGallery");
    if (btn) {
      btn.onclick = () => {
        state.view = "gallery";
        state.drillDown = null;
        render();
      };
    }
  } else {
    // 갤러리 화면: 토글 숨김 (Fabric 메뉴에서만 분석 진입)
    vc.innerHTML = '';
  }
}

/* ---- 메인 렌더 ---- */
function renderContent() {
  // 상단 view 컨트롤 갱신
  renderViewControls();

  // 갤러리: 사이드바 필터 (filtered)
  // 분석: 분석 화면 전용 필터 (analyticsFiltered) - 사이드바 무시
  const data = state.view === "analytics"
    ? analyticsFiltered()
    : filtered();

  $("#content").innerHTML = state.view === "gallery"
    ? renderGallery(data)
    : renderAnalytics(data);

  if (state.view === "gallery") {
    // 카드 클릭 → 모달
    $$(".pcard").forEach(c => c.onclick = () => openModal(data[+c.dataset.idx]));
     // China 제품캷 / 컴러 아카이브 탭 전환
     $$(".cn-tab").forEach(t => t.onclick = () => {
        state.cnTab = t.dataset.cntab === "color" ? "color" : "cut";
        state.page = 1;
        renderContent();
     });
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
  // Fabric 갤러리 모달 외부 클릭 닫기
  const fabModal = $("#fabricModal");
  if (fabModal) {
    fabModal.onclick = e => {
      if (e.target.id === "fabricModal") fabModal.classList.remove("open");
    };
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      $("#modal").classList.remove("open");
      if (fabModal) fabModal.classList.remove("open");
    }
  });

  // 뷰 토글은 renderViewControls()에서 동적으로 처리하므로
  // 여기서 별도 바인딩 불필요 (Fabric 메뉴 클릭으로 진입, 돌아가기 버튼으로 복귀)

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
  const colorAllWrap = $("#csvColorAllWrap");
   if (colorAllWrap) {
      const toggle = $("#csvColorAllBtn");
      if (toggle) toggle.onclick = (e) => { e.stopPropagation(); colorAllWrap.classList.toggle("open"); };
      document.addEventListener("click", () => colorAllWrap.classList.remove("open"));
      $$("#csvColorAllWrap .csv-dd-item").forEach(it => it.onclick = () => {
         const scope = it.dataset.scope || "all";
         const base = RETAIL_DATA.filter(d => !removed.has(d._id));
         const suffix = scope === "no-acc" ? "no_acc" : (scope === "acc-only" ? "acc_only" : "all");
         download(`color_raw_${suffix}_${stamp()}.csv`, colorRows(base, scope));
         colorAllWrap.classList.remove("open");
      });
   }
  $("#csvProducts").onclick = () =>
    download(`products_${stamp()}.csv`, productRows(filtered()));

  // Fabric CSV - 현재 분석 화면의 카테고리 필터 적용한 상세 분포
  const csvFabDetail = $("#csvFabricDetail");
  if (csvFabDetail) {
    csvFabDetail.onclick = () => {
      const cat = state.fabricCategoryView || "all";
      const catLabel = cat === "all" ? "all" : cat;
      download(
        `fabric_detail_${catLabel}_${stamp()}.csv`,
        fabricDetailRows(filtered(), cat)
      );
    };
  }
  // Fabric CSV - 카테고리 × 대표소재 피벗
  const csvFabMatrix = $("#csvFabricMatrix");
  if (csvFabMatrix) {
    csvFabMatrix.onclick = () => {
      download(`fabric_matrix_${stamp()}.csv`, fabricMatrixRows(filtered()));
    };
  }
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
