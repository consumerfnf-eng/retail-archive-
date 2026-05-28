/* ============================================
   F&F Retail Archive - Analytics View
   색상 분석, 카테고리 비중, Fabric 히트맵 (with drill-down)
   ============================================ */

function countBy(data, key) {
  const m = {};
  data.forEach(d => {
    const v = d[key] || "—";
    m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m)
    .map(([name, count]) => ({name, count}))
    .sort((a,b) => b.count - a.count);
}

function colorAnalysis(data) {
  const acc = {};
  data.forEach(d => {
    if (d.hex_breakdown && d.hex_breakdown.length)
      d.hex_breakdown.forEach(h => acc[h.hex] = (acc[h.hex]||0) + h.pct);
    else if (d.hex_colors)
      d.hex_colors.forEach(h => acc[h] = (acc[h]||0) + 50);
  });
  const total = Object.values(acc).reduce((s,v) => s + v, 0) || 1;
  return Object.entries(acc)
    .map(([hex, w]) => ({hex, pct: w / total * 100}))
    .sort((a,b) => b.pct - a.pct);
}

function colorFamilyDist(data) {
  const acc = {};
  data.forEach(d => {
    const src = (d.hex_breakdown && d.hex_breakdown.length)
      ? d.hex_breakdown
      : (d.hex_colors || []).map(h => ({hex:h, pct:50}));
    src.forEach(h => {
      const f = colorFamily(h.hex);
      if (!acc[f.name]) acc[f.name] = {name: f.name, rep: f.rep, w: 0};
      acc[f.name].w += h.pct;
    });
  });
  const total = Object.values(acc).reduce((s,v) => s + v.w, 0) || 1;
  return Object.values(acc)
    .map(v => ({name: v.name, rep: v.rep, pct: v.w / total * 100}))
    .sort((a,b) => b.pct - a.pct);
}

/* SVG 도넛 차트 */
function donutChart(items) {
  if (!items.length) return '<div style="font-size:12px;color:var(--ink-soft)">데이터 없음</div>';
  const R = 78, r = 46, cx = 92, cy = 92;
  const C = 2 * Math.PI * ((R+r)/2);
  const sw = R - r;
  let off = 0, segs = "";
  items.forEach(it => {
    const len = C * it.pct / 100;
    segs += `<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none"
      stroke="${esc(it.rep)}" stroke-width="${sw}"
      stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}"
      transform="rotate(-90 ${cx} ${cy})"><title>${esc(it.name)} ${it.pct.toFixed(1)}%</title></circle>`;
    off += len;
  });
  const legend = items.map(it => `
    <div class="legrow">
      <span class="legdot" style="background:${esc(it.rep)}"></span>
      <span class="legname">${esc(it.name)}</span>
      <span class="legpct">${it.pct.toFixed(1)}%</span>
    </div>`).join("");
  return `<div class="donutwrap">
    <svg class="donut" viewBox="0 0 184 184" width="184" height="184">${segs}
      <text x="${cx}" y="${cy-4}" text-anchor="middle" class="donutc-n">${items.length}</text>
      <text x="${cx}" y="${cy+13}" text-anchor="middle" class="donutc-l">색계열</text>
    </svg>
    <div class="legend">${legend}</div>
  </div>`;
}

/* 백분율 막대 */
function pctBarChart(rows) {
  const total = rows.reduce((s,r) => s + r.count, 0);
  if (!rows.length) return '<div style="font-size:12px;color:var(--ink-soft)">데이터 없음</div>';
  const max = Math.max(...rows.map(r => r.count));
  return rows.map(r => {
    const pct = total ? (r.count / total * 100) : 0;
    const w = max ? (r.count / max * 100) : 0;
    return `<div class="barrow">
      <div class="bartop"><span class="bname">${esc(r.name)}</span>
      <span class="bval"><b>${pct.toFixed(1)}%</b> · ${r.count}</span></div>
      <div class="bartrack"><div class="barfill" style="width:${w}%"></div></div>
    </div>`;
  }).join("");
}

/* ============================================
   ★ Fabric 히트맵 (카테고리 × Fabric)
   ============================================ */

/* ============================================
   Fabric Bubble Matrix
   세로축: 대표 소재 (12개 분류)
   가로축: 각 대표소재로 분류된 실제 fabric 텍스트들의 버블 (크기=갯수)
   카테고리 드롭다운으로 필터링
   ============================================ */
function fabricBubbleMatrix(data) {
  // fabric 데이터 있는지 체크
  const hasFabric = data.some(d => d.fabricKey);

  // 카테고리 드롭다운 옵션 (전체 + 실제 사용된 카테고리들)
  const allCats = uniq(data.map(d => d.category || "—")).filter(c => c !== "—");
  const catOrder = ["outerwear","top","bottom","dress","shoe","shoes","bag","acc"];
  allCats.sort((a,b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // 선택된 카테고리로 필터링
  const selectedCat = state.fabricCategoryView || "all";
  const filteredData = selectedCat === "all"
    ? data
    : data.filter(d => d.category === selectedCat);

  // 카테고리별 카운트 (드롭다운 옵션에 표시용)
  const catCounts = {};
  data.forEach(d => {
    const c = d.category || "—";
    catCounts[c] = (catCounts[c] || 0) + 1;
  });

  // 드롭다운 옵션
  const dropdownOpts = [
    `<option value="all" ${selectedCat === "all" ? "selected" : ""}>전체 (${data.length}개)</option>`,
    ...allCats.map(c =>
      `<option value="${esc(c)}" ${selectedCat === c ? "selected" : ""}>${esc(c)} (${catCounts[c] || 0}개)</option>`
    )
  ].join("");

  // 각 대표소재(fabricKey)별로, 그 안에 어떤 실제 fabric 텍스트가 들어있는지 집계
  // matrix[fabricKey] = { 'fabricText1': count1, 'fabricText2': count2, ... }
  const matrix = {};
  filteredData.forEach(d => {
    if (!d.fabricKey) return;
    const fk = d.fabricKey;
    const fabText = (d.fabric || "").trim() || "(빈값)";
    if (!matrix[fk]) matrix[fk] = {};
    matrix[fk][fabText] = (matrix[fk][fabText] || 0) + 1;
  });

  // 대표소재: 항상 12개 모두 표시 (데이터 없는 것도 회색으로)
  const allFabrics = FABRIC_CATEGORIES;

  // 각 대표소재별 총 카운트 (없으면 0)
  const fabricTotals = {};
  allFabrics.forEach(f => {
    fabricTotals[f.key] = matrix[f.key]
      ? Object.values(matrix[f.key]).reduce((s, c) => s + c, 0)
      : 0;
  });

  // 최대 버블 크기 결정용 (전체 fabric 중 최대 카운트)
  let maxCount = 0;
  allFabrics.forEach(f => {
    if (!matrix[f.key]) return;
    Object.values(matrix[f.key]).forEach(c => {
      if (c > maxCount) maxCount = c;
    });
  });

  // 버블 크기 계산: sqrt 스케일 (면적 비례)
  const minR = 10, maxR = 36;
  const calcR = (count) => {
    if (maxCount === 0) return minR;
    const ratio = Math.sqrt(count / maxCount);
    return minR + (maxR - minR) * ratio;
  };

  // 전체 합계 (퍼센티지용)
  const grandTotal = Object.values(fabricTotals).reduce((s, c) => s + c, 0);

  // 행 렌더링 - 12개 모두 항상 표시
  const rows = allFabrics.map(f => {
    const total = fabricTotals[f.key];
    const isEmpty = total === 0;
    const sharePct = grandTotal > 0 ? (total / grandTotal * 100) : 0;

    let bodyContent;
    if (isEmpty) {
      bodyContent = `<div class="fab-row-empty">데이터 없음</div>`;
    } else {
      const items = Object.entries(matrix[f.key])
        .sort((a, b) => b[1] - a[1]);
      bodyContent = items.map(([fabText, count]) => {
        const r = calcR(count);
        const pct = (count / total * 100).toFixed(0);
        return `<div class="fab-bubble-item fab-clickable"
                     data-fabric-key="${esc(f.key)}"
                     data-fabric-text="${esc(fabText)}"
                     title="클릭: ${esc(fabText)} 제품 ${count}개 보기 (그룹내 ${pct}%)">
          <div class="fab-bubble" style="width:${r*2}px;height:${r*2}px;background:${f.color}">
            <span class="fab-bubble-n">${count}</span>
          </div>
          <div class="fab-bubble-label">${esc(fabText.length > 30 ? fabText.slice(0,30) + '…' : fabText)}</div>
        </div>`;
      }).join("");
    }

    const variantCount = isEmpty ? 0 : Object.keys(matrix[f.key]).length;
    const metaText = isEmpty
      ? `<span style="opacity:0.5">0개</span>`
      : `${total}개 · ${variantCount}종 · ${sharePct.toFixed(1)}%`;

    return `<div class="fab-row ${isEmpty ? 'is-empty' : ''}">
      <div class="fab-row-head ${!isEmpty ? 'fab-row-head-clickable' : ''}"
           ${!isEmpty ? `data-fabric-key="${esc(f.key)}"` : ''}
           ${!isEmpty ? `title="클릭: ${esc(f.label)} 전체 ${total}개 제품 보기"` : ''}>
        <div class="fab-row-color" style="background:${f.color};${isEmpty ? 'opacity:0.3' : ''}"></div>
        <div class="fab-row-info">
          <div class="fab-row-name" ${isEmpty ? 'style="opacity:0.5"' : ''}>${esc(f.label)}</div>
          <div class="fab-row-meta">${metaText}</div>
        </div>
      </div>
      <div class="fab-row-body">${bodyContent}</div>
    </div>`;
  }).join("");

  // 분류 안 된 제품 개수
  const unclassified = filteredData.filter(d => !d.fabricKey).length;
  const totalInScope = filteredData.length;
  const classifiedCount = totalInScope - unclassified;

  // 상단 요약 + 안내
  let statusHTML = '';
  if (!hasFabric) {
    statusHTML = `<div class="fabric-info" style="text-align:left;padding:14px 18px;margin-bottom:14px;background:#fff7f0;border:1px solid #f0d8c5;border-radius:6px">
      <div style="font-size:13px;color:var(--ink);margin-bottom:4px;font-weight:600">⚙ Fabric 데이터 입력 대기 중</div>
      <div style="line-height:1.6;font-size:11.5px">아직 시트에 fabric 데이터가 입력되지 않았습니다. 시트의 fabric/material 컬럼에 소재 정보를 입력하면 아래 표가 자동으로 채워집니다.</div>
    </div>`;
  } else if (classifiedCount === 0) {
    statusHTML = `<div class="fabric-info" style="margin-bottom:12px">선택한 카테고리에 분류된 fabric 데이터가 없습니다 (${totalInScope}개 중 0개 분류).</div>`;
  } else {
    statusHTML = `<div class="fabric-stats">
      <span><b>${classifiedCount}</b>개 분류됨</span>
      ${unclassified > 0 ? `<span style="color:var(--ink-soft)">· ${unclassified}개 미분류</span>` : ''}
      <span style="color:var(--ink-soft)">· 총 ${totalInScope}개</span>
    </div>`;
  }

  return `<div class="fab-controls">
    <label class="fab-dropdown-wrap">
      <span class="fab-dropdown-label">카테고리:</span>
      <select id="fabricCategorySelect" class="fab-dropdown">${dropdownOpts}</select>
    </label>
    <div class="fab-legend">
      <span style="color:var(--ink-soft);font-size:11px">버블 크기 = 해당 소재 표현의 제품 수</span>
    </div>
  </div>
  ${statusHTML}
  <div class="fab-matrix">${rows}</div>`;
}

/* ============================================
   메인 분석 화면
   ① Fabric Distribution (최상단, 도표만)
   ② Color & Category (접기 가능)
   ③ Detail Breakdown (접기 가능)
   ============================================ */
function renderAnalytics(data) {
  if (!data.length) {
    return `
      ${renderAnalyticsFilters()}
      <div class="empty" style="margin-top:20px">선택한 필터 조건에 맞는 데이터가 없습니다. 필터를 줄여보세요.</div>
    `;
  }

  return `
    ${renderAnalyticsFilters()}
    <div class="card full" style="margin:0">
      ${fabricBubbleMatrix(data)}
    </div>
  `;
}

/* ============================================
   분석 화면 자체 필터 UI
   시즌 / 국가 / 브랜드그룹 / 브랜드
   각각 다중선택 가능한 칩(chip) 형태
   ============================================ */
function renderAnalyticsFilters() {
  const scope = genderScope();  // 성별 필터까지만 적용
  const af = state.analyticsFilter;

  // 각 facet별 옵션 수집
  const months = uniq(scope.map(d => d.month)).filter(Boolean).sort();
  const countries = uniq(scope.map(d => d.country || "GL"))
    .sort((a, b) => COUNTRY_ORDER.indexOf(a) - COUNTRY_ORDER.indexOf(b));
  const brandGroups = uniq(scope.map(d => d.brandGroup)).filter(Boolean)
    .sort((a, b) => BRAND_GROUP_ORDER.indexOf(a) - BRAND_GROUP_ORDER.indexOf(b));

  // 브랜드: 선택된 브랜드그룹이 있으면 그 그룹 브랜드만, 없으면 전체
  const brandScope = af.brandGroups.size
    ? scope.filter(d => af.brandGroups.has(d.brandGroup))
    : scope;
  const brands = uniq(brandScope.map(d => d.brand)).filter(Boolean).sort();

  // 칩 그룹 렌더링
  const chipGroup = (title, items, set, fmt, kind) => {
    if (!items.length) return '';
    const chips = items.map(v => {
      const on = set.has(v);
      const label = fmt ? fmt(v) : v;
      return `<button class="af-chip ${on ? 'on' : ''}"
                      data-af-kind="${kind}" data-af-val="${esc(v)}">
        ${esc(label)}
      </button>`;
    }).join("");
    const selCount = set.size;
    return `<div class="af-row">
      <div class="af-label">${title}${selCount ? ` <span class="af-cnt">${selCount}</span>` : ''}</div>
      <div class="af-chips">${chips}</div>
    </div>`;
  };

  const hasAny = af.months.size || af.countries.size || af.brandGroups.size || af.brands.size;

  return `<div class="analytics-filters">
    <div class="af-head">
      <span class="af-title">분석 필터</span>
      ${hasAny ? '<button class="af-reset" id="afReset">전체 해제</button>' : ''}
    </div>
    ${chipGroup("Period · 시즌", months, af.months, monthLabel, "months")}
    ${chipGroup("Country · 국가", countries, af.countries, countryLabel, "countries")}
    ${chipGroup("Category · 카테고리", brandGroups, af.brandGroups, null, "brandGroups")}
    ${chipGroup("Brands", brands, af.brands, null, "brands")}
  </div>`;
}

/* 분석 화면 이벤트 바인딩 */
function bindAnalyticsEvents(data) {
  // === 분석 필터 칩 클릭 ===
  $$(".af-chip").forEach(chip => {
    chip.onclick = () => {
      const kind = chip.dataset.afKind;
      const val = chip.dataset.afVal;
      const set = state.analyticsFilter[kind];
      if (!set) return;
      if (set.has(val)) set.delete(val); else set.add(val);

      // 브랜드 그룹 변경 시: 그 그룹에 속하지 않는 브랜드는 해제
      if (kind === 'brandGroups' && state.analyticsFilter.brandGroups.size) {
        const validBrands = new Set();
        genderScope().forEach(d => {
          if (state.analyticsFilter.brandGroups.has(d.brandGroup)) {
            validBrands.add(d.brand);
          }
        });
        state.analyticsFilter.brands = new Set(
          [...state.analyticsFilter.brands].filter(b => validBrands.has(b))
        );
      }
      renderContent();
    };
  });

  // === 분석 필터 전체 해제 ===
  const afReset = $("#afReset");
  if (afReset) {
    afReset.onclick = () => {
      state.analyticsFilter.months.clear();
      state.analyticsFilter.countries.clear();
      state.analyticsFilter.brandGroups.clear();
      state.analyticsFilter.brands.clear();
      renderContent();
    };
  }

  // 카테고리 드롭다운 변경
  const sel = $("#fabricCategorySelect");
  if (sel) {
    sel.onchange = () => {
      state.fabricCategoryView = sel.value;
      renderContent();
    };
  }
  // 섹션 접기/펼치기
  $$(".anal-head[data-toggle]").forEach(h => {
    h.onclick = () => {
      const id = h.dataset.toggle;
      if (!state.analyticsOpen) state.analyticsOpen = { fabric: true, color: false, detail: false };
      state.analyticsOpen[id] = !state.analyticsOpen[id];
      renderContent();
    };
  });

  // === Fabric 버블 클릭 → 해당 fabric 제품 갤러리 모달 ===
  $$(".fab-bubble-item.fab-clickable").forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const fk = b.dataset.fabricKey;
      const ft = b.dataset.fabricText;
      openFabricGallery(data, fk, ft);
    };
  });

  // === Fabric 행 헤더 클릭 → 그 대표소재 전체 제품 갤러리 모달 ===
  $$(".fab-row-head-clickable").forEach(h => {
    h.onclick = (e) => {
      e.stopPropagation();
      const fk = h.dataset.fabricKey;
      openFabricGallery(data, fk, null);
    };
  });
}

/* ============================================
   Fabric 갤러리 모달
   특정 fabric의 제품들을 그리드로 표시
   - fabricKey만 주면 → 그 대표소재 전체 제품
   - fabricKey + fabricText 주면 → 그 정확한 fabric 텍스트의 제품만
   ============================================ */
function openFabricGallery(data, fabricKey, fabricText) {
  // 필터링
  let products;
  let titleText;
  if (fabricText) {
    products = data.filter(d =>
      d.fabricKey === fabricKey &&
      (d.fabric || '').trim() === fabricText
    );
    titleText = `${fabricLabel(fabricKey)} · "${fabricText}"`;
  } else {
    products = data.filter(d => d.fabricKey === fabricKey);
    titleText = `${fabricLabel(fabricKey)} · 전체`;
  }

  if (!products.length) {
    showToast("해당 제품이 없습니다");
    return;
  }

  // 분석 화면의 카테고리 필터도 반영
  const catFilter = state.fabricCategoryView || "all";
  if (catFilter !== "all") {
    products = products.filter(p => p.category === catFilter);
  }

  // 페이지네이션 (24개씩)
  const PAGE_SIZE = 24;
  let currentPage = 1;
  const totalPages = Math.ceil(products.length / PAGE_SIZE);

  // 페이지 렌더 함수
  function renderPage(page) {
    currentPage = page;
    const start = (page - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, products.length);
    const pageProducts = products.slice(start, end);

    const cards = pageProducts.map((d, i) => {
      const globalIdx = start + i;
      const hasImage = d.image_url && d.image_url.trim();
      const hexes = (d.hex_colors || []).slice(0, 6);
      const imgContent = hasImage
        ? `<div class="imgph">${PH_SVG}<span>${esc(d.product_name)}</span></div>
           <img src="${esc(proxyImage(d.image_url))}" alt="${esc(d.product_name)}" loading="lazy"
                referrerpolicy="no-referrer"
                onload="this.previousElementSibling.style.display='none'"
                onerror="this.style.display='none'">`
        : `<div class="color-card-wrap">
             ${hexes.length ? hexes.map(h => `<div class="color-card-block" style="background:${esc(h)}"></div>`).join("") : `<div class="color-card-empty">${esc(d.product_name)}</div>`}
           </div>`;

      return `<div class="pcard fab-gal-card" data-pi="${globalIdx}">
        <div class="imgbox ${hasImage ? '' : 'no-img'}">
          <span class="mtag">${monthLabel(d.month)}</span>
          ${d.country && d.country !== 'GL' ? `<span class="ctag">${esc(d.country)}</span>` : ''}
          ${imgContent}
        </div>
        <div class="pinfo">
          <div class="pbrand">${esc(d.brand)} · ${esc(d.gender)}</div>
          <div class="pname">${esc(d.product_name)}</div>
          <div class="pcat">${esc(d.category)}${d.fabric ? ' · ' + esc(d.fabric) : ''}</div>
          <div class="pcolors">${(d.hex_colors || []).slice(0,7).map(h =>
            `<span class="dot" style="background:${esc(h)}"></span>`).join("")}</div>
        </div>
      </div>`;
    }).join("");

    // 페이저 HTML (총 페이지 2개 이상일 때만)
    let pagerHTML = '';
    if (totalPages > 1) {
      const pagerBtns = [];
      // 처음/이전
      pagerBtns.push(`<button class="fab-pager-btn" data-fpg="1" ${page === 1 ? 'disabled' : ''}>«</button>`);
      pagerBtns.push(`<button class="fab-pager-btn" data-fpg="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`);

      // 페이지 번호 (현재 페이지 주변 5개)
      const startP = Math.max(1, page - 2);
      const endP = Math.min(totalPages, page + 2);
      if (startP > 1) pagerBtns.push(`<span class="fab-pager-ellipsis">…</span>`);
      for (let p = startP; p <= endP; p++) {
        pagerBtns.push(`<button class="fab-pager-btn ${p === page ? 'active' : ''}" data-fpg="${p}">${p}</button>`);
      }
      if (endP < totalPages) pagerBtns.push(`<span class="fab-pager-ellipsis">…</span>`);

      // 다음/끝
      pagerBtns.push(`<button class="fab-pager-btn" data-fpg="${page + 1}" ${page === totalPages ? 'disabled' : ''}>›</button>`);
      pagerBtns.push(`<button class="fab-pager-btn" data-fpg="${totalPages}" ${page === totalPages ? 'disabled' : ''}>»</button>`);

      pagerHTML = `<div class="fab-pager">
        <span class="fab-pager-info">${start + 1}-${end} / ${products.length}</span>
        <div class="fab-pager-btns">${pagerBtns.join("")}</div>
      </div>`;
    }

    $("#fabricModalbox").innerHTML = `
      <div class="fab-gal-head">
        <div>
          <div class="fab-gal-eyebrow">FABRIC GALLERY</div>
          <h2 class="fab-gal-title">${esc(titleText)}</h2>
          <div class="fab-gal-meta">총 ${products.length}개 제품 ${totalPages > 1 ? `· ${totalPages}페이지` : ''}</div>
        </div>
        <button class="fab-gal-close">&times;</button>
      </div>
      <div class="fab-gal-grid">${cards}</div>
      ${pagerHTML}
    `;

    // 닫기
    $("#fabricModalbox .fab-gal-close").onclick = () => {
      $("#fabricModal").classList.remove("open");
    };

    // 카드 클릭 → 제품 상세 모달
    $$(".fab-gal-card").forEach(c => c.onclick = () => {
      const idx = +c.dataset.pi;
      openModal(products[idx]);
    });

    // 페이저 버튼 클릭
    $$(".fab-pager-btn").forEach(b => b.onclick = () => {
      if (b.disabled) return;
      const newPage = +b.dataset.fpg;
      if (newPage >= 1 && newPage <= totalPages) {
        renderPage(newPage);
        // 그리드 맨 위로 스크롤
        const grid = $(".fab-gal-grid");
        if (grid) grid.scrollTo({top: 0, behavior: "smooth"});
      }
    });
  }

  // 첫 페이지 렌더 + 모달 열기
  renderPage(1);
  $("#fabricModal").classList.add("open");
}
